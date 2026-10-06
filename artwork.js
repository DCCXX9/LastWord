(() => {
  'use strict';
  const A = LastfmAdapter, R = LastfmRules, S = LastfmStore;
  let username = '', generation = 0, running = null, queued = false;
  let currentUrl = location.href;
  let observer, cacheReady = false;
  let cacheError = '', lastError = '', startedAt = 0;
  const cache = new Map();
  const jobs = new Map(), observed = new Map(), originals = new Map();
  const own = () => A.ownProfile(location.href, username) && !document.hidden;
  const imageAttrs = ['src', 'srcset', 'data-src', 'data-srcset', 'title', 'alt'];

  function remember(image) {
    if (!originals.has(image)) originals.set(image, {
      attrs: Object.fromEntries(imageAttrs.map(name => [name, image.getAttribute(name)])),
      link: image.closest('a[href]'), href: image.closest('a[href]')?.getAttribute('href')
    });
  }
  function apply(image, cover) {
    if (!image.isConnected || !own()) return;
    remember(image);
    const original = originals.get(image);
    const size = /\/i\/u\/(\d+(?:s|x\d+))\//.exec(original.attrs.src || original.attrs['data-src'] || '')?.[1];
    const source = size ? cover.image.replace(/\/i\/u\/[^/]+\//, '/i/u/' + size + '/') : cover.image;
    image.removeAttribute('srcset'); image.removeAttribute('data-srcset');
    image.src = source; image.setAttribute('data-src', source);
    image.alt = 'Cover for ' + cover.album + ' by ' + cover.artist;
    image.title = cover.fallback ? 'Personal cover: matching artist/title album page'
      : 'Personal cover: ' + cover.album + ' (your most-scrobbled album for this track)';
    const link = original.link;
    if (link?.isConnected) link.href = cover.url;
  }
  function reset() {
    generation++; running?.controller.abort();
    observer?.disconnect(); observed.clear(); jobs.clear();
    globalThis.LastfmArtworkSource?.clear();
    for (const [image, original] of originals) {
      for (const [name, value] of Object.entries(original.attrs)) {
        if (value === null) image.removeAttribute(name); else image.setAttribute(name, value);
      }
      if (original.link) original.link.setAttribute('href', original.href);
    }
    originals.clear();
  }
  function visible(job) {
    return [...job.images].some(image => image.isConnected && observed.get(image)?.visible);
  }
  async function pump() {
    if (running || !cacheReady || !own() || !globalThis.LastfmArtworkSource ||
        !globalThis.LastfmPages || LastfmPages.status().rateLimited) return;
    const waiting = [...jobs.values()].filter(job => job.state === 'waiting' && visible(job));
    // Album-less scrobbles need a title-album fallback. Give those visible rows
    // priority without changing the all-time album counting or request throttle.
    const job = waiting.find(job => job.albumless) || waiting[0];
    if (!job) return;
    const controller = new AbortController(), current = generation;
    running = { job, controller }; job.state = 'loading';
    startedAt = Date.now();
    for (const image of job.images) {
      remember(image); if (!job.cover) image.title = 'Finding your most-scrobbled album cover…';
    }
    try {
      const cover = await LastfmArtworkSource.resolve(job.item, username, controller.signal);
      if (current !== generation || controller.signal.aborted || !own()) return;
      job.cover = cover; job.state = 'complete';
      const key = JSON.stringify([R.normalize(username), R.normalize(job.item.artist), R.normalize(job.item.name)]);
      cache.set(key, { cover, checkedAt: Date.now() });
      for (const image of job.images) apply(image, cover);
      // Saving a disposable cache must never prevent the cover from being shown.
      S.saveArtwork(job.item, cover).catch(error => { cacheError = error.message; });
    } catch (error) {
      if (current !== generation) return;
      job.state = error.name === 'AbortError' ? 'waiting' : 'unavailable';
      if (error.name !== 'AbortError') lastError = error.message;
      if (error.name !== 'AbortError' && !job.cover) for (const image of job.images) {
        if (image.isConnected) image.title = 'Cover unchanged: ' + error.message;
      }
    } finally {
      if (running?.controller === controller) running = null;
      pump();
    }
  }
  function scan() {
    if (currentUrl !== location.href) { reset(); currentUrl = location.href; }
    if (!own() || !cacheReady) return;
    for (const [image] of originals) if (!image.isConnected) originals.delete(image);
    for (const [image, value] of observed) if (!image.isConnected) {
      observer.unobserve(image); observed.delete(image); value.job.images.delete(image);
    }
    for (const row of document.querySelectorAll('tr.chartlist-row')) {
      const image = row.querySelector('.chartlist-image img');
      if (!image || observed.has(image)) continue;
      const item = [...row.querySelectorAll('.chartlist-name a[href]')].map(link => A.musicItem(link)).find(value => value?.type === 'tracks');
      if (!item) continue;
      const key = JSON.stringify([R.normalize(username), R.normalize(item.artist), R.normalize(item.name)]);
      if (!jobs.has(key)) {
        const saved = cache.get(key);
        const fresh = saved && Date.now() - saved.checkedAt < 24 * 60 * 60 * 1000;
        jobs.set(key, { item, images: new Set(), cover: saved?.cover, state: fresh ? 'complete' : 'waiting', albumless: false });
      }
      const job = jobs.get(key); job.images.add(image);
      const form = row.querySelector('form[data-edit-scrobble]');
      if (form && !String(form.querySelector('[name="album_name"]')?.value || '').trim() &&
          !String(form.querySelector('[name="album_artist_name"]')?.value || '').trim()) job.albumless = true;
      observed.set(image, { job, visible: false }); observer.observe(image);
      if (job.cover) apply(image, job.cover);
    }
    pump();
  }
  function schedule() {
    if (queued) return;
    queued = true; queueMicrotask(() => { queued = false; scan(); });
  }
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const value = observed.get(entry.target);
      if (value) value.visible = entry.isIntersecting;
    }
    if (running && !visible(running.job)) running.controller.abort();
    pump();
  }, { rootMargin: '100px 0px' });
  const mutations = new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1))) schedule();
  });
  mutations.observe(document, { childList: true, subtree: true });
  const accept = async state => {
    const changed = username !== state.settings.username;
    if (changed || !A.ownProfile(location.href, state.settings.username)) reset();
    username = state.settings.username;
    if (changed || !cacheReady) {
      cacheReady = false; cache.clear();
      const current = generation;
      if (A.ownProfile(location.href, username)) {
        try {
          const records = await S.readArtwork();
          if (current !== generation) return;
          for (const record of records) cache.set(record.key, record);
        } catch (error) { cacheError = error.message; }
      }
      if (current !== generation) return;
      cacheReady = true;
    }
    scan();
  };
  S.subscribe(accept);
  S.read().then(accept).catch(error => console.error('Last.fm personal covers:', error.message));
  addEventListener('visibilitychange', () => { if (document.hidden) running?.controller.abort(); else scan(); });
  addEventListener('pagehide', () => { reset(); mutations.disconnect(); });
  addEventListener('pageshow', event => { if (event.persisted) { mutations.observe(document, { childList: true, subtree: true }); scan(); } });
  addEventListener('popstate', scan);
  globalThis.LastfmArtwork = Object.freeze({ start: pump, status: () => ({
    cacheReady, cachedTracks: cache.size, cacheError: cacheError || null,
    visibleImages: [...observed.values()].filter(value => value.visible).length,
    jobs: Object.fromEntries(['waiting', 'loading', 'complete', 'unavailable'].map(state =>
      [state, [...jobs.values()].filter(job => job.state === state).length])),
    activeMilliseconds: running ? Math.max(0, Date.now() - startedAt) : 0,
    lastError: lastError || null
  }) });
})();
