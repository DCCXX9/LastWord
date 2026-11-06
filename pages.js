(() => {
  'use strict';
  const PAUSE = 'lfmNetworkPause';
  const LAST = 'lfmLastPageRequest';
  const WINDOW = 'lfmRequestWindow';
  const warning = /you[’']?re requesting (?:too many|a lot of) pages/i;
  // A Last.fm warning is a cooldown, not a permanent latch. Repeated warnings
  // within STRIKE_WINDOW double the cooldown; an explicit resume ends it early.
  const BASE_COOLDOWN = 2 * 60 * 1000, MAX_COOLDOWN = 30 * 60 * 1000, STRIKE_WINDOW = 6 * 60 * 60 * 1000;
  // The 1.5s gap alone allows ~25 requests/minute indefinitely, which is what
  // tripped the warning during long cold browsing. Background reads (artwork,
  // discovery) also share a rolling ten-minute budget, halved for six hours
  // after a warning so the extension does not walk straight back into it.
  // User navigation is exempt from the budget (never from a pause).
  const BUDGET_WINDOW = 10 * 60 * 1000, BUDGET = 120, STRUCK_BUDGET = 60;
  let pause = null;
  let lastError = '';
  const queue = [];
  let draining = false, wake = null, resumeTimer;
  const listeners = new Set();
  const pauseUntil = value => !value ? 0 : Number.isFinite(value.until) ? value.until : (Number(value.at) || 0) + BASE_COOLDOWN;
  const active = (value, now = Date.now()) => Boolean(value) && now < pauseUntil(value);
  const struck = (value, now = Date.now()) => Boolean(value) && now - (Number(value.at) || 0) < STRIKE_WINDOW;
  const pausedError = value => {
    const until = new Date(pauseUntil(value));
    const error = new Error('Last.fm asked for a break. Requests are paused until ' +
      until.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ', then resume automatically.');
    error.rateLimited = true;
    return error;
  };
  function notify() { for (const listener of listeners) { try { listener(); } catch (error) { console.error(error); } } }
  function track(value) {
    const was = active(pause);
    pause = value || null;
    clearTimeout(resumeTimer);
    // Wake every consumer when the cooldown ends, so nothing waits for a reload.
    if (active(pause)) resumeTimer = setTimeout(() => { notify(); void drain(); }, pauseUntil(pause) - Date.now() + 50);
    if (was !== active(pause)) notify();
  }
  async function stop() {
    const now = Date.now(), previous = (await chrome.storage.local.get(PAUSE))[PAUSE];
    const strikes = struck(previous, now) ? Math.min(8, (Number(previous.strikes) || 1) + 1) : 1;
    const value = { at: now, until: now + Math.min(MAX_COOLDOWN, BASE_COOLDOWN * 2 ** (strikes - 1)), strikes };
    track(value);
    await chrome.storage.local.set({ [PAUSE]: value });
    return value;
  }
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
    // This transport is permanently read-only, including callers retained from
    // older experimental builds. Native Last.fm controls belong to the site.
    if (form) throw new Error('This extension is read-only. Scrobble submissions are forbidden.');
    const target = new URL(globalThis.LastfmRedirects
      ? LastfmRedirects.protect(url, settings, location.href) : url, location.href);
    const artworkPage = settings.username && (LastfmAdapter.ownProfile(location.href, settings.username) ||
      LastfmAdapter.publicArtistPage(location.href));
    const allowed = value => album
      ? artworkPage &&
        new URL(value).origin === location.origin && new URL(value).pathname.startsWith('/music/') &&
        LastfmAdapter.musicItem(value)?.type === (album === 'track' ? 'tracks' : 'albums')
      : (settings.infiniteScroll && LastfmAdapter.scrollView(location.href) &&
          new URL(value).origin === location.origin &&
          (new URL(value).pathname === location.pathname ||
            globalThis.LastfmRedirects?.samePagePath(location.href, value))) ||
        (LastfmAdapter.ownProfile(value, settings.username) &&
          /\/library(?:\/?$|\/(?:scrobbles|artists|albums|tracks)\/?$|\/music\/)/.test(new URL(value).pathname));
    if (target.origin !== location.origin || !allowed(target.href)) {
      throw new Error('Page loading is available only in a supported Last.fm view.');
    }
    const state = await chrome.storage.local.get([PAUSE, LAST, WINDOW]);
    if (state[PAUSE] !== pause) track(state[PAUSE]);
    if (active(state[PAUSE])) throw pausedError(state[PAUSE]);
    const interval = Math.min(60000, Math.max(1500, Number(minInterval) || 1500));
    await wait(Math.min(interval, Math.max(0, interval - (Date.now() - (state[LAST] || 0)))), signal);
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
        method: 'GET'
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
        throw pausedError(await stop());
      }
      if (!response.ok) {
        const error = new Error(`Last.fm returned HTTP ${response.status}. Loading stopped.`);
        // Consumers may recover a temporary read failure. Never retry writes,
        // rate warnings, redirects or unverified metadata as a transport error.
        error.retryable = response.status >= 500 && response.status <= 600;
        throw error;
      }
      if (!allowed(response.url)) {
        throw new Error('Last.fm redirected away from your library. Check your sign-in.');
      }
      const directUrl = target.href.replace('/music/+noredirect/', '/music/');
      if (globalThis.LastfmRedirects &&
          LastfmRedirects.protect(directUrl, settings, location.href) !== directUrl) {
        const requested = LastfmAdapter.musicItem(target.href), received = LastfmAdapter.musicItem(response.url);
        const same = (a, b) => String(a || '').normalize('NFC').toLowerCase() === String(b || '').normalize('NFC').toLowerCase();
        if (!received || !same(requested?.artist, received.artist))
          throw new Error('Last.fm returned a different artist. Redirect protection stopped loading.');
        if (requested.type !== received.type || !same(requested.name, received.name))
          throw new Error('Last.fm returned a different song or album. Redirect protection stopped loading.');
      }
      check(signal);
      lastError = '';
      return { doc, url: response.url };
    } catch (error) {
      if (signal?.aborted) error = abortError();
      else if (timedOut) {
        error = new Error('Last.fm took too long to respond. Loading stopped.');
        error.retryable = true;
      } else if (!received && error.name === 'TypeError') error.retryable = true;
      if (error.name !== 'AbortError') lastError = error.message;
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      const now = Date.now();
      // Runs inside the cross-tab lock, so the shared window stays consistent.
      const recent = (Array.isArray(state[WINDOW]) ? state[WINDOW] : []).filter(t => now - t < BUDGET_WINDOW && t <= now);
      await chrome.storage.local.set({ [LAST]: now, [WINDOW]: [...recent, now].slice(-BUDGET - 10) });
    }
  }
  async function budgetDelay() {
    const state = await chrome.storage.local.get([PAUSE, WINDOW]), now = Date.now();
    const recent = (Array.isArray(state[WINDOW]) ? state[WINDOW] : []).filter(t => now - t < BUDGET_WINDOW && t <= now).sort((a, b) => a - b);
    const limit = struck(state[PAUSE], now) ? STRUCK_BUDGET : BUDGET;
    return recent.length < limit ? 0 : recent[recent.length - limit] + BUDGET_WINDOW - now + 25;
  }

  async function drain() {
    if (draining) return;
    draining = true;
    try {
      while (queue.length) {
        // Finish the active request, then prefer a user's next page over
        // background metadata. The shared lock and request spacing still apply.
        const first = queue.findIndex(entry => entry.options.priority === 'navigation');
        if (first < 0 && !queue[0].options.form) {
          // Over budget: wait outside the lock, so navigation in this or another
          // tab is never stuck behind background reads. A new entry wakes us.
          const delay = await budgetDelay();
          if (delay > 0 && !active(pause)) {
            await new Promise(resolve => { const t = setTimeout(resolve, delay); wake = () => { clearTimeout(t); resolve(); }; });
            wake = null;
            continue;
          }
        }
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
    if (options.form) return Promise.reject(new Error('This extension is read-only. Scrobble submissions are forbidden.'));
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
      queue.push(entry); wake?.(); void drain();
    });
  }

  async function resume() {
    // Explicit user choice: end the cooldown now, but keep the strike count so a
    // repeated warning still earns a longer break.
    const previous = (await chrome.storage.local.get(PAUSE))[PAUSE];
    const value = previous ? { ...previous, until: Date.now() } : null;
    if (value) await chrome.storage.local.set({ [PAUSE]: value });
    track(value);
    lastError = '';
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[PAUSE]) track(changes[PAUSE].newValue);
  });
  chrome.storage.local.get(PAUSE).then(data => { if (pause === null) track(data[PAUSE]); });
  // A warning already visible on the loaded page must also stop automatic fetches.
  if (warning.test(document.body?.textContent || '')) void stop();
  globalThis.LastfmPages = Object.freeze({ get, getAlbum: (url, options) => get(url, options, true), resume,
    getTrack: (url, options) => get(url, options, 'track'),
    edit: () => Promise.reject(new Error('This extension is read-only. Scrobble submissions are forbidden.')),
    // Fires when the pause starts or ends (including automatic expiry).
    onChange: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    status: () => ({ rateLimited: active(pause), pausedUntil: active(pause) ? pauseUntil(pause) : null, lastError }) });
})();
