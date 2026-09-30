(() => {
  'use strict';
  const R = globalThis.LastfmRules;
  const check = signal => {
    if (signal?.aborted) throw new DOMException('Library scan cancelled.', 'AbortError');
  };
  const yieldTask = () => new Promise(resolve => setTimeout(resolve, 0));
  const spelling = value => value.trim().normalize('NFC');

  function xmlWithoutDtd(text) {
    if (typeof text !== 'string') throw new Error('Choose an iTunes library XML file.');
    // Standard Apple exports name an external DTD. Remove it before parsing so
    // no external resource can be resolved. Custom declarations are unsupported.
    if (/<!ENTITY\b/i.test(text)) throw new Error('XML entity declarations are not supported. Export a fresh library XML from iTunes.');
    let declarations = 0;
    const clean = text.replace(/<!DOCTYPE\s+[^>]*>/gi, declaration => {
      declarations++;
      const apple = /^<!DOCTYPE\s+plist\s+PUBLIC\s+(["'])-\/\/Apple\/\/DTD PLIST 1\.0\/\/EN\1\s+(["'])https?:\/\/www\.apple\.com\/DTDs\/PropertyList-1\.0\.dtd\2\s*>$/i;
      const appleSystem = /^<!DOCTYPE\s+plist\s+SYSTEM\s+(["'])https?:\/\/www\.apple\.com\/DTDs\/PropertyList-1\.0\.dtd\1\s*>$/i;
      if (!apple.test(declaration) && !appleSystem.test(declaration)) {
        throw new Error('This XML has an unsupported document type. Choose an iTunes library export.');
      }
      return '';
    });
    if (declarations > 1 || /<!DOCTYPE\b/i.test(clean)) throw new Error('This XML has an invalid document type.');
    return clean;
  }
  function entries(dict) {
    const children = [...dict.children];
    if (children.length % 2) throw new Error('The library contains an incomplete XML dictionary.');
    const result = [];
    for (let i = 0; i < children.length; i += 2) {
      if (children[i].tagName !== 'key' || children[i].children.length || children[i + 1].tagName === 'key') {
        throw new Error('The library contains an invalid XML dictionary.');
      }
      result.push([children[i].textContent, children[i + 1]]);
    }
    return result;
  }
  function trackFields(dict) {
    const fields = new Map();
    for (const [name, value] of entries(dict)) {
      if (fields.has(name)) throw new Error('duplicate fields');
      fields.set(name, value);
    }
    return fields;
  }
  function stringField(fields, name) {
    const field = fields.get(name);
    if (!field) return '';
    return field.tagName === 'string' && !field.children.length ? spelling(field.textContent) : null;
  }
  async function scan(xmlText, { onProgress, signal } = {}) {
    check(signal);
    await yieldTask();
    check(signal);
    const doc = new DOMParser().parseFromString(xmlWithoutDtd(xmlText), 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('The XML file could not be read. Export a fresh library XML from iTunes.');
    const plist = doc.documentElement;
    if (plist?.tagName !== 'plist' || plist.children.length !== 1 || plist.firstElementChild.tagName !== 'dict') {
      throw new Error('Choose an iTunes library XML file containing a plist dictionary.');
    }
    const trackLists = entries(plist.firstElementChild).filter(([name]) => name === 'Tracks');
    if (trackLists.length !== 1 || trackLists[0][1].tagName !== 'dict') {
      throw new Error('This XML does not contain a single iTunes Tracks dictionary.');
    }
    const tracks = entries(trackLists[0][1]);
    const candidates = new Map();
    const variants = new Map();
    const issueCounts = new Map();
    let skipped = 0;
    let duplicates = 0;
    const issue = message => issueCounts.set(message, (issueCounts.get(message) || 0) + 1);
    function add(type, name, artist) {
      const from = R.normalize(name);
      const id = R.idFor(type, from, artist);
      const key = type + ':' + id;
      const existing = candidates.get(key);
      if (existing) {
        duplicates++; existing.occurrences++;
        if (!variants.get(key).has(name)) {
          variants.get(key).add(name); existing.variants.push(name);
        }
      } else {
        candidates.set(key, { type, id, from, to: name, ...(artist ? { artist } : {}),
          variants: [name], occurrences: 1 });
        variants.set(key, new Set([name]));
      }
    }
    async function progress(processed) {
      check(signal);
      onProgress?.({ processed, total: tracks.length, skipped, candidates: candidates.size });
      await yieldTask();
      check(signal);
    }
    await progress(0);
    for (let index = 0; index < tracks.length; index++) {
      check(signal);
      const track = tracks[index][1];
      let fields;
      try {
        if (track.tagName !== 'dict') throw new Error('not a dictionary');
        fields = trackFields(track);
      } catch {
        skipped++; issue('Entries with invalid or duplicate fields were skipped.');
      }
      if (fields) {
        const name = stringField(fields, 'Name');
        const artist = stringField(fields, 'Artist');
        if (!name || !artist || name.length > 500 || artist.length > 500) {
          skipped++; issue('Entries without a valid track name and artist (up to 500 characters each) were skipped.');
        } else {
          add('artists', artist); add('tracks', name, artist);
          const album = stringField(fields, 'Album');
          const albumArtist = stringField(fields, 'Album Artist');
          const validAlbumArtist = albumArtist !== null && albumArtist.length <= 500;
          if (!validAlbumArtist) issue('Invalid album artist values were omitted.');
          else if (albumArtist) add('albumArtists', albumArtist);
          if (album === null || album.length > 500) issue('Invalid album values were omitted.');
          else if (album) {
            add('albums', album, artist);
            if (validAlbumArtist && albumArtist && R.normalize(albumArtist) !== R.normalize(artist)) {
              add('albums', album, albumArtist);
            }
          }
        }
      }
      if ((index + 1) % 100 === 0 || index === tracks.length - 1) await progress(index + 1);
    }
    return { songs: tracks.length, total: tracks.length, skipped, duplicates,
      candidates: [...candidates.values()],
      issues: [...issueCounts].map(([message, count]) => ({ message, count })) };
  }
  globalThis.LastfmItunes = Object.freeze({ scan });
})();
