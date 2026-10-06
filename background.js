/* The worker is the sole writer of preferences. Every operation reads the latest
   stored value inside one queue, so different tabs cannot replace stale copies. */
importScripts('rules.js', 'store.js');

(() => {
  'use strict';
  const R = globalThis.LastfmRules;
  const defaults = globalThis.LastfmStore.DEFAULT_SETTINGS;
  const owns = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  let queue = Promise.resolve();

  function settings(input) {
    return {
      username: typeof input?.username === 'string' ? input.username.trim() : defaults.username,
      infiniteScroll: input?.infiniteScroll !== false
    };
  }

  function snapshot(stored) {
    return { rules: R.clean(stored.rules), settings: settings(stored.settings) };
  }

  function equal(a, b) {
    if (a === b) return true;
    if (!object(a) || !object(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(key => owns(b, key) && equal(a[key], b[key]));
  }

  function validSettings(value) {
    if (!object(value) || typeof value.username !== 'string' ||
        !/^[^/\\\s?#]+$/.test(value.username) ||
        typeof value.infiniteScroll !== 'boolean' ||
        Object.keys(value).some(key => !owns(defaults, key))) {
      throw new Error('Enter a valid Last.fm username and scrolling setting.');
    }
    return { username: value.username, infiniteScroll: value.infiniteScroll };
  }

  function validRule(type, id, rule) {
    if (!R.TYPES.includes(type) || typeof id !== 'string' || !object(rule) ||
        typeof rule.from !== 'string' || typeof rule.to !== 'string' ||
        (owns(rule, 'artist') && typeof rule.artist !== 'string') ||
        (owns(rule, 'exact') && rule.exact !== true) ||
        Object.keys(rule).some(key => !['from', 'to', 'artist', 'exact'].includes(key))) {
      throw new Error('The backup contains an invalid display preference.');
    }
    const probe = R.empty();
    const generated = R.put(probe, type, rule.from, rule.to, rule.artist || '', rule.exact === true);
    if (generated !== id || !probe[type][id] || !equal(probe[type][id], rule)) {
      throw new Error('The backup contains an invalid display preference.');
    }
    return probe[type][id];
  }

  function validateRules(input) {
    if (!object(input) || Object.keys(input).some(key => !R.TYPES.includes(key)) ||
        R.TYPES.some(type => !object(input[type]))) {
      throw new Error('The backup does not contain all display preference groups.');
    }
    const result = R.empty();
    for (const type of R.TYPES) {
      for (const [id, rule] of Object.entries(input[type])) result[type][id] = validRule(type, id, rule);
    }
    return result;
  }

  function validateBackup(backup) {
    if (!object(backup) || backup.version !== 1 ||
        Object.keys(backup).some(key => !['version', 'rules', 'settings', 'extraStorage'].includes(key))) {
      throw new Error('This is not a valid version 1 backup.');
    }
    const rules = validateRules(backup.rules);
    const importedSettings = validSettings(backup.settings);
    const extra = backup.extraStorage ?? {};
    if (!object(extra) || owns(extra, 'rules') || owns(extra, 'settings')) {
      throw new Error('The backup contains invalid additional storage.');
    }
    if (owns(extra, 'itunesImportUndo')) journal(extra);
    // Chrome local storage values must survive JSON serialization unchanged.
    let serialized;
    try { serialized = JSON.stringify(extra); } catch { throw new Error('The backup contains invalid additional storage.'); }
    if (serialized === undefined) throw new Error('The backup contains invalid additional storage.');
    return { rules, settings: importedSettings, extra: JSON.parse(serialized) };
  }

  function authorize(sender, action, current) {
    if (sender.id !== chrome.runtime.id) throw new Error('This request did not come from this extension.');
    let url;
    try { url = new URL(sender.url || ''); } catch { throw new Error('The requesting page could not be verified.'); }
    const extension = url.protocol === 'chrome-extension:' && url.host === chrome.runtime.id &&
      ['/options.html', '/popup.html', '/itunes.html', '/preferences.html'].includes(url.pathname);
    if (extension) return;
    const match = url.pathname.match(/^\/user\/([^/]+)(?:\/|$)/i);
    let user = '';
    try { user = decodeURIComponent(match?.[1] || ''); } catch { /* Invalid profile URL. */ }
    const ownProfile = url.origin === 'https://www.last.fm' && !!current.settings.username &&
      R.normalize(user) === R.normalize(current.settings.username);
    if (action === 'read' && url.origin === 'https://www.last.fm') return;
    if (['mutate', 'artwork-read', 'artwork-put'].includes(action) && ownProfile) return;
    throw new Error('Open your connected Last.fm profile to change its preferences.');
  }

  function applyOperations(rules, operations) {
    if (!Array.isArray(operations) || !operations.length || operations.length > 1000) {
      throw new Error('No valid preference changes were supplied.');
    }
    for (const operation of operations) {
      if (!object(operation) || !R.TYPES.includes(operation.type)) throw new Error('Unknown preference type.');
      const { op, type } = operation;
      const id = op === 'put' ? R.idFor(type, operation.from, operation.artist || '') : operation.id;
      if (typeof id !== 'string') throw new Error('A preference identifier is missing.');
      const existing = rules[type][id] || null;
      if (owns(operation, 'expected') && !equal(existing, operation.expected)) {
        throw new Error('This preference changed in another tab. Refresh the list and try again.');
      }
      if (op === 'put') {
        if (typeof operation.from !== 'string' || typeof operation.to !== 'string' ||
            (owns(operation, 'artist') && typeof operation.artist !== 'string')) {
          throw new Error('Enter the original name, preferred name, and artist where needed.');
        }
        R.put(rules, type, operation.from, operation.to, operation.artist || '', existing?.exact === true);
      } else if (op === 'delete') {
        delete rules[type][id];
      } else if (op === 'restore') {
        if (operation.expected !== null) throw new Error('Undo requires an unchanged deleted preference.');
        rules[type][id] = validRule(type, id, operation.rule);
      } else {
        throw new Error('Unknown preference change.');
      }
    }
    return rules;
  }

  const UNDO = 'itunesImportUndo';
  function journal(stored) {
    const batch = stored[UNDO];
    if (!batch) return null;
    if (batch.version !== 1 || typeof batch.id !== 'string' ||
        typeof batch.username !== 'string' || !Number.isFinite(batch.appliedAt) ||
        !Array.isArray(batch.changes)) {
      throw new Error('The saved XML revert record is invalid. Export a JSON backup before continuing.');
    }
    const seen = new Set();
    for (const change of batch.changes) {
      const key = change.type + ':' + change.id;
      if (seen.has(key) || (owns(change, 'touched') && typeof change.touched !== 'boolean')) {
        throw new Error('The saved XML revert record is invalid.');
      }
      seen.add(key);
      validRule(change.type, change.id, change.after);
      if (change.before !== null) validRule(change.type, change.id, change.before);
    }
    return batch;
  }
  function batchSummary(batch) {
    return batch ? { id: batch.id, username: batch.username, appliedAt: batch.appliedAt,
      count: batch.changes.length, remaining: batch.changes.filter(change => !change.touched).length } : null;
  }
  function touchJournal(stored, operations) {
    const batch = journal(stored);
    if (!batch) return {};
    const touched = operations && new Set(operations.map(op => op.type + ':' +
      (op.op === 'put' ? R.idFor(op.type, op.from, op.artist || '') : op.id)));
    return { [UNDO]: { ...batch, changes: batch.changes.map(change =>
      !touched || touched.has(change.type + ':' + change.id) ? { ...change, touched: true } : change) } };
  }
  async function applyItunes(stored, current, message) {
    if (message.username !== current.settings.username) {
      throw new Error('Your configured profile changed. Scan the XML again before applying it.');
    }
    if (!Array.isArray(message.entries) || !message.entries.length) {
      throw new Error('Select at least one display preference to apply.');
    }
    const rules = stored.rules == null ? R.empty() : validateRules(stored.rules);
    const changes = [], seen = new Set();
    let unchanged = 0;
    for (const entry of message.entries) {
      const { type, id, rule } = entry;
      const key = type + ':' + id;
      if (seen.has(key)) throw new Error('The selection contains duplicate display preferences.');
      seen.add(key);
      validRule(type, id, rule);
      if (rule.exact !== true || rule.from !== R.normalize(rule.to)) {
        throw new Error('An XML preference must preserve its original spelling and change display casing only.');
      }
      const before = rules[type][id] || null;
      if (!owns(entry, 'expected') || !equal(before, entry.expected)) {
        throw new Error('A selected preference changed in another tab. Scan again to review the latest preferences.');
      }
      if (before?.to === rule.to) { unchanged++; continue; }
      rules[type][id] = rule;
      changes.push({ type, id, before, after: rule });
    }
    if (!changes.length) return { snapshot: current, batch: batchSummary(journal(stored)), applied: 0, unchanged };
    const batch = { version: 1, id: crypto.randomUUID(), username: current.settings.username,
      appliedAt: Date.now(), changes };
    // The rules and their undo record are committed in the same storage call.
    try {
      await chrome.storage.local.set({ rules, [UNDO]: batch });
    } catch (error) {
      if (/quota/i.test(error.message)) throw new Error('There is not enough extension storage for these rules and their undo record. Nothing was applied. Select fewer items and try again.');
      throw error;
    }
    return { snapshot: { ...current, rules }, batch: batchSummary(batch), applied: changes.length, unchanged };
  }
  async function revertItunes(stored, current, message) {
    const batch = journal(stored);
    if (!batch || batch.id !== message.id) throw new Error('This XML import is no longer the latest import. Refresh this page.');
    if (batch.username !== current.settings.username) throw new Error('Switch back to the imported profile before reverting.');
    const rules = stored.rules == null ? R.empty() : validateRules(stored.rules);
    let reverted = 0, kept = 0;
    for (const change of batch.changes) {
      if (change.touched || !equal(rules[change.type][change.id] || null, change.after)) { kept++; continue; }
      if (change.before === null) delete rules[change.type][change.id];
      else rules[change.type][change.id] = change.before;
      reverted++;
    }
    await chrome.storage.local.set({ rules, [UNDO]: null });
    return { snapshot: { ...current, rules }, batch: null, reverted, kept };
  }

  const ARTWORK = 'lfmPersonalArtworkCacheV1';
  function artworkRecord(item, cover, username) {
    if (!object(item) || !object(cover) ||
        [item.artist, item.name, cover.artist, cover.album].some(s => typeof s !== 'string' || !s.trim() || s.length > 1000) ||
        typeof cover.fallback !== 'boolean' || !Number.isSafeInteger(cover.scanned) ||
        !Number.isSafeInteger(cover.total) || cover.scanned < 0 || cover.total < cover.scanned) {
      throw new Error('Invalid personal cover.');
    }
    let image, url;
    try { image = new URL(cover.image); url = new URL(cover.url); } catch { throw new Error('Invalid personal cover.'); }
    if (image.protocol !== 'https:' || image.hostname !== 'lastfm-img.freetls.fastly.net' ||
        url.origin !== 'https://www.last.fm' || !url.pathname.startsWith('/music/') ||
        image.href.length > 2000 || url.href.length > 3000) throw new Error('Invalid personal cover.');
    return { key: JSON.stringify([R.normalize(username), R.normalize(item.artist), R.normalize(item.name)]),
      username, item: { artist: item.artist, name: item.name },
      cover: { artist: cover.artist, album: cover.album, image: image.href, url: url.href,
        fallback: cover.fallback, scanned: cover.scanned, total: cover.total }, checkedAt: Date.now() };
  }
  async function execute(message, sender) {
    const stored = await chrome.storage.local.get(null);
    const current = snapshot(stored);
    authorize(sender, message.action, current);
    if (message.action === 'read') return current;
    if (message.action === 'artwork-read') {
      return (Array.isArray(stored[ARTWORK]) ? stored[ARTWORK] : []).filter(record => {
        try { return R.normalize(record.username) === R.normalize(current.settings.username) &&
          Number.isFinite(record.checkedAt) && artworkRecord(record.item, record.cover, record.username).key === record.key; }
        catch { return false; }
      });
    }
    if (message.action === 'artwork-put') {
      const record = artworkRecord(message.item, message.cover, current.settings.username);
      const records = Array.isArray(stored[ARTWORK]) ? stored[ARTWORK] : [];
      // A bounded, disposable cache has its own key; preference and undo data are untouched.
      const next = [record, ...records.filter(r => r?.key !== record.key)].slice(0, 1000);
      // Bound serialized size as well as record count for unusually long titles.
      while (next.length > 1 && JSON.stringify(next).length > 500000) next.pop();
      await chrome.storage.local.set({ [ARTWORK]: next });
      return record;
    }
    if (message.action === 'itunes-status') return { batch: batchSummary(journal(stored)) };
    if (message.action === 'itunes-apply') return applyItunes(stored, current, message);
    if (message.action === 'itunes-revert') return revertItunes(stored, current, message);
    if (message.action === 'backup') {
      const extraStorage = Object.fromEntries(Object.entries(stored).filter(([key]) => !['rules', 'settings'].includes(key)));
      // Preserve the complete original rules if malformed legacy data exists;
      // an import must report it rather than exporting an already filtered copy.
      return { version: 1, rules: stored.rules ?? current.rules, settings: current.settings, extraStorage };
    }
    if (message.action === 'mutate') {
      // Mutations must not silently discard malformed existing rules either.
      const rules = stored.rules == null ? R.empty() : validateRules(stored.rules);
      applyOperations(rules, message.operations);
      await chrome.storage.local.set({ rules, ...touchJournal(stored, message.operations) });
      return { ...current, rules };
    }
    if (message.action === 'settings') {
      if (!object(message.patch) || Object.keys(message.patch).some(key => !owns(defaults, key))) {
        throw new Error('Invalid preference settings.');
      }
      const next = validSettings({ ...current.settings, ...message.patch });
      await chrome.storage.local.set({ settings: { ...(stored.settings || {}), ...next } });
      return { ...current, settings: next };
    }
    if (message.action === 'replace') {
      const imported = validateBackup(message.backup);
      if (!object(message.expectedSnapshot) || !equal(current, message.expectedSnapshot)) {
        throw new Error('Preferences changed while you were choosing the backup. Review the current list and try importing again.');
      }
      // Retain current unrecognized keys. Restore extra keys only when absent;
      // replacing display preferences must never overwrite a newer scan draft.
      const extras = Object.fromEntries(Object.entries(imported.extra).filter(([key]) => key !== UNDO && !owns(stored, key)));
      // A whole-backup restore establishes a new baseline, not an XML import.
      // Never revive an old undo action from that backup or the replaced state.
      await chrome.storage.local.set({ ...extras, [UNDO]: null, rules: imported.rules,
        settings: { ...(stored.settings || {}), ...imported.settings } });
      return { rules: imported.rules, settings: imported.settings };
    }
    throw new Error('Unknown preference request.');
  }

  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.channel !== 'lastfm-store-v1') return false;
    const pending = queue.then(() => execute(message, sender));
    queue = pending.catch(() => {});
    pending.then(value => respond({ ok: true, value }), error => respond({ ok: false, error: error.message }));
    return true;
  });
})();
