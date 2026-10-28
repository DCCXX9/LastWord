(() => {
  'use strict';
  let tabId, running = false;
  async function scan(username, { signal, onProgress } = {}) {
    if (running) throw new Error('A comparison is already running.');
    running = true;
    const cancel = () => { if (tabId !== undefined) void chrome.tabs.sendMessage(tabId, { type: 'lfm:library-cancel' }).catch(() => {}); };
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      let cache = await LastfmStore.cacheLibrary('read');
      if (LastfmLibraryCache.status(cache)?.complete) return cache;
      for (const tab of await chrome.tabs.query({})) {
        try {
          const status = await chrome.tabs.sendMessage(tab.id, { type: 'lfm:status' });
          if (status?.ownProfile && status.username === username) { tabId = tab.id; break; }
        } catch { /* Unrelated tab, without a content script. */ }
      }
      if (tabId === undefined) throw new Error('Open your connected Last.fm profile in another tab, then resume.');
      let progress = cache ? LastfmLibraryCache.status(cache) : await LastfmStore.cacheLibrary('start', { username });
      while (!progress.complete) {
        if (signal?.aborted) throw new DOMException('Comparison paused.', 'AbortError');
        const group = LastfmLibraryCache.TYPES.find(type => !progress.groups[type].done), page = progress.groups[group].page;
        onProgress?.({ ...progress, group, page });
        const response = await chrome.tabs.sendMessage(tabId, { type: 'lfm:library-page', username, id: progress.id, group, page });
        if (!response?.ok) throw new Error(response?.error || 'Refresh your Last.fm tab, then resume.');
        progress = response.value;
      }
      return await LastfmStore.cacheLibrary('read');
    } finally { running = false; tabId = undefined; signal?.removeEventListener('abort', cancel); }
  }
  globalThis.LastfmLibraryCacheClient = Object.freeze({ scan });
})();
