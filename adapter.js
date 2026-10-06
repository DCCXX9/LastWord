(() => {
  'use strict';

  const normalize = value => String(value ?? '').trim().normalize('NFC').toLowerCase();
  const baseUrl = () => globalThis.location?.href || 'https://www.last.fm/';
  function decode(value) {
    try { return decodeURIComponent(String(value).replace(/\+/g, ' ')); }
    catch { return String(value).replace(/\+/g, ' '); }
  }
  function parse(value, base = baseUrl()) {
    try {
      const url = new URL(value?.href || value, base);
      return url.origin === new URL(base).origin && url.hostname === 'www.last.fm'
        ? url : null;
    } catch { return null; }
  }
  function ownProfile(value, username) {
    const url = parse(value);
    const parts = url?.pathname.split('/').filter(Boolean) || [];
    return Boolean(username && parts[0] === 'user' &&
      normalize(decode(parts[1] || '')) === normalize(username));
  }
  function musicParts(url) {
    const parts = url.pathname.split('/').filter(Boolean);
    const start = parts[0] === 'music' ? 1
      : parts[0] === 'user' && parts[2] === 'library' && parts[3] === 'music' ? 4 : -1;
    if (start < 0) return null;
    const index = parts[start] === '+noredirect' ? start + 1 : start;
    return parts[index] && !parts[index].startsWith('+') ? parts.slice(index) : null;
  }
  function musicItem(value, base = baseUrl()) {
    const url = parse(value, base);
    const parts = url && musicParts(url);
    if (!parts) return null;
    const artist = decode(parts[0]);
    if (parts[1] === '_' && parts[2] && !parts[2].startsWith('+')) {
      return { type: 'tracks', artist, name: decode(parts[2]) };
    }
    if (parts[1] && !parts[1].startsWith('+') && parts[1] !== '_') {
      return parts[2] && !parts[2].startsWith('+')
        ? { type: 'tracks', artist, name: decode(parts[2]) }
        : { type: 'albums', artist, name: decode(parts[1]) };
    }
    return { type: 'artists', artist, name: artist };
  }
  function libraryView(value) {
    const url = parse(value);
    const parts = url?.pathname.split('/').filter(Boolean) || [];
    if (parts[0] !== 'user' || !parts[1] || parts[2] !== 'library') return null;
    if (parts.length === 3 || parts.length === 4 && parts[3] === 'scrobbles') return 'scrobbles';
    if (parts.length === 4 && ['artists', 'albums', 'tracks'].includes(parts[3])) return parts[3];
    const music = musicParts(url);
    if (!music) return null;
    if (music.length === 1) return 'artistScrobbles';
    if (music.length === 2 && music[1] === '+albums') return 'artistAlbums';
    if (music.length === 2 && music[1] === '+tracks') return 'tracks';
    return null;
  }
  function nextPage(root, base = baseUrl()) {
    const current = parse(base, base);
    if (!current) return null;
    const link = root.querySelector('nav.pagination .pagination-next a[href],nav.pagination a.pagination-next[href],nav.pagination a[rel="next"]');
    const next = link && parse(link.getAttribute('href'), base);
    if (!next || next.pathname !== current.pathname) return null;
    const page = Number(current.searchParams.get('page') || 1);
    const nextNumber = Number(next.searchParams.get('page'));
    if (!Number.isSafeInteger(nextNumber) || nextNumber <= page) return null;
    const filters = url => [...url.searchParams.entries()].filter(([key]) => key !== 'page').sort().map(pair => JSON.stringify(pair)).join();
    return filters(current) === filters(next) ? next.href : null;
  }
  function value(form, name) {
    const fields = [...form.elements].filter(field => field.name === name);
    return fields.length === 1 && typeof fields[0].value === 'string'
      ? fields[0].value : null;
  }
  function editRow(form, base, username, allowOmittedAlbums = false) {
    if (!form.matches('form[data-edit-scrobble]')) return null;
    const action = parse(form.getAttribute('action'), base);
    if (!action || !ownProfile(action.href, username) ||
        !/^\/user\/[^/]+\/library\/edit-track$/.test(action.pathname) ||
        form.method.toLowerCase() !== 'post') return null;
    const fields = { artist: 'artist_name', track: 'track_name', album: 'album_name',
      albumArtist: 'album_artist_name', timestamp: 'timestamp' };
    const result = { action: action.href };
    const omittedAlbums = allowOmittedAlbums && ![...form.elements].some(field =>
      ['album_name', 'album_artist_name'].includes(field.name));
    for (const [key, name] of Object.entries(fields)) {
      result[key] = value(form, name);
      if (result[key] === null && omittedAlbums && ['album', 'albumArtist'].includes(key)) result[key] = '';
      if (result[key] === null) return null;
    }
    return result.artist.trim() && result.track.trim() && /^\d+$/.test(result.timestamp)
      ? result : null;
  }
  function editPairs(form) {
    const names = { track: 'track_name', album: 'album_name', artist: 'artist_name',
      albumArtist: 'album_artist_name' };
    const pairs = {};
    for (const [key, name] of Object.entries(names)) {
      const from = value(form, name + '_original');
      const to = value(form, name);
      if (from === null && to === null) continue;
      if (from === null || to === null) return null;
      pairs[key] = { from, to };
    }
    // Track fields are confirmed by the user's signed-in form inspection.
    // Album forms are supported only if they expose the same complete named pairs.
    if (!pairs.album || !pairs.artist || !pairs.albumArtist) return null;
    return pairs;
  }
  globalThis.LastfmAdapter = Object.freeze({ decode, musicItem, ownProfile, libraryView,
    nextPage, editRow, editPairs });
})();
