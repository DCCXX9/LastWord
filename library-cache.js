/* Raw names read from Last.fm's own library lists. Never edit endpoints or forms. */
(() => {
  'use strict';
  const R = LastfmRules, TYPES = ['tracks', 'albums', 'artists'];
  const KEY = 'lfmLibraryCacheV1';
  const spelling = (a, b) => typeof a === 'string' && typeof b === 'string' &&
    a.normalize('NFC').toLowerCase() === b.normalize('NFC').toLowerCase();
  // Last.fm's routes escape literal '+' twice (%252B). Keep the displayed
  // name unchanged; this only verifies its link, never the XML matching key.
  const linkedSpelling = (name, linked) => spelling(name, linked) ||
    typeof linked === 'string' && spelling(name, linked.replace(/%2b/gi, '+'));
  function create(username) {
    return { id: crypto.randomUUID(), username, startedAt: Date.now(), updatedAt: Date.now(),
      groups: Object.fromEntries(TYPES.map(type => [type, { page: 1, total: 0, done: false, items: {} }])) };
  }
  function status(cache) {
    return cache && { id: cache.id, username: cache.username, updatedAt: cache.updatedAt,
      complete: TYPES.every(type => cache.groups[type].done),
      groups: Object.fromEntries(TYPES.map(type => { const g = cache.groups[type];
        return [type, { page: g.page, total: g.total, done: g.done, count: Object.keys(g.items).length }]; })) };
  }
  function url(username, type, page) {
    if (!TYPES.includes(type) || !Number.isSafeInteger(page) || page < 1) throw new Error('Invalid library page.');
    return `https://www.last.fm/user/${encodeURIComponent(username)}/library/${type}?date_preset=ALL&page=${page}`;
  }
  function parse(doc, address, username, type, page) {
    const target = new URL(url(username, type, page)), returned = new URL(address);
    if (returned.origin !== target.origin || returned.pathname !== target.pathname ||
        (returned.searchParams.get('date_preset') || 'ALL') !== 'ALL' ||
        Number(returned.searchParams.get('page') || 1) !== page ||
        [...returned.searchParams.keys()].some(k => !['page', 'date_preset'].includes(k))) {
      throw new Error('Last.fm returned a different library page.');
    }
    const root = doc.querySelector('.col-main') || doc;
    const rows = [...root.querySelectorAll('tr.chartlist-row')].filter(row => !row.matches('.chartlist__placeholder-row'));
    const items = [];
    for (const row of rows) {
      const link = row.querySelector('.chartlist-name a[href]');
      if (!link) { if (row.querySelector('.chartlist-name')) throw new Error('A library name could not be read.'); continue; }
      const item = LastfmAdapter.musicItem(new URL(link.getAttribute('href'), address).href, 'https://www.last.fm/');
      const name = link.textContent.trim().normalize('NFC');
      const artistLink = row.querySelector('.chartlist-artist a[href]');
      const artist = type === 'artists' ? '' : artistLink?.textContent.trim().normalize('NFC');
      if (!item || item.type !== type || !name || name.length > 500 || !linkedSpelling(name, item.name) ||
          type !== 'artists' && (!artist || artist.length > 500 || !linkedSpelling(artist, item.artist))) {
        throw new Error('A library name or artist could not be verified.');
      }
      items.push({ name, ...(artist ? { artist } : {}) });
    }
    if (!items.length && !root.querySelector('.library-empty,.chartlist-empty,.empty-library')) {
      throw new Error('Last.fm returned no verifiable library names. Check your sign-in.');
    }
    const nextLink = root.querySelector('nav.pagination .pagination-next a[href],nav.pagination a[rel=next],nav.pagination a.pagination-next[href]');
    let total = page;
    for (const a of root.querySelectorAll('nav.pagination a[href]')) {
      const u = new URL(a.getAttribute('href'), address), n = Number(u.searchParams.get('page'));
      if (u.origin === target.origin && u.pathname === target.pathname && Number.isSafeInteger(n)) total = Math.max(total, n);
    }
    if (nextLink) {
      const n = new URL(nextLink.getAttribute('href'), address);
      if (n.origin !== target.origin || n.pathname !== target.pathname || Number(n.searchParams.get('page')) !== page + 1 ||
          [...n.searchParams.keys()].some(k => !['page', 'date_preset'].includes(k)) ||
          n.searchParams.has('date_preset') && n.searchParams.get('date_preset') !== 'ALL') throw new Error('The next library page could not be verified.');
    } else if (total > page) throw new Error('Last.fm omitted a library page.');
    return { type, page, total, done: !nextLink, items };
  }
  function accept(cache, data) {
    const group = cache.groups[data.type];
    if (!group || group.done || data.page !== group.page || !Number.isSafeInteger(data.total) || data.total < data.page ||
        typeof data.done !== 'boolean' || !Array.isArray(data.items) || data.items.length > 500 ||
        !data.done && !data.items.length) throw new Error('The library cache changed. Resume the comparison.');
    for (const item of data.items) {
      if (typeof item.name !== 'string' || !item.name || item.name.length > 500 ||
          data.type !== 'artists' && (typeof item.artist !== 'string' || !item.artist || item.artist.length > 500)) throw new Error('Invalid cached library name.');
      const id = R.idFor(data.type, item.name, item.artist), old = group.items[id];
      group.items[id] = { name: item.name, ...(data.type !== 'artists' ? { artist: item.artist } : {}),
        ...(old && (old.name !== item.name || old.ambiguous) ? { ambiguous: true } : {}) };
    }
    group.page++; group.total = data.total; group.done = data.done; cache.updatedAt = Date.now();
    return cache;
  }
  function compare(scan, cache, rules) {
    if (!cache?.groups) throw new Error('Cache your Last.fm library before reviewing changes.');
    const candidates = [];
    for (const candidate of scan.candidates) {
      const source = cache.groups[candidate.type]?.items[candidate.id];
      if (!source || source.ambiguous) continue;
      const existing = rules[candidate.type]?.[candidate.id];
      const before = existing && spelling(source.name, existing.to) ? existing.to : source.name;
      const variants = candidate.variants.filter(to => spelling(source.name, to));
      if (!variants.length || variants.every(to => to === before)) continue;
      candidates.push({ ...candidate, from: R.normalize(source.name), source: source.name,
        before, variants, to: variants[0], artist: source.artist || undefined });
    }
    return { ...scan, candidates };
  }
  globalThis.LastfmLibraryCache = Object.freeze({ KEY, TYPES, spelling, create, status, url, parse, accept, compare });
})();
