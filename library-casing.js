/* Local, source-independent casing plan. XML and future Library Doctor adapters
   supply the same four metadata fields; storage and user selection live elsewhere. */
(() => {
  'use strict';
  const R = globalThis.LastfmRules;
  function field(track, name) {
    const value = track?.[name];
    return value === undefined ? '' : typeof value === 'string' ? value.trim().normalize('NFC') : null;
  }
  function createCollector() {
    const candidates = new Map(), variants = new Map(), issues = new Map();
    let songs = 0, skipped = 0, duplicates = 0;
    const issue = message => issues.set(message, (issues.get(message) || 0) + 1);
    function skipTrack(message) { songs++; skipped++; issue(message); }
    function add(type, name, artist) {
      const from = R.normalize(name), id = R.idFor(type, from, artist), key = type + ':' + id;
      const existing = candidates.get(key);
      if (existing) {
        duplicates++; existing.occurrences++;
        if (!variants.get(key).has(name)) { variants.get(key).add(name); existing.variants.push(name); }
      } else {
        candidates.set(key, { type, id, from, to: name, ...(artist ? { artist } : {}), variants: [name], occurrences: 1 });
        variants.set(key, new Set([name]));
      }
    }
    function addTrack(track) {
      const name = field(track, 'Name'), artist = field(track, 'Artist');
      if (!name || !artist || name.length > 500 || artist.length > 500) {
        skipTrack('Entries without a valid track name and artist (up to 500 characters each) were skipped.'); return;
      }
      songs++;
      add('artists', artist); add('tracks', name, artist);
      const album = field(track, 'Album'), albumArtist = field(track, 'Album Artist');
      const validAlbumArtist = albumArtist !== null && albumArtist.length <= 500;
      if (!validAlbumArtist) issue('Invalid album artist values were omitted.');
      else if (albumArtist) add('albumArtists', albumArtist);
      if (album === null || album.length > 500) issue('Invalid album values were omitted.');
      else if (album) {
        add('albums', album, artist);
        if (validAlbumArtist && albumArtist && R.normalize(albumArtist) !== R.normalize(artist)) add('albums', album, albumArtist);
      }
    }
    return Object.freeze({ addTrack, skipTrack,
      counts: () => ({ processed: songs, skipped, candidates: candidates.size }),
      result: () => ({ songs, total: songs, skipped, duplicates,
        candidates: [...candidates.values()].map(entry => ({ ...entry, variants: [...entry.variants] })),
        issues: [...issues].map(([message, count]) => ({ message, count })) }) });
  }
  function fromTracks(tracks) {
    if (!Array.isArray(tracks)) throw new Error('Supply an array of library track metadata.');
    const collector = createCollector();
    for (const track of tracks) collector.addTrack(track);
    return collector.result();
  }
  globalThis.LastfmLibraryCasing = Object.freeze({ VERSION: 1, createCollector, fromTracks });
})();
