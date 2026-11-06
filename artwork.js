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
  // How long a cold ranked row may stay blank while its proof is in flight.
  // After this, or as soon as proof is blocked (rate pause/failure), Last.fm's
  // own image is shown, marked unverified, until the personal winner replaces it.
  const GRACE = 1500;
  const STALE_LIMIT = 30 * 24 * 60 * 60 * 1000, FRESH = 24 * 60 * 60 * 1000;
  const heldAt = new Map(), released = new Set();
  let sweepTimer, unsubscribe;
  // Zero-request mode (default since v0.9.15): show Last.fm's own image, and
  // replace it only with a cover the extension already knows — a saved
  // personal winner, the exact album of a scrobble row, or the album page
  // being viewed. No Last.fm pages are fetched for artwork. Setting the local
  // key lfmArtworkLookups to true re-enables the older background lookups.
  const LOOKUPS = 'lfmArtworkLookups';
  let lookups = false, refreshing = false;
  const lookupsRead = chrome.storage.local.get(LOOKUPS).then(data => { lookups = data[LOOKUPS] === true; })
    .catch(() => { lookups = false; });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[LOOKUPS]) return;
    lookups = changes[LOOKUPS].newValue === true;
    scan();
  });
  const blocked = () => Boolean(globalThis.LastfmPages?.status().rateLimited);
  const cache = new Map();
  const jobs = new Map(), observed = new Map(), originals = new Map();
  const albumImages = new Map(), scrobbleImages = new Map();
  const prepared = new Set(), dirtyRows = new Set();
  let fullScan = false;
  const inScope = user => Boolean(user && (A.ownProfile(location.href, user) || A.publicArtistPage(location.href)));
  const own = () => !refreshing && inScope(username) && !document.hidden;
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
  function reveal(image) {
    const original = originals.get(image);
    // Release only our temporary hold. Stylesheet visibility belongs to the
    // page/theme; an inline `visible` would override its choice.
    if (original?.heldVisibility && image.style.visibility === 'hidden' &&
        image.style.getPropertyPriority('visibility') === '') {
      if (original.visibility) image.style.setProperty('visibility', original.visibility, original.visibilityPriority);
      else image.style.removeProperty('visibility');
    }
    if (original) original.heldVisibility = false;
    // Native lazy placeholders have an inline hold before we see them.
    if (image.style.visibility === 'hidden' && !image.style.getPropertyPriority('visibility')) {
      image.style.setProperty('visibility', 'visible');
      if (original) original.revealedVisibility = true;
    }
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
    heldAt.delete(image); released.delete(image);
    if (image.hasAttribute('data-lfm-artwork')) image.removeAttribute('data-lfm-artwork');
    image.removeAttribute('srcset'); image.removeAttribute('data-srcset');
    const attr = (name, value) => { if (image.getAttribute(name) !== value) image.setAttribute(name, value); };
    attr('src', source); attr('data-src', source);
    reveal(image);
    attr('alt', 'Cover for ' + cover.album + ' by ' + cover.artist);
    attr('title', cover.scrobble ? 'Scrobbled album: ' + cover.album + ' (checking your most-used album)'
      : cover.public ? 'Album associated with this exact track on Last.fm: ' + cover.album
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
    // A redirect-protected URL still selects this exact album. Preserve it so
    // the two observers cannot alternate hrefs indefinitely.
    if (link && (link.isConnected || prepared.has(image)) && link.href !== cover.url &&
        !globalThis.LastfmRedirects?.samePagePath(link.href, cover.url)) link.href = cover.url;
  }
  function hold(image) {
    remember(image);
    const original = originals.get(image);
    if (image.style.visibility !== 'hidden' && !image.style.getPropertyPriority('visibility')) {
      image.style.setProperty('visibility', 'hidden');
      original.heldVisibility = true;
    }
    const link = original.link || original.replacement;
    if (link?.hasAttribute('href')) link.removeAttribute('href');
  }
  // Native Last.fm cover and its own album link, shown while the personal proof
  // is unavailable. Never used when the row's own scrobble fields contradict it.
  function showNative(image) {
    remember(image);
    const original = originals.get(image);
    heldAt.delete(image); released.add(image);
    reveal(image);
    if (original.link && original.href !== null && original.link.getAttribute('href') !== original.href &&
        !globalThis.LastfmRedirects?.samePagePath(original.link.href, new URL(original.href, location.href).href)) {
      original.link.setAttribute('href', original.href);
    }
    if (!lookups) {
      // Plain Last.fm display: nothing is pending, so nothing is marked.
      if (image.hasAttribute('data-lfm-artwork')) image.removeAttribute('data-lfm-artwork');
      const title = original.attrs.title;
      if (title === null ? image.hasAttribute('title') : image.getAttribute('title') !== title) {
        if (title === null) image.removeAttribute('title'); else image.setAttribute('title', title);
      }
      return;
    }
    if (image.getAttribute('data-lfm-artwork') !== 'unverified') image.setAttribute('data-lfm-artwork', 'unverified');
    const title = blocked() ? 'Last.fm’s image. Your most-scrobbled album will be checked when Last.fm’s break ends.'
      : 'Last.fm’s image. Checking your most-scrobbled album…';
    if (image.title !== title) image.title = title;
  }
  function pending(image) {
    if (released.has(image)) { showNative(image); return; }
    hold(image);
    // Without lookups every row falls back to Last.fm's display; with them,
    // only rows whose native cover is not contradicted by their own fields.
    if (lookups && !originals.get(image).releasable) return;
    if (!heldAt.has(image)) heldAt.set(image, performance.now());
    armSweep(0);
  }
  function armSweep(delay) {
    if (sweepTimer !== undefined) return;
    sweepTimer = setTimeout(sweep, Math.max(0, delay));
  }
  function sweep() {
    sweepTimer = undefined;
    // Hold only until saved covers are loaded (milliseconds), so a known
    // winner never flashes Last.fm's image first.
    if (!cacheReady) return;
    const now = performance.now(), stop = blocked() || !lookups;
    let next = Infinity;
    for (const [image, at] of heldAt) {
      if (!image.isConnected && !prepared.has(image)) { heldAt.delete(image); continue; }
      const job = observed.get(image)?.job;
      if (job?.cover) { heldAt.delete(image); continue; }
      if (stop || job?.state === 'unavailable' || now - at >= GRACE) showNative(image);
      else next = Math.min(next, at + GRACE);
    }
    if (Number.isFinite(next)) armSweep(next - now);
  }
  function restore(image) {
    scrobbleImages.delete(image);
    heldAt.delete(image); released.delete(image);
    image.removeAttribute('data-lfm-artwork');
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
    if (!image.style.getPropertyPriority('visibility') &&
        (original.heldVisibility && image.style.visibility === 'hidden' ||
         original.revealedVisibility && image.style.visibility === 'visible')) {
      if (original.visibility) image.style.setProperty('visibility', original.visibility, original.visibilityPriority);
      else image.style.removeProperty('visibility');
    }
    originals.delete(image);
  }
  function reset() {
    clearTimeout(retryTimer); clearTimeout(sweepTimer); sweepTimer = undefined;
    generation++; running?.controller.abort();
    observer?.disconnect(); observed.clear(); jobs.clear(); albumImages.clear(); scrobbleImages.clear(); prepared.clear(); dirtyRows.clear();
    globalThis.LastfmArtworkSource?.clear();
    for (const image of originals.keys()) restore(image);
    heldAt.clear(); released.clear();
  }
  function visible(job) {
    return [...job.images].some(image => image.isConnected && observed.get(image)?.visible);
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
    globalThis.LastfmArtworkAlbums?.remember?.(job.item, cover, username);
    if (!cover.public) cache.set(keyFor(job.item), { item: job.item, cover, checkedAt: Date.now() });
    for (const image of job.images) apply(image, cover);
    if (!cover.public) S.saveArtwork(job.item, cover).catch(error => { cacheError = error.message; });
  }
  async function pump() {
    clearTimeout(retryTimer);
    if (!unsubscribe && globalThis.LastfmPages?.onChange) {
      // Resume queued rows the moment a cooldown ends, in every tab.
      unsubscribe = LastfmPages.onChange(() => { sweep(); pump(); });
    }
    if (!lookups || !cacheReady || !own() || !globalThis.LastfmArtworkSource ||
        !globalThis.LastfmPages) return;
    if (blocked()) { sweep(); return; }
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
    const cold = foreground.filter(job => !job.cover);
    // Rows with no cover at all come first; stale-cache refreshes come last.
    const candidates = cold.length ? cold : foreground.length ? foreground :
      waiting.filter(job => !job.cover).length ? waiting.filter(job => !job.cover) : waiting;
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
      // A rate pause says nothing about this track. Keep it queued (not failed)
      // so it resumes automatically when the cooldown ends.
      const paused = error.rateLimited || blocked();
      const retry = !paused && error.retryable && !job.retried;
      job.state = error.name === 'AbortError' || retry || paused ? 'waiting' : 'unavailable';
      if (retry) { job.retried = true; job.retryAt = Date.now() + 10000; }
      if (error.name !== 'AbortError') lastError = error.message;
      if (error.name !== 'AbortError' && !job.cover) for (const image of job.images) {
        if (released.has(image)) continue;
        if (image.isConnected || prepared.has(image)) image.title = paused ? error.message : retry ? 'Waiting to retry this cover…' : 'Cover unavailable: ' + error.message;
      }
      if (!job.cover) sweep();
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
  function scrobbleCover(image, item, fields) {
    if (!fields?.album.trim() || R.normalize(fields.artist) !== R.normalize(item.artist) ||
        R.normalize(fields.track) !== R.normalize(item.name)) return null;
    const artist = fields.albumArtist.trim() || fields.artist.trim(), album = fields.album.trim();
    const known = globalThis.LastfmArtworkAlbums?.coverForAlbum?.(artist, album, username);
    if (known) return { ...known, scrobble: true };
    const original = originals.get(image), href = original ? original.href : image.closest('a[href]')?.getAttribute('href');
    const linked = href && A.musicItem(href), attrs = original?.attrs;
    const source = A.coverImage(attrs ? attrs['data-src'] || attrs.src : image.getAttribute('data-src') || image.getAttribute('src'));
    const alt = attrs ? attrs.alt : image.getAttribute('alt');
    // The native image is usable only when both its album link and its label
    // agree with this user's actual scrobble tags. Never trust a compilation.
    if (linked?.type !== 'albums' || R.normalize(linked.artist) !== R.normalize(artist) ||
        R.normalize(linked.name) !== R.normalize(album) || R.normalize(alt) !== R.normalize(album) || !source) return null;
    return { artist, album, image: source, url: new URL(href, location.href).href, scrobble: true };
  }
  // Only a real native cover on a row without its own scrobble fields may be
  // shown provisionally. Scrobble fields that disagree prove it is wrong.
  function mark(image, fields) {
    remember(image);
    const original = originals.get(image);
    original.releasable = !fields && Boolean(A.coverImage(original.attrs['data-src']) || A.coverImage(original.attrs.src));
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
      const item = [...row.querySelectorAll('.chartlist-name a[href]')].map(link => A.musicItem(link)).find(item => item?.type === 'tracks');
      if (!item) continue;
      const image = row.querySelector('.chartlist-image img');
      if (!image) continue;
      if (album) {
        if (album.cover && album.root?.contains(row)) {
          albumImages.set(image, album.cover); apply(image, album.cover);
        }
        continue;
      }
      if (!cacheReady) {
        const form = row.querySelector('form[data-edit-scrobble]');
        const fields = form && A.artworkFields(form, location.href, username);
        if (A.libraryView(location.href) === 'scrobbles' && !fields) continue;
        const cover = scrobbleCover(image, item, fields);
        if (cover) { scrobbleImages.set(image, cover); apply(image, cover); }
        else { mark(image, fields); pending(image); }
      }
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
    for (const [image] of originals) if (!image.isConnected && !prepared.has(image)) {
      originals.delete(image); scrobbleImages.delete(image);
    }
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
      const fields = form && A.artworkFields(form, location.href, username);
      // At document_start the image/link can arrive before the native form.
      // Do not enqueue an unclassified scrobble or bypass its album-less cache.
      if (A.libraryView(location.href) === 'scrobbles' && !fields) continue;
      const albumless = fields && !fields.album.trim() && !fields.albumArtist.trim() &&
        R.normalize(fields.artist) === R.normalize(item.artist) && R.normalize(fields.track) === R.normalize(item.name);
      if (albumless) item = { ...item, albumless: true };
      const total = row.querySelector('[data-stat-value]')?.getAttribute('data-stat-value');
      if (/^\d+$/.test(total || '') && Number.isSafeInteger(Number(total))) item = {...item,libraryTotal:Number(total)};
      // Native artwork is not winner evidence. Its original album link can
      // choose one personal album-count read, which must still prove a majority.
      const original = originals.get(image);
      const nativeLink = original ? original.href : image.closest('a[href]');
      const albumHint = nativeLink && A.musicItem(nativeLink);
      if (A.libraryView(location.href) === 'tracks' && albumHint?.type === 'albums' &&
          R.normalize(albumHint.artist) === R.normalize(item.artist)) item = {...item, albumHint};
      const key = keyFor(item);
      const previous = observed.get(image);
      if (previous && previous.job === jobs.get(key)) {
        const cover = previous.job.cover || scrobbleCover(image, item, fields);
        if (cover) { if (cover.scrobble) scrobbleImages.set(image, cover); apply(image, cover); }
        else { mark(image, fields); pending(image); }
        continue;
      }
      if (previous) {
        previous.job.images.delete(image); observer.unobserve(image); observed.delete(image);
        if (running?.job === previous.job && !visible(previous.job)) running.controller.abort();
        restore(image);
      }
      if (!jobs.has(key)) {
        const saved = cache.get(key), age = saved ? Date.now() - saved.checkedAt : Infinity;
        // A verified winner stays displayable after 24 hours (it only changes if
        // your plays shift); it is refreshed in the background at low priority.
        const usable = saved && (age < STALE_LIMIT || !lookups) && (item.albumless || saved.cover.sourceVersion === 3);
        const fresh = usable && age < FRESH;
        jobs.set(key, { item, images: new Set(), cover: usable ? saved.cover : null, state: fresh ? 'complete' : 'waiting', albumless: !!albumless,
          placeholder: !A.coverImage(image.getAttribute('data-src') || image.getAttribute('src')) });
      }
      const job = jobs.get(key); job.images.add(image);
      touched.add(job);
      observed.set(image, { job, visible: false }); observer.observe(image);
      const cover = job.cover || scrobbleCover(image, item, fields);
      if (cover) {
        if (cover.scrobble) scrobbleImages.set(image, cover);
        apply(image, cover);
      } else { mark(image, fields); pending(image); }
    }
    const candidates = [...jobs.values()].filter(job => !job.albumless && ['waiting','unavailable'].includes(job.state) &&
      (!incoming || touched.has(job)));
    const known = lookups && candidates.length ? globalThis.LastfmArtworkAlbums?.peekMany(candidates.map(job => job.item), username) : null;
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
    if (signal?.aborted) throw new DOMException('Artwork preparation cancelled.', 'AbortError');
    if (!own()) return;
    const images = rows.map(row => row.querySelector('.chartlist-image img')).filter(Boolean);
    for (const image of images) prepared.add(image);
    try {
      // Apply cached winners and validated scrobble pairs before insertion.
      // Cold metadata runs after insertion; it must never delay pagination.
      scan(rows);
    } finally {
      for (const image of images) prepared.delete(image);
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
      const cover = albumImages.get(image) || observed.get(image)?.job.cover || scrobbleImages.get(image);
      if (cover) apply(image, cover);
      else if (originals.has(image)) pending(image);
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
          await lookupsRead;
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
  function refreshItems() {
    const items = new Map();
    for (const row of document.querySelectorAll('tr.chartlist-row')) {
      if (!row.querySelector('.chartlist-image img')) continue;
      const item = [...row.querySelectorAll('.chartlist-name a[href]')].map(link => A.musicItem(link))
        .find(item => item?.type === 'tracks');
      if (item) items.set(R.key([item.artist, item.name]), { artist: item.artist, name: item.name });
    }
    return [...items.values()];
  }
  async function refreshArtwork() {
    await ready;
    if (refreshing) throw new Error('Artwork is already refreshing.');
    if (!A.ownProfile(location.href, username)) throw new Error('Open your connected Last.fm profile first.');
    const items = refreshItems();
    if (!items.length) throw new Error('There are no track covers on this page to refresh.');
    refreshing = true; reset();
    try { return { ...await S.refreshArtwork(items, username), tracks: items.length }; }
    catch (error) { refreshing = false; scan(); throw error; }
  }
  globalThis.LastfmArtwork = Object.freeze({ start: () => scan(), prepareRows, refresh: refreshArtwork, status: () => ({
    cacheReady, refreshing, cachedTracks: cache.size, cacheError: cacheError || null,
    refreshableTracks: A.ownProfile(location.href, username) ? refreshItems().length : 0,
    visibleImages: [...observed.values()].filter(value => value.visible).length,
    jobs: Object.fromEntries(['waiting', 'loading', 'complete', 'unavailable'].map(state =>
      [state, [...jobs.values()].filter(job => job.state === state).length])),
    activeMilliseconds: running ? Math.max(0, Date.now() - startedAt) : 0,
    lookups, held: heldAt.size, unverified: lookups ? released.size : 0, native: lookups ? 0 : released.size,
    lastError: lastError || null
  }) });
})();
