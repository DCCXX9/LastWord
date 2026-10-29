(() => {
  'use strict';
  const S = LastfmStore, $ = id => document.getElementById(id);
  let snapshot, status = null, refreshingArtwork = false, confirmingRefresh = false;
  const views = { artists: 'Artists', albums: 'Albums', tracks: 'Tracks', scrobbles: 'Scrobbles',
    artistAlbums: 'Artist albums', artistScrobbles: 'Artist scrobbles', album: 'Album tracks', track: 'Track history', profile: 'Profile' };
  const scrollLabels = { prompt: 'Waiting for your choice', declined: 'Paused for this view', ready: 'Ready', loading: 'Loading', paused: 'Paused', complete: 'All pages loaded', error: 'Paused after an error', off: 'Off', unavailable: 'Unavailable' };
  function message(text, error = false) {
    $('artwork-message').textContent = text; $('artwork-message').dataset.tone = error ? 'error' : 'success';
  }
  function render(next) {
    snapshot = next;
    $('profile').textContent = next.settings.username || 'Not connected';
    $('refresh-artwork').disabled = refreshingArtwork || !status?.ownProfile ||
      status.username?.toLowerCase() !== next.settings.username.toLowerCase() ||
      !status.artwork?.cacheReady || status.artwork?.refreshing || !status.artwork?.refreshableTracks;
    $('scroll').textContent = next.settings.infiniteScroll === false ? 'Off' :
      status?.ownProfile ? (scrollLabels[status.scrollState] || 'On') : 'On for your library';
    $('status-dot').dataset.state = '';
    if (!next.settings.username) {
      $('active-status').textContent = 'Connect your profile';
      $('page-detail').textContent = 'Enter your Last.fm username in Settings to get started. Your password is not needed.';
    } else if (!status) {
      $('active-status').textContent = 'Waiting for your library';
      $('page-detail').textContent = 'Open your Last.fm profile. If it is already open, refresh that tab after reloading the extension.';
    } else if (status.rateLimited) {
      $('status-dot').dataset.state = 'warning';
      $('active-status').textContent = 'Requests paused';
      $('page-detail').textContent = 'Last.fm asked for a break. ' + (status.pausedUntil
        ? 'Requests resume automatically at ' + new Date(status.pausedUntil).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '.'
        : 'Requests resume automatically shortly.') + ' Covers show Last.fm’s own image until then.';
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
      const tabs = await LastfmPopupStatus.tabs(snapshot?.settings.username);
      const selected = tabs.find(tab => String(tab.id) === $('artwork-tab').value) || tabs[0];
      $('artwork-tab').replaceChildren(...tabs.map(tab => new Option(tab.label, String(tab.id))));
      if (selected) { $('artwork-tab').value = String(selected.id); status = selected.status; }
      $('artwork-tab').disabled = !tabs.length;
    } catch (_) { /* No content script in the current tab; show the refresh guidance. */ }
    if (snapshot) render(snapshot);
  }
  $('artwork-tab').addEventListener('change', () => {
    confirmingRefresh = false; $('refresh-artwork').textContent = 'Refresh artwork';
    message(''); void refreshStatus();
  });
  $('refresh-artwork').addEventListener('click', async () => {
    if (refreshingArtwork) return;
    // Removed covers are not looked up again by default, so ask once first.
    if (!confirmingRefresh) {
      confirmingRefresh = true; $('refresh-artwork').textContent = 'Remove saved covers';
      message('Saved covers for tracks on this page will be removed and Last.fm’s own images shown instead. Click again to confirm.');
      return;
    }
    confirmingRefresh = false;
    refreshingArtwork = true; $('refresh-artwork').disabled = true;
    $('refresh-artwork').textContent = 'Refreshing artwork…';
    try {
      const tab = { id: Number($('artwork-tab').value) };
      if (!$('artwork-tab').value) throw new Error('Open your Last.fm library first.');
      const result = await chrome.tabs.sendMessage(tab.id, { type: 'lfm:refresh-artwork' });
      if (!result?.ok) throw new Error(result?.error || 'Refresh this Last.fm tab and try again.');
      message('Saved artwork refreshed for this page. Reloading…');
    } catch (error) { message('Could not refresh artwork: ' + error.message, true); }
    finally {
      refreshingArtwork = false; $('refresh-artwork').textContent = 'Refresh artwork';
      await refreshStatus();
    }
  });
  S.subscribe(next => { render(next); void refreshStatus(); });
  S.read().then(next => { render(next); return refreshStatus(); }).catch(error => message(error.message, true));
})();
