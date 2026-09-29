(() => {
  'use strict';
  const S = globalThis.LastfmStore;
  const $ = id => document.getElementById(id);
  let snapshot, status = null;
  const views = { artists: 'Artists', albums: 'Albums', tracks: 'Tracks', scrobbles: 'Scrobbles',
    artistAlbums: 'Artist albums', artistScrobbles: 'Artist scrobbles', album: 'Album tracks', track: 'Track history', profile: 'Profile' };
  const scrollLabels = { ready: 'Ready', loading: 'Loading', paused: 'Paused', complete: 'All pages loaded', error: 'Paused after an error', off: 'Off', unavailable: 'Unavailable' };
  function message(text, error = false) {
    $('message').textContent = text; $('message').dataset.tone = error ? 'error' : 'success';
  }
  function render(next) {
    snapshot = next;
    const count = Object.values(next.rules).reduce((n, group) => n + Object.keys(group).length, 0);
    $('profile').textContent = next.settings.username;
    $('count').textContent = String(count);
    $('scroll').textContent = next.settings.infiniteScroll === false ? 'Off' :
      status?.ownProfile ? (scrollLabels[status.scrollState] || 'On') : 'On for your library';
    $('status-dot').dataset.state = '';
    if (!status) {
      $('active-status').textContent = 'Waiting for your library';
      $('page-detail').textContent = 'Open your Last.fm profile. If it is already open, refresh that tab after reloading the extension.';
    } else if (status.rateLimited) {
      $('status-dot').dataset.state = 'warning';
      $('active-status').textContent = 'Requests paused';
      $('page-detail').textContent = 'Last.fm has limited requests. Leave the site for a while before trying again.';
    } else if (!status.ownProfile || status.username?.toLowerCase() !== next.settings.username.toLowerCase()) {
      $('active-status').textContent = 'Inactive on this page';
      $('page-detail').textContent = 'Preferences apply only to the profile ' + next.settings.username + '.';
    } else {
      $('status-dot').dataset.state = 'active';
      $('active-status').textContent = 'Active on ' + next.settings.username;
      $('page-detail').textContent = (views[status.view] || 'Your profile') + ' · Display preferences are enabled.';
    }
  }
  async function refreshStatus() {
    status = null;
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id !== undefined) status = await chrome.tabs.sendMessage(tabs[0].id, { type: 'lfm:status' });
    } catch (_) { /* No content script in the current tab; show the refresh guidance. */ }
    if (snapshot) render(snapshot);
  }
  $('options').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('diagnostics').addEventListener('click', async () => {
    try {
      const latest = await S.read();
      await refreshStatus();
      const diagnostics = {
        extension: 'Last.fm Personal Library', version: chrome.runtime.getManifest().version,
        configuredProfile: latest.settings.username,
        preferences: Object.fromEntries(Object.entries(latest.rules).map(([type, group]) => [type, Object.keys(group).length])),
        scrollingEnabled: latest.settings.infiniteScroll !== false,
        page: status ? {
          connected: true, ownProfile: !!status.ownProfile,
          view: String(status.view || 'unknown'), scrollState: String(status.scrollState || 'unknown'),
          rateLimited: !!status.rateLimited, contentVersion: String(status.version || 'unknown')
        } : { connected: false }
      };
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      message('Diagnostics copied. They contain status and counts only.');
    } catch (error) { message('Could not copy diagnostics: ' + error.message, true); }
  });
  S.subscribe(next => { render(next); void refreshStatus(); });
  Promise.all([S.read().then(render), refreshStatus()]).catch(error => message(error.message, true));
})();
