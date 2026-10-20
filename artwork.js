(() => {
  'use strict';
  if (globalThis.LastfmArtwork) return;
  const A = LastfmAdapter, R = LastfmRules, S = LastfmStore;
  let username = '', generation = 0, running = null, queued = false;
  let currentUrl = location.href;
  let observer, cacheReady = false;
  let cacheError = '', lastError = '', startedAt = 0;
  let retryTimer;
  let seededGeneration = -1;
  const cache = new Map();
  const jobs = new Map(), observed = new Map(), originals = new Map();
  const albumImages = new Map();
  const prepared = new Set(), dirtyRows = new Set();
  let fullScan = false;
  const inScope = user => Boolean(user && (A.ownProfile(location.href, user) || A.publicArtistPage(location.href)));
  const own = () => inScope(username) && !document.hidden;
  const keyFor = item => JSON.stringify([R.normalize(username), R.normalize(item.artist), R.normalize(item.name),
    ...(item.albumless ? ['albumless'] : [])]);
  const imageAttrs = ['src', 'srcset', 'data-src', 'data-srcset', 'title', 'alt', 'loading'];

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
    if ((!image.isConnected && !prepared.has(image)) || !own()) return;
    if (!A.coverImage(cover.image)) return;
    remember(image);
    const original = originals.get(image);
    const size = /\/i\/u\/(\d+(?:s|x\d+))\//.exec(original.attrs.src || original.attrs['data-src'] || '')?.[1];
    const sized = size ? cover.image.replace(/\/i\/u\/[^/]+\//, '/i/u/' + size + '/') : cover.image;
    const source = globalThis.LastfmImageRecovery?.sourceFor(image, sized) || sized;
    if (prepared.has(image)) image.loading = 'eager';
    image.removeAttribute('srcset'); image.removeAttribute('data-srcset');
    const attr = (name, value) => { if (image.getAttribute(name) !== value) image.setAttribute(name, value); };
    attr('src', source); attr('data-src', source);
    // A previous extension context or native lazy loader may have hidden it.
    // A verified resolved cover must be visible; restore() still keeps native styles.
    if (image.style.visibility !== 'visible') image.style.setProperty('visibility', 'visible');
    attr('alt', 'Cover for ' + cover.album + ' by ' + cover.artist);
    attr('title', cover.public ? 'Album associated with this exact track on Last.fm: ' + cover.album
      : cover.context ? 'Personal cover: ' + cover.album + ' (this album view)'
      : cover.fallback ? 'Personal cover: matching artist/title album page'
      : 'Personal cover: ' + cover.album + ' (your most-scrobbled album for this track)');
    if (!original.link && original.wrapper && (original.wrapper.isConnected || prepared.has(image))) {
      const link = document.createElement('a');
      for (const attr of original.wrapper.attributes) link.setAttribute(attr.name, attr.value);
      link.append(...original.wrapper.childNodes);
      original.wrapper.replaceWith(link); original.replacement = link;
    }
    const link = original.link || original.replacement;
    if (link && (link.isConnected || prepared.has(image)) && link.href !== cover.url) link.href = cover.url;
  }
  function hold(image) {
    remember(image);
    if (image.style.visibility !== 'hidden') image.style.setProperty('visibility', 'hidden');
    const original = originals.get(image), link = original.link || original.replacement;
    if (link?.hasAttribute('href')) link.removeAttribute('href');
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
    clearTimeout(retryTimer);
    generation++; running?.controller.abort();
    observer?.disconnect(); observed.clear(); jobs.clear(); albumImages.clear(); prepared.clear(); dirtyRows.clear();
    globalThis.LastfmArtworkSource?.clear();
    for (const image of originals.keys()) restore(image);
  }
  function visible(job) {
    return job.preparing || [...job.images].some(image => image.isConnected && observed.get(image)?.visible);
  }
  function onScreen(job) {
    return [...job.images].some(image => {
      if (!image.isConnected || !observed.get(image)?.visible) return false;
      const bounds = image.getBoundingClientRect();
      return bounds.bottom > 0 && bounds.top < innerHeight;
    });
  }
  function finish(job, cover) {
    if (job.state === 'complete' && job.cover?.image === cover.image && job.cover?.url === cover.url &&
        job.cover?.total === cover.total && job.cover?.sourceVersion === cover.sourceVersion) return;
    job.cover = cover; job.state = 'complete';
    for (const settle of job.settlers || []) settle();
    globalThis.LastfmArtworkAlbums?.remember?.(job.item, cover, username);
    if (!cover.public) cache.set(keyFor(job.item), { item: job.item, cover, checkedAt: Date.now() });
    for (const image of job.images) apply(image, cover);
    if (!cover.public) S.saveArtwork(job.item, cover).catch(error => { cacheError = error.message; });
  }
  async function pump() {
    clearTimeout(retryTimer);
    if (!cacheReady || !own() || !globalThis.LastfmArtworkSource ||
        !globalThis.LastfmPages || LastfmPages.status().rateLimited) return;
    const visibleWaiting = [...jobs.values()].filter(job => job.state === 'waiting' && visible(job));
    const now = Date.now(), waiting = visibleWaiting.filter(job => !job.retryAt || job.retryAt <= now);
    if (running) {
      if (!running.job.albumless && waiting.some(job => job.albumless &&
          (onScreen(job) || !onScreen(running.job)))) running.controller.abort();
      return;
    }
    // Album-less scrobbles need a title-album fallback. Give those visible rows
    // priority without changing the all-time album counting or request throttle.
    const foreground = waiting.filter(onScreen);
    const candidates = foreground.length ? foreground : waiting;
    const job = candidates.find(job => job.albumless) || candidates.find(job => job.placeholder) || candidates[0];
    if (!job) {
      const next = Math.min(...visibleWaiting.map(job => job.retryAt));
      if (Number.isFinite(next)) retryTimer = setTimeout(pump, Math.max(1, next - now));
      return;
    }
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
      const retry = error.retryable && !job.retried && !LastfmPages.status().rateLimited;
      job.state = error.name === 'AbortError' || retry ? 'waiting' : 'unavailable';
      if (retry) { job.retried = true; job.retryAt = Date.now() + 10000; }
      if (error.name !== 'AbortError') lastError = error.message;
      if (error.name !== 'AbortError' && !job.cover) for (const image of job.images) {
        if (image.isConnected || prepared.has(image)) image.title = retry ? 'Waiting to retry this cover…' : 'Cover unavailable: ' + error.message;
      }
      if (job.state === 'unavailable') for (const settle of job.settlers || []) settle();
    } finally {
      if (running?.controller === controller) running = null;
      pump();
    }
  }
  function albumContext() {
    // Album-view rows belong to this album even when another release wins the
    // track's all-time totals. Do not save these view-specific covers as winners.
    if (!/^\/user\/[^/]+\/library\/music\/(?:\+noredirect\/)?[^/]+\/[^/]+\/?$/.test(location.pathname)) return null;
    const item = A.musicItem(location.href);
    if (item?.type !== 'albums') return null;
    const root = document.querySelector('.col-main'), header = root?.querySelector('.library-header');
    const link = [...(header?.querySelectorAll('a[href]') || [])].find(link => {
      const album = A.musicItem(link);
      return album?.type === 'albums' && new URL(link.href).pathname.startsWith('/music/') &&
        R.normalize(album.artist) === R.normalize(item.artist) && R.normalize(album.name) === R.normalize(item.name);
    });
    const primary = header?.querySelector('.library-header-image img');
    const image = A.coverImage(primary?.getAttribute('data-src')) || A.coverImage(primary?.getAttribute('src'));
    // Keep the album scope while its header is still arriving. A general track
    // cache or queued history lookup must not replace the selected album.
    return { root, cover: link && image ? { artist: item.artist, album: item.name, image, url: link.href, context: true } : null };
  }
  function scan(incoming = null) {
    if (currentUrl !== location.href) { reset(); currentUrl = location.href; }
    if (!own()) return;
    const album = albumContext();
    for (const [image] of albumImages) if (!image.isConnected || !album?.cover || !album.root?.contains(image)) {
      albumImages.delete(image); restore(image);
    }
    const rows = incoming instanceof Set || Array.isArray(incoming) ? [...incoming] : [...document.querySelectorAll('tr.chartlist-row')];
    for (const row of rows) {
      if (![...row.querySelectorAll('.chartlist-name a[href]')].some(link => A.musicItem(link)?.type === 'tracks')) continue;
      const image = row.querySelector('.chartlist-image img');
      if (!image) continue;
      if (album) {
        if (album.cover && album.root?.contains(row)) {
          albumImages.set(image, album.cover); apply(image, album.cover);
        }
        continue;
      }
      if (!observed.get(image)?.job.cover) hold(image);
    }
    if (album || !cacheReady) return;
    const albums = globalThis.LastfmArtworkAlbums;
    if (albums && seededGeneration !== generation) {
      for (const saved of cache.values()) if (saved.item && !saved.item.albumless) {
        if (Date.now() - saved.checkedAt < 24 * 60 * 60 * 1000 && saved.cover.sourceVersion === 3) {
          albums.remember(saved.item, saved.cover, username);
        } else albums.hint(saved.item, saved.cover, username);
      }
      seededGeneration = generation;
    }
    for (const [image] of originals) if (!image.isConnected && !prepared.has(image)) originals.delete(image);
    for (const [image, value] of observed) if (!image.isConnected && !prepared.has(image)) {
      observer.unobserve(image); observed.delete(image); value.job.images.delete(image);
    }
    const touched = new Set();
    for (const row of rows) {
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
      const total = row.querySelector('[data-stat-value]')?.getAttribute('data-stat-value');
      if (/^\d+$/.test(total || '') && Number.isSafeInteger(Number(total))) item = {...item,libraryTotal:Number(total)};
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
        // Only current verified winners may be displayed before a new lookup.
        const fresh = saved && Date.now() - saved.checkedAt < 24 * 60 * 60 * 1000 &&
          (item.albumless || saved.cover.sourceVersion === 3);
        jobs.set(key, { item, images: new Set(), cover: fresh ? saved.cover : null, state: fresh ? 'complete' : 'waiting', albumless: !!albumless,
          placeholder: !A.coverImage(image.getAttribute('data-src') || image.getAttribute('src')) });
      }
      const job = jobs.get(key); job.images.add(image);
      touched.add(job);
      observed.set(image, { job, visible: false }); observer.observe(image);
      if (job.cover) apply(image, job.cover);
    }
    const candidates = [...jobs.values()].filter(job => !job.albumless && ['waiting','unavailable'].includes(job.state) &&
      (!incoming || touched.has(job)));
    const known = candidates.length && globalThis.LastfmArtworkAlbums?.peekMany(candidates.map(job => job.item), username);
    for (const job of candidates) {
      const cover = known?.get(job.item);
      if (cover) finish(job, cover);
    }
    pump();
  }
  function schedule(rows) {
    if (!rows) fullScan = true;
    else for (const row of rows) dirtyRows.add(row);
    if (queued) return;
    queued = true; queueMicrotask(() => {
      queued = false; const selected = fullScan ? null : new Set(dirtyRows);
      fullScan = false; dirtyRows.clear(); scan(selected);
    });
  }
  async function prepareRows(rows, {signal} = {}) {
    await ready;
    if (!own() || signal?.aborted) return;
    const current = generation, images = rows.map(row => row.querySelector('.chartlist-image img')).filter(Boolean);
    for (const image of images) prepared.add(image);
    let timer, abort;
    const waiting = new Set(), settlers = [];
    try {
      scan(rows);
      // Cached winners apply while detached. Give the first viewport of cold
      // rows a bounded head start; never hold a 50-row page for minutes.
      for (const image of images.slice(0, 10)) {
        const job = observed.get(image)?.job;
        if (job?.state === 'waiting' || job?.state === 'loading') waiting.add(job);
      }
      if (!waiting.size) return;
      const completed = [...waiting].map(job => new Promise(resolve => {
        job.preparing = true; (job.settlers ||= new Set()).add(resolve); settlers.push([job,resolve]);
      }));
      pump();
      await Promise.race([Promise.all(completed), new Promise(resolve => {
        timer = setTimeout(resolve, 4000); abort = resolve;
        signal?.addEventListener('abort', abort, {once:true});
      })]);
      if (current !== generation || signal?.aborted) throw new DOMException('Artwork preparation cancelled.', 'AbortError');
    } finally {
      clearTimeout(timer); if (abort) signal?.removeEventListener('abort',abort);
      for (const [job,settle] of settlers) { job.preparing = false; job.settlers.delete(settle); }
      for (const image of images) {
        prepared.delete(image);
        if ((signal?.aborted || current !== generation) && !image.isConnected) {
          const job = observed.get(image)?.job;
          observer.unobserve(image); observed.delete(image); job?.images.delete(image); restore(image);
          if (job && !job.images.size) {
            if (running?.job === job) running.controller.abort();
            else jobs.delete(keyFor(job.item));
          }
        }
      }
    }
  }
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const value = observed.get(entry.target);
      if (value) value.visible = entry.isIntersecting;
    }
    if (running && !visible(running.job)) running.controller.abort();
    pump();
    // Warm only already-loaded rows just below the viewport. On-screen work
    // stays first in pump(); the shared request queue retains its pacing.
  }, { rootMargin: '100px 0px 1200px 0px' });
  const mutationOptions = { childList: true, subtree: true, attributes: true,
    attributeFilter: ['src', 'data-src', 'srcset', 'data-srcset', 'href', 'style'] };
  const mutations = new MutationObserver(records => {
    // Last.fm's lazy loader can rewrite a cached image after document_start.
    // Repair only affected resolved images; do not rescan the table per attribute.
    if (own() && currentUrl === location.href) for (const record of records) {
      if (record.type !== 'attributes') continue;
      const image = record.target.matches('img') ? record.target : record.target.querySelector('img');
      const cover = albumImages.get(image) || observed.get(image)?.job.cover;
      if (cover) apply(image, cover);
      else if (originals.has(image)) hold(image);
    }
    const rows = new Set();
    for (const record of records) {
      if (record.target.closest?.('.library-header')) { schedule(); continue; }
      for (const node of record.addedNodes) if (node.nodeType === 1) {
        if (node.matches('.library-header') || node.querySelector('.library-header')) schedule();
        const row = node.closest('tr.chartlist-row');
        if (row) rows.add(row);
        for (const child of node.querySelectorAll('tr.chartlist-row')) rows.add(child);
      }
    }
    if (rows.size) schedule(rows);
  });
  mutations.observe(document, mutationOptions);
  const accept = async state => {
    const changed = username !== state.settings.username;
    if (changed || !inScope(state.settings.username)) reset();
    username = state.settings.username;
    if (changed || !cacheReady) {
      cacheReady = false; cache.clear();
      scan();
      const current = generation;
      if (inScope(username)) {
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
  const ready = S.read().then(accept).catch(error => console.error('Last.fm personal covers:', error.message));
  addEventListener('visibilitychange', () => {
    if (document.hidden) { clearTimeout(retryTimer); running?.controller.abort(); } else scan();
  });
  addEventListener('pagehide', () => { reset(); mutations.disconnect(); });
  addEventListener('pageshow', event => { if (event.persisted) { mutations.observe(document, mutationOptions); scan(); } });
  addEventListener('popstate', scan);
  globalThis.LastfmArtwork = Object.freeze({ start: () => scan(), prepareRows, status: () => ({
    cacheReady, cachedTracks: cache.size, cacheError: cacheError || null,
    visibleImages: [...observed.values()].filter(value => value.visible).length,
    jobs: Object.fromEntries(['waiting', 'loading', 'complete', 'unavailable'].map(state =>
      [state, [...jobs.values()].filter(job => job.state === state).length])),
    activeMilliseconds: running ? Math.max(0, Date.now() - startedAt) : 0,
    lastError: lastError || null
  }) });
})();
