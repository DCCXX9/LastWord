(() => {
  'use strict';
  const A = LastfmAdapter, R = LastfmRules;
  const records = new Map();
  const known = new Map();
  const encode = value => encodeURIComponent(value).replace(/%20/g, '+');
  const trackKey = item => JSON.stringify([R.normalize(item.artist), R.normalize(item.name)]);
  const albumKey = (album, username) => JSON.stringify([R.normalize(username), R.normalize(album.artist), R.normalize(album.name)]);
  function count(value) {
    const text = String(value ?? '').trim();
    const number = Number(text.replace(/[,\s]/g, ''));
    return /^\d[\d,\s]*$/.test(text) && Number.isSafeInteger(number) ? number : null;
  }
  function coverForAlbum(artist, album, username) {
    if (!A.ownProfile(location.href, username) || !A.libraryView(location.href)) return null;
    const saved = known.get(albumKey({ artist, name: album }, username));
    const read = records.get(albumKey({ artist, name: album }, username));
    if (read?.counts && read.cover) return { artist, album, ...read.cover };
    if (saved?.album.image) return { artist, album, image: saved.album.image, url: saved.album.url };
    // The five-album counting bound does not limit already-loaded artwork.
    // Only use this after the individual history has proved the album winner.
    for (const row of document.querySelectorAll('.col-main table.chartlist tr.chartlist-row')) {
      const item = [...row.querySelectorAll('.chartlist-name a[href]')].map(link => A.musicItem(link))
        .find(item => item?.type === 'albums');
      if (!item || R.normalize(item.artist) !== R.normalize(artist) || R.normalize(item.name) !== R.normalize(album)) continue;
      const img = row.querySelector('.chartlist-image img');
      const image = A.coverImage(img?.getAttribute('data-src')) || A.coverImage(img?.getAttribute('src'));
      if (image) return { artist, album, image, url: `${location.origin}/music/${encode(artist)}/${encode(album)}` };
    }
    return null;
  }
  function context(username) {
    const url = new URL(location.href), artist = A.musicItem(url.href);
    if (url.search || !A.ownProfile(url.href, username) ||
        !['artistScrobbles', 'tracks'].includes(A.libraryView(url.href)) || artist?.type !== 'artists') return null;
    const albums = [], totals = new Map(), seen = new Set();
    for (const row of document.querySelectorAll('.col-main table.chartlist tr.chartlist-row')) {
      const item = [...row.querySelectorAll('.chartlist-name a[href]')].map(link => A.musicItem(link)).find(Boolean);
      if (!item) continue;
      const n = count(row.querySelector('[data-stat-value]')?.getAttribute('data-stat-value'));
      if (n === null) continue;
      if (item.type === 'tracks' && R.normalize(item.artist) === R.normalize(artist.artist)) totals.set(trackKey(item), n);
      if (item.type !== 'albums') continue;
      const img = row.querySelector('.chartlist-image img');
      const image = A.coverImage(img?.getAttribute('data-src')) || A.coverImage(img?.getAttribute('src'));
      if (!image) continue;
      const key = albumKey(item, username);
      if (seen.has(key)) continue;
      seen.add(key);
      albums.push({ ...item, image, url: `${url.origin}/music/${encode(item.artist)}/${encode(item.name)}` });
    }
    const rankedTracks = A.libraryView(url.href) === 'tracks';
    // Full artist Tracks pages have no album rows. Seed only from fresh,
    // saved winners for this artist, then prove each new winner from today's
    // exact album counts. Legacy/stale records supply names only, never art.
    if (rankedTracks) for (const saved of known.values()) {
      if (saved.username === R.normalize(username) && saved.artists.has(R.normalize(artist.artist))) albums.push(saved.album);
    }
    return albums.length && totals.size ? { albums: albums.slice(0, 5), totals, rankedTracks } : null;
  }
  function remember(item, cover, username) {
    if (cover.sourceVersion !== 3 || cover.fallback || !cover.total || !A.coverImage(cover.image)) return;
    const album = { artist: cover.artist, name: cover.album, image: cover.image, url: cover.url };
    const key = albumKey(album, username);
    if (!known.has(key)) known.set(key, { album, username: R.normalize(username), artists: new Set() });
    const saved = known.get(key);
    saved.album = album;
    saved.artists.add(R.normalize(item.artist));
  }
  function hint(item, cover, username) {
    if (cover.fallback || !cover.total || !A.coverImage(cover.image)) return;
    const album = { artist: cover.artist, name: cover.album };
    const key = albumKey(album, username);
    if (!known.has(key)) known.set(key, { album, username: R.normalize(username), artists: new Set() });
    known.get(key).artists.add(R.normalize(item.artist));
  }
  function proven(item, username, data) {
    const key = trackKey(item), total = data.totals.get(key);
    if (!total) return null;
    const ranked = [], available = data.albums.filter(album => records.get(albumKey(album, username))?.counts);
    for (const album of available) ranked.push({ album, count: records.get(albumKey(album, username)).counts.get(key) || 0 });
    ranked.sort((a,b) => b.count-a.count);
    const scanned = ranked.reduce((n, entry) => n+entry.count, 0), remaining = total-scanned;
    if (remaining < 0 || !ranked[0]?.count || ranked[0].count <= (ranked[1]?.count || 0)+remaining) return null;
    const album = ranked[0].album, cover = records.get(albumKey(album, username)).cover;
    if (!cover) return null;
    return { artist: album.artist, album: album.name, ...cover,
      fallback: false, scanned, total, sourceVersion: 3 };
  }
  function peekMany(items, username) {
    const data = context(username);
    const covers = new Map();
    if (data) for (const item of items) {
      const cover = proven(item, username, data);
      if (cover) covers.set(item, cover);
    }
    return covers;
  }
  async function read(album, username, signal) {
    const key = albumKey(album, username);
    if (!records.has(key)) {
      const record = { counts: null };
      records.set(key, record);
      record.pending = (async () => {
        const totals = new Map();
        let url = `${location.origin}/user/${encode(username)}/library/music/+noredirect/${encode(album.artist)}/${encode(album.name)}`;
        let total = null, scanned = 0;
        for (let pageNumber = 1; url; pageNumber++) {
          const page = await LastfmPages.get(url, { signal }), returned = A.musicItem(page.url);
          if (returned?.type !== 'albums' || R.normalize(returned.artist) !== R.normalize(album.artist) ||
              R.normalize(returned.name) !== R.normalize(album.name)) throw new Error('Last.fm returned a different album library.');
          if (pageNumber === 1) {
            const header = page.doc.querySelector('.library-header');
            const linked = [...(header?.querySelectorAll('a[href]') || [])].map(link => A.musicItem(link, page.url))
              .some(item => item?.type === 'albums' && R.normalize(item.artist) === R.normalize(album.artist) &&
                R.normalize(item.name) === R.normalize(album.name));
            const primary = header?.querySelector('.library-header-image img');
            const image = A.coverImage(primary?.getAttribute('data-src')) || A.coverImage(primary?.getAttribute('src'));
            const verifiedHeader = A.ownProfile(page.url, username) && linked && image &&
              R.normalize(header?.querySelector('.library-header-title')?.textContent) === R.normalize(album.name);
            record.cover = verifiedHeader ? { image, url: `${location.origin}/music/${encode(album.artist)}/${encode(album.name)}` }
              : album.image ? { image: album.image, url: album.url } : null;
            if (!record.cover) throw new Error('This album library has no verified cover.');
          }
          const displays = [...page.doc.querySelectorAll('.col-main .metadata-display')];
          const n = displays.length === 1 ? count(displays[0].textContent) : null;
          if (n === null || total !== null && total !== n) throw new Error('The album library total could not be verified.');
          total = n;
          for (const row of page.doc.querySelectorAll('table.chartlist tr.chartlist-row')) {
            const track = [...row.querySelectorAll('.chartlist-name a[href]')].map(link => A.musicItem(link, page.url)).find(i => i?.type === 'tracks');
            const plays = count(row.querySelector('[data-stat-value]')?.getAttribute('data-stat-value'));
            if (!track || plays === null || totals.has(trackKey(track))) throw new Error('The album track totals could not be verified.');
            totals.set(trackKey(track), plays); scanned += plays;
          }
          if (scanned > total) throw new Error('The album track totals changed during lookup.');
          const next = A.nextPage(page.doc, page.url);
          if (next && Number(new URL(next).searchParams.get('page')) !== pageNumber+1) throw new Error('The album library pagination could not be verified.');
          // This is a bounded optimization, not another large library scan.
          // Long album lists remain unresolved here; the track-history reader
          // can prove that individual track without crawling the whole album.
          if (next && pageNumber >= 2) return;
          url = next;
        }
        if (scanned !== total) throw new Error('The complete album library could not be verified.');
        record.counts = totals;
        // Several visible tracks can now have proven winners, even while the
        // original track still needs another album's counts.
        globalThis.LastfmArtwork?.start();
      })();
      record.pending.catch(error => {
        if (error.name === 'AbortError' && records.get(key) === record) records.delete(key);
      });
    }
    await records.get(key).pending;
  }
  async function resolve(item, username, signal) {
    const data = context(username);
    if (!data?.totals.has(trackKey(item)) || item.placeholder && !data.rankedTracks) return null;
    for (const album of data.albums) {
      if (signal?.aborted) throw new DOMException('Artwork lookup cancelled.', 'AbortError');
      const known = proven(item, username, data);
      if (known) return known;
      await read(album, username, signal);
    }
    return proven(item, username, data);
  }
  globalThis.LastfmArtworkAlbums = Object.freeze({ resolve, peekMany, coverForAlbum, remember, hint,
    clear: () => { records.clear(); known.clear(); } });
})();
