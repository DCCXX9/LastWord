(() => {
  'use strict';
  if (globalThis.LastfmRules) return;

  const TYPES = ['artists', 'albums', 'tracks', 'albumArtists'];
  const normalize = value => String(value ?? '').trim().normalize('NFC').toLowerCase();
  const sameSpelling = (a, b) => typeof a === 'string' && typeof b === 'string' &&
    a.normalize('NFC').toLowerCase() === b.normalize('NFC').toLowerCase();
  const key = parts => JSON.stringify(parts.map(normalize));
  const empty = () => ({
    artists: {}, albums: {}, tracks: {}, albumArtists: {}
  });

  function clean(input) {
    const result = empty();
    for (const type of TYPES) {
      const entries = input?.[type];
      if (!entries || typeof entries !== 'object' || Array.isArray(entries)) continue;
      for (const [id, rule] of Object.entries(entries)) {
        if (typeof rule?.from !== 'string' || typeof rule?.to !== 'string' ||
            rule.from.length > 500 || rule.to.length > 500 ||
            typeof rule?.artist !== 'string' && rule?.artist !== undefined) continue;
        result[type][id] = {
          from: rule.from,
          to: rule.to,
          ...(rule.exact === true ? { exact: true } : {}),
          ...(rule.artist ? { artist: rule.artist } : {})
        };
      }
    }
    return result;
  }

  function idFor(type, from, artist = '') {
    return type === 'albums' || type === 'tracks'
      ? key([artist, from]) : key([from]);
  }

  function put(rules, type, from, to, artist = '', exact = false) {
    if (!TYPES.includes(type)) throw new Error('Unknown rule type');
    from = String(from).trim();
    to = String(to).trim();
    artist = String(artist).trim();
    if (!from || !to || from.length > 500 || to.length > 500 ||
        ((type === 'albums' || type === 'tracks') && !artist)) {
      throw new Error('Enter the original name, preferred name, and artist where needed.');
    }
    const id = idFor(type, from, artist);
    if (from === to && !exact) delete rules[type][id];
    else rules[type][id] = { from, to, ...(artist ? { artist } : {}), ...(exact ? { exact: true } : {}) };
    return id;
  }

  function get(rules, type, from, artist = '') {
    const to = rules[type]?.[idFor(type, from, artist)]?.to;
    return sameSpelling(String(from).trim(), to) ? to : null;
  }

  globalThis.LastfmRules = Object.freeze({
    TYPES, normalize, sameSpelling, key, empty, clean, idFor, put, get
  });
})();
