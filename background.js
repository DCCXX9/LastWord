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
        Object.keys(rule).some(key => !['from', 'to', 'artist'].includes(key))) {
      throw new Error('The backup contains an invalid display preference.');
    }
    const probe = R.empty();
    const generated = R.put(probe, type, rule.from, rule.to, rule.artist || '');
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
      ['/options.html', '/popup.html'].includes(url.pathname);
    if (extension) return;
    const match = url.pathname.match(/^\/user\/([^/]+)(?:\/|$)/i);
    let user = '';
    try { user = decodeURIComponent(match?.[1] || ''); } catch { /* Invalid profile URL. */ }
    const ownProfile = url.origin === 'https://www.last.fm' && !!current.settings.username &&
      R.normalize(user) === R.normalize(current.settings.username);
    if (action === 'read' && url.origin === 'https://www.last.fm') return;
    if (action === 'mutate' && ownProfile) return;
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
        R.put(rules, type, operation.from, operation.to, operation.artist || '');
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

  async function execute(message, sender) {
    const stored = await chrome.storage.local.get(null);
    const current = snapshot(stored);
    authorize(sender, message.action, current);
    if (message.action === 'read') return current;
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
      await chrome.storage.local.set({ rules });
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
      const extras = Object.fromEntries(Object.entries(imported.extra).filter(([key]) => !owns(stored, key)));
      await chrome.storage.local.set({ ...extras, rules: imported.rules,
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
