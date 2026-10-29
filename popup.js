(() => {
  'use strict';
  const S = LastfmStore, $ = id => document.getElementById(id);
  let snapshot, status = null, generation = 0, saving = false;
  function message(text, error = false) {
    $('message').textContent = text; $('message').dataset.tone = error ? 'error' : 'success';
  }
  function render(next) {
    snapshot = next;
    const username = next.settings.username;
    $('profile').textContent = username || 'Not connected';
    $('profile-link').href = username ? 'https://www.last.fm/user/' + encodeURIComponent(username) : 'options.html';
    $('infinite-scroll').value = String(next.settings.infiniteScroll !== false);
    $('infinite-scroll').disabled = saving || !username;
    const avatar = $('profile-avatar');
    let source = '';
    try {
      const url = new URL(status?.avatar);
      if (status.username?.toLowerCase() === username.toLowerCase() && url.protocol === 'https:' &&
          url.hostname === 'lastfm-img.freetls.fastly.net') source = url.href;
    } catch (_) { /* A closed or older Last.fm tab has no verified avatar. */ }
    avatar.hidden = !source;
    if (source) avatar.src = source; else avatar.removeAttribute('src');
  }
  async function refreshStatus() {
    const current = ++generation;
    const tabs = await LastfmPopupStatus.tabs(snapshot?.settings.username);
    if (current !== generation) return;
    status = tabs[0]?.status || null;
    if (snapshot) render(snapshot);
  }
  $('profile-avatar').addEventListener('error', () => { $('profile-avatar').hidden = true; });
  $('options').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('infinite-scroll').addEventListener('change', async () => {
    if (saving) return;
    saving = true; $('infinite-scroll').disabled = true;
    try {
      render(await S.saveSettings({infiniteScroll:$('infinite-scroll').value === 'true'}));
      message('');
    } catch (error) { message(error.message, true); }
    finally { saving = false; render(snapshot); }
  });
  $('diagnostics').addEventListener('click', async () => {
    try {
      const latest = await S.read();
      await refreshStatus();
      const diagnostics = {
        extension:'Last.fm Personal Library',version:chrome.runtime.getManifest().version,
        configuredProfile:latest.settings.username,
        preferences:Object.fromEntries(Object.entries(latest.rules).map(([type, group]) => [type,Object.keys(group).length])),
        scrollingEnabled:latest.settings.infiniteScroll !== false,
        page:status ? {connected:true,ownProfile:!!status.ownProfile,view:String(status.view || 'unknown'),
          scrollState:String(status.scrollState || 'unknown'),rateLimited:!!status.rateLimited,
          contentVersion:String(status.version || 'unknown'),artwork:status.artwork || null,
          redirects:status.redirects || null,imageRecovery:status.imageRecovery || null} : {connected:false}
      };
      await navigator.clipboard.writeText(JSON.stringify(diagnostics,null,2));
      message('Diagnostics copied. They contain status and counts only.');
    } catch (error) { message('Could not copy diagnostics: ' + error.message,true); }
  });
  S.subscribe(next => { render(next); void refreshStatus().catch(() => {}); });
  S.read().then(next => { render(next); return refreshStatus(); }).catch(error => message(error.message,true));
})();
