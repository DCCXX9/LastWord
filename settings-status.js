(() => {
  'use strict';
  const S = LastfmStore, $ = id => document.getElementById(id);
  let snapshot, status = null, refreshingArtwork = false, confirmingRefresh = false;
  function message(text, error = false) {
    $('artwork-message').textContent = text; $('artwork-message').dataset.tone = error ? 'error' : 'success';
  }
  function render(next) {
    snapshot = next;
    $('refresh-artwork').disabled = refreshingArtwork || !status?.ownProfile ||
      status.username?.toLowerCase() !== next.settings.username.toLowerCase() ||
      !status.artwork?.cacheReady || status.artwork?.refreshing || !status.artwork?.refreshableTracks;
    $('artwork-guidance').textContent = !next.settings.username
      ? 'Connect your profile to refresh artwork.'
      : !status ? 'Open your connected Last.fm library tab. Refresh that tab if it was already open when the extension reloaded.'
      : status.rateLimited ? 'Last.fm requests are paused. Refreshing artwork keeps that pause.' : '';
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
