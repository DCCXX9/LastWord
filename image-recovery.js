(() => {
  'use strict';
  if (globalThis.LastfmImageRecovery) return;
  const A = LastfmAdapter, S = LastfmStore;
  const selector = '.chartlist-image img, .library-header-image img';
  const attrs = ['src', 'data-src', 'srcset', 'data-srcset'];
  const jobs = new Map(), repaired = new Map();
  let username = '', generation = 0, active = 0, recovered = 0;
  const own = () => A.ownProfile(location.href, username) && !document.hidden;

  function identity(value) {
    try {
      const url = new URL(value);
      const parts = /^\/i\/u\/[^/]+\/([a-f0-9]{16,64}\.(?:jpg|jpeg|png|webp))$/i.exec(url.pathname);
      if (!parts || url.origin !== 'https://lastfm-img.freetls.fastly.net' || !A.coverImage(url.href)) return null;
      return { key: parts[1].toLowerCase(), file: parts[1], url: url.origin + url.pathname };
    } catch { return null; }
  }
  function matches(image, key) {
    // currentSrc can still name the previous image immediately after src changes.
    const intended = identity(image.getAttribute('src'));
    const selected = identity(image.currentSrc);
    return image.isConnected && intended?.key === key && (!selected || selected.key === key);
  }
  function visible(image) {
    const r = image.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > -100 && r.top < innerHeight + 100;
  }
  function apply(job, image) {
    if (!own() || !job.source || !matches(image, job.key)) return;
    let record = repaired.get(image);
    if (record?.key !== job.key) {
      record = { key: job.key, source: job.source,
        original: Object.fromEntries(attrs.map(name => [name, image.getAttribute(name)])) };
      repaired.set(image, record); recovered++;
    }
    record.source = job.source;
    for (const name of ['srcset', 'data-srcset']) if (image.hasAttribute(name)) image.removeAttribute(name);
    for (const name of ['src', 'data-src']) if (image.getAttribute(name) !== job.source) image.setAttribute(name, job.source);
  }
  function prune() {
    for (const [image, record] of repaired) if (!image.isConnected || identity(image.getAttribute('src'))?.key !== record.key) repaired.delete(image);
    for (const job of jobs.values()) for (const image of job.images) if (!matches(image, job.key)) {
      job.images.delete(image); intersections.unobserve(image);
    }
  }
  function probe(url, job) {
    return new Promise(resolve => {
      const image = new Image();
      let timer;
      const finish = ok => {
        clearTimeout(timer); image.onload = image.onerror = null; job.cancel = null;
        if (!ok) image.removeAttribute('src');
        resolve(ok);
      };
      image.onload = () => finish(image.naturalWidth > 0);
      image.onerror = () => finish(false);
      job.cancel = () => finish(false);
      timer = setTimeout(() => finish(false), 5000);
      image.src = url;
    });
  }
  async function run(job) {
    const current = generation;
    active++; job.running = true;
    try {
      // Only sizes change: the exact image ID and file type stay selected.
      for (const size of ['300x300', 'ar0']) {
        const url = 'https://lastfm-img.freetls.fastly.net/i/u/' + size + '/' + job.file;
        if (current !== generation || !job.images.size) return;
        if (job.failed.has(url)) continue;
        job.failed.add(url);
        if (await probe(url, job)) {
          if (current !== generation) return;
          job.source = url;
          for (const image of job.images) apply(job, image);
          break;
        }
      }
    } finally {
      if (current === generation) {
        active--; job.running = false; job.done = true;
        for (const image of job.images) intersections.unobserve(image);
        pump();
      }
    }
  }
  function pump() {
    if (!own()) return;
    prune();
    for (const job of jobs.values()) {
      if (active >= 2) break;
      if (!job.done && !job.running && [...job.images].some(visible)) void run(job);
    }
  }
  function inspect(image) {
    if (!own() || !image.matches?.(selector)) return;
    const intended = identity(image.getAttribute('src'));
    if (!intended || !matches(image, intended.key)) return;
    let job = jobs.get(intended.key);
    if (job?.source && image.complete && !image.naturalWidth && identity(image.currentSrc)?.url === job.source) {
      // A successful probe is not proof that the visible element also loaded.
      job.failed.add(job.source); job.source = null; job.done = false;
    }
    if (job?.source) {
      if (repaired.get(image)?.key === job.key || job.failed.has(identity(image.currentSrc)?.url || intended.url) ||
          image.complete && !image.naturalWidth) apply(job, image);
      return;
    }
    if (!image.complete || image.naturalWidth > 0) return;
    if (!job) {
      // Keep the in-page cache bounded, including terminal failures.
      if (jobs.size >= 256) return;
      job = { ...intended, images: new Set(), failed: new Set(), running: false, done: false };
      jobs.set(job.key, job);
    }
    job.failed.add(identity(image.currentSrc)?.url || intended.url);
    if (job.done) return;
    job.images.add(image); intersections.observe(image); pump();
  }
  function scan(root = document) {
    if (!own()) return;
    if (root.matches?.(selector)) inspect(root);
    for (const image of root.querySelectorAll?.(selector) || []) inspect(image);
  }
  function reset() {
    generation++;
    for (const job of jobs.values()) job.cancel?.();
    jobs.clear(); active = 0; intersections.disconnect();
    for (const [image, record] of repaired) {
      if (image.getAttribute('src') !== record.source) continue;
      for (const [name, value] of Object.entries(record.original)) {
        const ours = name.includes('srcset') ? !image.hasAttribute(name) : image.getAttribute(name) === record.source;
        if (ours) { if (value === null) image.removeAttribute(name); else image.setAttribute(name, value); }
      }
    }
    repaired.clear(); recovered = 0;
  }
  const intersections = new IntersectionObserver(pump, { rootMargin: '100px 0px' });
  const mutations = new MutationObserver(records => {
    if (!own()) return;
    for (const record of records) {
      if (record.type === 'attributes') inspect(record.target);
      else for (const node of record.addedNodes) if (node.nodeType === 1) scan(node);
    }
    prune();
  });
  const options = { childList: true, subtree: true, attributes: true, attributeFilter: attrs };
  mutations.observe(document, options);
  document.addEventListener('error', event => inspect(event.target), true);
  const accept = state => {
    if (username !== state.settings.username) { reset(); username = state.settings.username; scan(); }
  };
  S.subscribe(accept);
  S.read().then(accept).catch(() => {});
  addEventListener('visibilitychange', () => { if (!document.hidden) { scan(); pump(); } });
  addEventListener('pagehide', () => { reset(); mutations.disconnect(); });
  addEventListener('pageshow', event => { if (event.persisted) { mutations.observe(document, options); scan(); } });
  addEventListener('popstate', () => { if (!A.ownProfile(location.href, username)) reset(); else scan(); });
  globalThis.LastfmImageRecovery = Object.freeze({
    sourceFor: (image, source) => {
      const record = repaired.get(image);
      return own() && record && record.key === identity(source)?.key ? record.source : source;
    },
    status: () => ({ recovered, active, unavailable: [...jobs.values()].filter(job => job.done && !job.source).length })
  });
})();
