(() => {
  'use strict';
  const views = {artists:'Artists',albums:'Albums',tracks:'Tracks',scrobbles:'Scrobbles',artistAlbums:'Artist albums',artistScrobbles:'Artist scrobbles',album:'Album tracks',track:'Track history',profile:'Profile'};
  // No tabs permission or stored page content: ask content scripts for status only.
  async function tabs(username) {
    if (!username) return [];
    const tabs = await chrome.tabs.query({currentWindow:true});
    const results = await Promise.all(tabs.map(async tab => {
      try {
        const status = await chrome.tabs.sendMessage(tab.id, {type:'lfm:status'});
        if (!status?.ownProfile || status.username?.toLowerCase() !== username.toLowerCase()) return null;
        return {id:tab.id,active:tab.active,status,label:(views[status.view] || 'Your profile') + ' · ' + username};
      } catch (_) { return null; }
    }));
    return results.filter(Boolean).sort((a,b) => Number(b.active) - Number(a.active));
  }
  globalThis.LastfmPopupStatus = Object.freeze({tabs});
})();
