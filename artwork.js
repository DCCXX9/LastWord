(() => {
  'use strict';
  if (globalThis.LastfmArtwork) return;
  const A = LastfmAdapter, R = LastfmRules, S = LastfmStore;
  let username = '', generation = 0, running = null, queued = false;
  let currentUrl = location.href;
  let observer, cacheReady = false;
  let cacheError = '', lastError = '', startedAt = 0;
  const cache = new Map();
  const jobs = new Map(), observed = new Map(), originals = new Map();
  const own = () => A.ownProfile(location.href, username) && !document.hidden;
  const keyFor = item => JSON.stringify([R.normalize(username), R.normalize(item.artist), R.normalize(item.name),
    ...(item.albumless ? ['albumless'] : [])]);
  const imageAttrs = ['src', 'srcset', 'data-src', 'data-srcset', 'title', 'alt'];

  function remember(image) {
    if (!originals.has(image)) originals.set(image, {
      attrs: Object.fromEntries(imageAttrs.map(name => [name, image.getAttribute(name)])),
      link: image.closest('a[href]'), href: image.closest('a[href]')?.getAttribute('href'),
      wrapper: image.parentElement?.matches('span.cover-art') ? image.parentElement : null,
      replacement: null, visibility: image.style.getPropertyValue('visibility'),
      visibilityPriority: image.style.getPropertyPriority('visibility')
    });
  }
  function apply(image, cover) {
    if (!image.isConnected || !own()) return;
    if (!A.coverImage(cover.image)) return;
    remember(image);
    const original = originals.get(image);
    const size = /\/i\/u\/(\d+(?:s|x\d+))\//.exec(original.attrs.src || original.attrs['data-src'] || '')?.[1];
    const source = size ? cover.image.replace(/\/i\/u\/[^/]+\//, '/i/u/' + size + '/') : cover.image;
    image.removeAttribute('srcset'); image.removeAttribute('data-srcset');
    const attr = (name, value) => { if (image.getAttribute(name) !== value) image.setAttribute(name, value); };
    attr('src', source); attr('data-src', source);
    // A previous extension context or native lazy loader may have hidden it.
    // A verified resolved cover must be visible; restore() still keeps native styles.
    if (image.style.visibility !== 'visible') image.style.setProperty('visibility', 'visible');
    attr('alt', 'Cover for ' + cover.album + ' by ' + cover.artist);
    attr('title', cover.fallback ? 'Personal cover: matching artist/title album page'
      : 'Personal cover: ' + cover.album + ' (your most-scrobbled album for this track)');
    if (!original.link && original.wrapper?.isConnected) {
      const link = document.createElement('a');
      for (const attr of original.wrapper.attributes) link.setAttribute(attr.name, attr.value);
      link.append(...original.wrapper.childNodes);
      original.wrapper.replaceWith(link); original.replacement = link;
    }
    const link = original.link || original.replacement;
    if (link?.isConnected && link.href !== cover.url) link.href = cover.url;
  }
  function restore(image) {
    const original = originals.get(image);
    if (!original) return;
    for (const [name, value] of Object.entries(original.attrs)) {
      if (value === null) image.removeAttribute(name); else image.setAttribute(name, value);
    }
    if (original.link) original.link.setAttribute('href', original.href);
    if (original.replacement?.isConnected) {
      original.wrapper.append(...original.replacement.childNodes);
      original.replacement.replaceWith(original.wrapper);
    }
    if (original.visibility) image.style.setProperty('visibility', original.visibility, original.visibilityPriority);
    else image.style.removeProperty('visibility');
    originals.delete(image);
  }
  function reset() {
    generation++; running?.controller.abort();
    observer?.disconnect(); observed.clear(); jobs.clear();
    globalThis.LastfmArtworkSource?.clear();
    for (const image of originals.keys()) restore(image);
  }
  function visible(job) {
    return [...job.images].some(image => image.isConnected && observed.get(image)?.visible);
  }
  function finish(job, cover) {
    if (job.state === 'complete' && job.cover?.image === cover.image && job.cover?.url === cover.url &&
        job.cover?.total === cover.total && job.cover?.sourceVersion === cover.sourceVersion) return;
    job.cover = cover; job.state = 'complete';
    cache.set(keyFor(job.item), { cover, checkedAt: Date.now() });
    for (const image of job.images) apply(image, cover);
    S.saveArtwork(job.item, cover).catch(error => { cacheError = error.message; });
  }
  async function pump() {
    if (!cacheReady || !own() || !globalThis.LastfmArtworkSource ||
        !globalThis.LastfmPages || LastfmPages.status().rateLimited) return;
    const waiting = [...jobs.values()].filter(job => job.state === 'waiting' && visible(job));
    if (running) {
      if (!running.job.albumless && waiting.some(job => job.albumless)) running.controller.abort();
      return;
    }
    // Album-less scrobbles need a title-album fallback. Give those visible rows
    // priority without changing the all-time album counting or request throttle.
    const job = waiting.find(job => job.albumless) || waiting.find(job => job.placeholder) || waiting[0];
    if (!job) return;
    const controller = new AbortController(), current = generation;
    running = { job, controller }; job.state = 'loading';
    startedAt = Date.now();
    for (const image of job.images) {
      remember(image); if (!job.cover) image.title = job.albumless
        ? 'Finding the matching single cover…' : 'Finding your most-scrobbled album cover…';
    }
    try {
      const cover = await (job.albumless ? LastfmArtworkSource.forBlankScrobble : LastfmArtworkSource.resolve)(
        { ...job.item, placeholder: job.placeholder }, username, controller.signal);
      if (current !== generation || controller.signal.aborted || !own()) return;
      finish(job, cover);
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
    if (!own()) return;
    for (const row of document.querySelectorAll('tr.chartlist-row')) {
      if (![...row.querySelectorAll('.chartlist-name a[href]')].some(link => A.musicItem(link)?.type === 'tracks')) continue;
      const image = row.querySelector('.chartlist-image img');
      if (!image) continue;
      if (!A.coverImage(image.getAttribute('data-src') || image.getAttribute('src'))) {
        remember(image); image.style.setProperty('visibility', 'hidden');
      }
    }
    if (!cacheReady) return;
    for (const [image] of originals) if (!image.isConnected) originals.delete(image);
    for (const [image, value] of observed) if (!image.isConnected) {
      observer.unobserve(image); observed.delete(image); value.job.images.delete(image);
    }
    for (const row of document.querySelectorAll('tr.chartlist-row')) {
      const image = row.querySelector('.chartlist-image img');
      if (!image) continue;
      let item = [...row.querySelectorAll('.chartlist-name a[href]')].map(link => A.musicItem(link)).find(value => value?.type === 'tracks');
      if (!item) continue;
      const form = row.querySelector('form[data-edit-scrobble]');
      const fields = form && A.editRow(form, location.href, username, true);
      // At document_start the image/link can arrive before the native form.
      // Do not enqueue an unclassified scrobble or bypass its album-less cache.
      if (A.libraryView(location.href) === 'scrobbles' && !fields) continue;
      const albumless = fields && !fields.album.trim() && !fields.albumArtist.trim() &&
        R.normalize(fields.artist) === R.normalize(item.artist) && R.normalize(fields.track) === R.normalize(item.name);
      if (albumless) item = { ...item, albumless: true };
      const key = keyFor(item);
      const previous = observed.get(image);
      if (previous && previous.job === jobs.get(key)) continue;
      if (previous) {
        previous.job.images.delete(image); observer.unobserve(image); observed.delete(image);
        if (running?.job === previous.job && !visible(previous.job)) running.controller.abort();
        restore(image);
      }
      if (!jobs.has(key)) {
        const saved = cache.get(key);
        // Existing images remain visible while older selection results are
        // verified once against album totals/native scrobble metadata.
        const fresh = saved && Date.now() - saved.checkedAt < 24 * 60 * 60 * 1000 &&
          (item.albumless || saved.cover.sourceVersion === 3);
        jobs.set(key, { item, images: new Set(), cover: saved?.cover, state: fresh ? 'complete' : 'waiting', albumless: !!albumless,
          placeholder: !A.coverImage(image.getAttribute('data-src') || image.getAttribute('src')) });
      }
      const job = jobs.get(key); job.images.add(image);
      observed.set(image, { job, visible: false }); observer.observe(image);
      if (job.cover) apply(image, job.cover);
    }
    const candidates = [...jobs.values()].filter(job => !job.albumless && job.state !== 'loading');
    const known = candidates.length && globalThis.LastfmArtworkAlbums?.peekMany(candidates.map(job => job.item), username);
    for (const job of candidates) {
      const cover = known?.get(job.item);
      if (cover) finish(job, cover);
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
  const mutationOptions = { childList: true, subtree: true, attributes: true,
    attributeFilter: ['src', 'data-src', 'srcset', 'data-srcset', 'href', 'style'] };
  const mutations = new MutationObserver(records => {
    // Last.fm's lazy loader can rewrite a cached image after document_start.
    // Repair only affected resolved images; do not rescan the table per attribute.
    if (own() && currentUrl === location.href) for (const record of records) {
      if (record.type !== 'attributes') continue;
      const image = record.target.matches('img') ? record.target : record.target.querySelector('img');
      const job = observed.get(image)?.job;
      if (job?.cover) apply(image, job.cover);
    }
    if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1))) schedule();
  });
  mutations.observe(document, mutationOptions);
  const accept = async state => {
    const changed = username !== state.settings.username;
    if (changed || !A.ownProfile(location.href, state.settings.username)) reset();
    username = state.settings.username;
    if (changed || !cacheReady) {
      cacheReady = false; cache.clear();
      scan();
      const current = generation;
      if (A.ownProfile(location.href, username)) {
        try {
          const records = await S.readArtwork();
          if (current !== generation) return;
          for (const record of records) if (A.coverImage(record.cover.image)) cache.set(record.key, record);
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
  addEventListener('pageshow', event => { if (event.persisted) { mutations.observe(document, mutationOptions); scan(); } });
  addEventListener('popstate', scan);
  globalThis.LastfmArtwork = Object.freeze({ start: scan, status: () => ({
    cacheReady, cachedTracks: cache.size, cacheError: cacheError || null,
    visibleImages: [...observed.values()].filter(value => value.visible).length,
    jobs: Object.fromEntries(['waiting', 'loading', 'complete', 'unavailable'].map(state =>
      [state, [...jobs.values()].filter(job => job.state === state).length])),
    activeMilliseconds: running ? Math.max(0, Date.now() - startedAt) : 0,
    lastError: lastError || null
  }) });
})();
