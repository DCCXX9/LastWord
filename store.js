(() => {
  'use strict';
  if (globalThis.LastfmStore) return;

  const DEFAULT_SETTINGS = Object.freeze({ username: 'DCCXX', infiniteScroll: true });
  const channel = 'lastfm-store-v1';

  async function request(action, values = {}) {
    const response = await chrome.runtime.sendMessage({ channel, action, ...values });
    if (!response?.ok) throw new Error(response?.error || 'Preferences are unavailable. Reload the extension and refresh this page.');
    return response.value;
  }

  function subscribe(callback) {
    let active = true;
    let generation = 0;
    const listener = (changes, area) => {
      if (area !== 'local' || (!changes.rules && !changes.settings)) return;
      const current = ++generation;
      request('read').then(snapshot => {
        if (active && current === generation) callback(snapshot);
      }).catch(error => console.error('Last.fm Personal Library preferences:', error));
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(listener);
    };
  }

  globalThis.LastfmStore = Object.freeze({
    DEFAULT_SETTINGS,
    read: () => request('read'),
    readArtwork: () => request('artwork-read'),
    saveArtwork: (item, cover) => request('artwork-put', { item, cover }),
    albumless: (username, op, values = {}) => request('albumless', { username, op, ...values }),
    subscribe,
    mutate: operations => request('mutate', { operations }),
    saveSettings: patch => request('settings', { patch }),
    replace: (backup, expectedSnapshot) => request('replace', { backup, expectedSnapshot }),
    backup: () => request('backup'),
    itunesStatus: () => request('itunes-status'),
    applyItunes: values => request('itunes-apply', values),
    revertItunes: values => request('itunes-revert', values)
  });
})();
