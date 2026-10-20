(() => {
  'use strict';
  const PAUSE = 'lfmNetworkPause';
  const LAST = 'lfmLastPageRequest';
  const warning = /you[’']?re requesting (?:too many|a lot of) pages/i;
  let paused = false;
  let lastError = '';
  const queue = [];
  let draining = false;
  const abortError = () => new DOMException('Loading cancelled.', 'AbortError');
  const check = signal => { if (signal?.aborted) throw abortError(); };

  function wait(ms, signal) {
    return new Promise((resolve, reject) => {
      check(signal);
      const finish = () => { signal?.removeEventListener('abort', abort); resolve(); };
      const timer = setTimeout(finish, ms);
      const abort = () => { clearTimeout(timer); reject(abortError()); };
      signal?.addEventListener('abort', abort, { once: true });
    });
  }

  async function request(url, signal, album, { minInterval = 1500, form, beforeSend } = {}) {
    check(signal);
    const { settings } = await LastfmStore.read();
    const edit = Boolean(form);
    const target = new URL(!edit && globalThis.LastfmRedirects
      ? LastfmRedirects.protect(url, settings, location.href) : url, location.href);
    const editPath = value => new URL(value).origin === location.origin &&
      /^\/user\/[^/]+\/library\/edit-track$/.test(new URL(value).pathname) &&
      LastfmAdapter.ownProfile(value, settings.username);
    const artworkPage = settings.username && (LastfmAdapter.ownProfile(location.href, settings.username) ||
      LastfmAdapter.publicArtistPage(location.href));
    const allowed = value => edit ? editPath(value) : album
      ? artworkPage &&
        new URL(value).origin === location.origin && new URL(value).pathname.startsWith('/music/') &&
        LastfmAdapter.musicItem(value)?.type === (album === 'track' ? 'tracks' : 'albums')
      : LastfmAdapter.ownProfile(value, settings.username);
    if (target.origin !== location.origin || !allowed(target.href)) {
      throw new Error('Page loading is available only on your configured profile.');
    }
    let body;
    if (edit) {
      if (!LastfmAdapter.ownProfile(location.href, settings.username) || form.method !== 'post') {
        throw new Error('Open your connected profile before editing a scrobble.');
      }
      body = new URLSearchParams(new FormData(form));
      if (body.getAll('csrfmiddlewaretoken').length !== 1 || !body.get('csrfmiddlewaretoken')) {
        throw new Error('Last.fm’s edit security field is unavailable. Open its normal edit dialog.');
      }
      const submit = form.querySelector('[name="submit"]');
      if (submit && !body.has('submit')) body.set('submit', submit.value || submit.textContent.trim());
    }
    const state = await chrome.storage.local.get([PAUSE, LAST]);
    paused = Boolean(state[PAUSE]);
    if (paused) throw new Error('Last.fm asked for a break. Page loading is paused.');
    const interval = Math.min(60000, Math.max(1500, Number(minInterval) || 1500));
    await wait(Math.min(interval, Math.max(0, interval - (Date.now() - (state[LAST] || 0)))), signal);
    if (edit) {
      const latest = await LastfmStore.read();
      if (latest.settings.username !== settings.username || !LastfmAdapter.ownProfile(location.href, settings.username)) {
        throw new Error('Your connected profile changed. The edit was cancelled.');
      }
    }
    await beforeSend?.();
    check(signal);
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    check(signal);
    let timedOut = false, received = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
    try {
      const response = await fetch(target.href, {
        credentials: 'same-origin', signal: controller.signal,
        ...(edit ? {method:'POST',body,headers:{'X-Requested-With':'XMLHttpRequest'}} : {})
      });
      const html = await response.text();
      received = true;
      let markup = html;
      if (response.status !== 429 && response.headers.get('content-type')?.includes('application/json')) {
        try {
          const data = JSON.parse(html);
          markup = [data.html, data.content, data.form].find(value => typeof value === 'string') || '';
          const hasErrors = value => value && (typeof value !== 'object' || Object.keys(value).length > 0);
          if (hasErrors(data.error) || hasErrors(data.errors)) throw new Error('Last.fm rejected the edit.');
        } catch (error) { throw new Error(error.message || 'Last.fm returned an unreadable edit response.'); }
      }
      const doc = new DOMParser().parseFromString(markup, 'text/html');
      if (response.status === 429 || warning.test(doc.body?.textContent || '')) {
        paused = true;
        await chrome.storage.local.set({ [PAUSE]: { at: Date.now() } });
        throw new Error('Last.fm asked for a break. Page loading is paused in all tabs.');
      }
      if (!response.ok) {
        const error = new Error(`Last.fm returned HTTP ${response.status}. Loading stopped.`);
        // Consumers may recover a temporary read failure. Never retry writes,
        // rate warnings, redirects or unverified metadata as a transport error.
        error.retryable = !edit && response.status >= 500 && response.status <= 600;
        throw error;
      }
      if (!allowed(response.url)) {
        throw new Error('Last.fm redirected away from your library. Check your sign-in.');
      }
      const directUrl = target.href.replace('/music/+noredirect/', '/music/');
      if (!edit && globalThis.LastfmRedirects &&
          LastfmRedirects.protect(directUrl, settings, location.href) !== directUrl &&
          LastfmAdapter.musicItem(target.href)?.artist.toLowerCase() !==
            LastfmAdapter.musicItem(response.url)?.artist.toLowerCase()) {
        throw new Error('Last.fm returned a different artist. Redirect protection stopped loading.');
      }
      check(signal);
      lastError = '';
      return { doc, url: response.url };
    } catch (error) {
      if (signal?.aborted) error = abortError();
      else if (timedOut) {
        error = new Error('Last.fm took too long to respond. Loading stopped.');
        error.retryable = !edit;
      } else if (!received && error.name === 'TypeError') error.retryable = !edit;
      if (error.name !== 'AbortError') lastError = error.message;
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      await chrome.storage.local.set({ [LAST]: Date.now() });
    }
  }

  async function drain() {
    if (draining) return;
    draining = true;
    try {
      while (queue.length) {
        // Finish the active request, then prefer a user's next page over
        // background metadata. The shared lock and request spacing still apply.
        const first = queue.findIndex(entry => entry.options.priority === 'navigation');
        const entry = queue.splice(first < 0 ? 0 : first, 1)[0];
        const {url, options, album, resolve, reject, abort} = entry, {signal} = options;
        signal?.removeEventListener('abort', abort);
        try {
          resolve(await navigator.locks.request('lastfm-personal-library:pages',
            { ...(signal ? {signal} : {}) }, () => request(url, signal, album, options)));
        } catch (error) { reject(error); }
      }
    } finally { draining = false; }
  }
  function get(url, options = {}, album = false) {
    return new Promise((resolve, reject) => {
      const {signal} = options;
      if (signal?.aborted) { reject(abortError()); return; }
      const entry = {url, options, album, resolve, reject};
      entry.abort = () => {
        const index = queue.indexOf(entry);
        if (index >= 0) queue.splice(index, 1);
        reject(abortError());
      };
      signal?.addEventListener('abort', entry.abort, {once:true});
      queue.push(entry); void drain();
    });
  }

  async function resume() {
    await chrome.storage.local.remove(PAUSE);
    paused = false;
    lastError = '';
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[PAUSE]) paused = Boolean(changes[PAUSE].newValue);
  });
  chrome.storage.local.get(PAUSE).then(data => { paused = Boolean(data[PAUSE]); });
  // A warning already visible on the loaded page must also stop automatic fetches.
  if (warning.test(document.body?.textContent || '')) {
    paused = true;
    chrome.storage.local.set({ [PAUSE]: { at: Date.now() } });
  }
  globalThis.LastfmPages = Object.freeze({ get, getAlbum: (url, options) => get(url, options, true), resume,
    getTrack: (url, options) => get(url, options, 'track'),
    edit: (form, options = {}) => get(form.action, { ...options, form }),
    status: () => ({ rateLimited: paused, lastError }) });
})();
