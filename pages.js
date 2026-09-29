(() => {
  'use strict';
  const PAUSE = 'lfmNetworkPause';
  const LAST = 'lfmLastPageRequest';
  const warning = /you[’']?re requesting (?:too many|a lot of) pages/i;
  let paused = false;
  let lastError = '';
  let queue = Promise.resolve();
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

  async function request(url, signal) {
    check(signal);
    const target = new URL(url, location.href);
    const { settings } = await LastfmStore.read();
    if (target.origin !== location.origin ||
        !LastfmAdapter.ownProfile(target.href, settings.username)) {
      throw new Error('Page loading is available only on your configured profile.');
    }
    const state = await chrome.storage.local.get([PAUSE, LAST]);
    paused = Boolean(state[PAUSE]);
    if (paused) throw new Error('Last.fm asked for a break. Page loading is paused.');
    await wait(Math.min(1500, Math.max(0, 1500 - (Date.now() - (state[LAST] || 0)))), signal);
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    check(signal);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
    try {
      const response = await fetch(target.href, {
        credentials: 'same-origin', signal: controller.signal
      });
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      if (response.status === 429 || warning.test(doc.body?.textContent || '')) {
        paused = true;
        await chrome.storage.local.set({ [PAUSE]: { at: Date.now() } });
        throw new Error('Last.fm asked for a break. Page loading is paused in all tabs.');
      }
      if (!response.ok) throw new Error(`Last.fm returned HTTP ${response.status}. Loading stopped.`);
      if (!LastfmAdapter.ownProfile(response.url, settings.username)) {
        throw new Error('Last.fm redirected away from your library. Check your sign-in.');
      }
      check(signal);
      lastError = '';
      return { doc, url: response.url };
    } catch (error) {
      if (timedOut) error = new Error('Last.fm took too long to respond. Loading stopped.');
      if (error.name !== 'AbortError') lastError = error.message;
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      await chrome.storage.local.set({ [LAST]: Date.now() });
    }
  }

  function get(url, { signal } = {}) {
    const run = () => navigator.locks.request('lastfm-personal-library:pages',
      { ...(signal ? { signal } : {}) }, () => request(url, signal));
    const result = queue.then(run);
    queue = result.catch(() => {});
    return result;
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
  globalThis.LastfmPages = Object.freeze({ get, resume,
    status: () => ({ rateLimited: paused, lastError }) });
})();
