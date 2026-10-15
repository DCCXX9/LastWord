(() => {
  'use strict';
  const R = globalThis.LastfmRules;
  const S = globalThis.LastfmStore;
  const $ = id => document.getElementById(id);
  const labels = { artists: 'Artist', albums: 'Album', tracks: 'Track', albumArtists: 'Album artist' };
  const count = rules => R.TYPES.reduce((sum, type) => sum + Object.keys(rules[type] || {}).length, 0);
  let snapshot = { rules: R.empty(), settings: S.DEFAULT_SETTINGS };
  let pendingImport = null;
  let settingsDirty = false;
  let settingsRevision = 0;

  function message(text, error = false) {
    $('message').textContent = text;
    $('message').dataset.tone = error ? 'error' : 'success';
  }
  function accept(next) {
    snapshot = next;
    $('profile-status').textContent = 'Profile: ' + next.settings.username;
    const total = count(next.rules);
    $('count').textContent = total.toLocaleString() + (total === 1 ? ' preference' : ' preferences');
    if (!settingsDirty) {
      $('username').value = next.settings.username;
      $('infinite').checked = next.settings.infiniteScroll !== false;
    }
  }
  $('settings-form').addEventListener('input', () => {
    settingsRevision++;
    settingsDirty = true; $('settings-note').textContent = 'Unsaved changes';
  });
  $('settings-form').addEventListener('submit', async event => {
    event.preventDefault();
    if ($('save-settings').disabled) return;
    const username = $('username').value.trim();
    if (!/^[^/\s?#]+$/.test(username)) return message('Enter a valid Last.fm username.', true);
    const revision = settingsRevision;
    $('save-settings').disabled = true;
    try {
      const next = await S.saveSettings({ username, infiniteScroll: $('infinite').checked });
      settingsDirty = settingsRevision !== revision;
      accept(next); $('settings-note').textContent = settingsDirty ? 'Unsaved changes' : '';
      message(settingsDirty ? 'Settings saved. Your newer changes are still unsaved.'
        : 'Settings saved. Your open Last.fm pages will update.');
    } catch (error) { message(error.message, true); }
    finally { $('save-settings').disabled = false; }
  });
  async function exportBackup() {
    try {
      const data = await S.backup();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url;
      link.download = 'lastfm-personal-library-' + new Date().toISOString().slice(0, 10) + '.json';
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      message('JSON backup prepared for download.');
    } catch (error) { message(error.message, true); }
  }
  $('export').addEventListener('click', exportBackup);
  $('preview-export').addEventListener('click', exportBackup);
  $('import').addEventListener('click', () => $('import-file').click());
  $('cancel-import').addEventListener('click', () => $('import-preview').close());
  $('import-preview').addEventListener('close', () => {
    // A queued close event can arrive after a new file has reopened the dialog.
    if (!$('import-preview').open) pendingImport = null;
  });
  $('import-file').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Backup is larger than 10 MB.');
      const data = JSON.parse(await file.text());
      if (data.version !== 1 || !data.rules || typeof data.settings?.username !== 'string' ||
          !/^[^/\s?#]+$/.test(data.settings.username)) throw new Error('This is not a valid Personal Library backup.');
      const cleaned = R.clean(data.rules);
      for (const type of R.TYPES) {
        if (data.rules[type] && (Array.isArray(data.rules[type]) || typeof data.rules[type] !== 'object' ||
            Object.keys(data.rules[type]).length !== Object.keys(cleaned[type]).length)) {
          throw new Error('This backup contains invalid preferences. Nothing was imported.');
        }
      }
      const expected = await S.read();
      pendingImport = { data, expected };
      $('import-summary').textContent = count(cleaned) + ' display preferences for ' + data.settings.username + '.';
      $('import-details').textContent = R.TYPES.map(type => Object.keys(cleaned[type]).length + ' ' + labels[type].toLowerCase() + ' preferences').join(' · ');
      $('import-preview').showModal(); $('cancel-import').focus();
    } catch (error) { message(error.message, true); }
    finally { event.target.value = ''; }
  });
  $('confirm-import').addEventListener('click', async () => {
    if (!pendingImport) return;
    $('confirm-import').disabled = true;
    try {
      const next = await S.replace(pendingImport.data, pendingImport.expected);
      settingsDirty = false; $('settings-note').textContent = '';
      accept(next); $('import-preview').close(); message('Backup imported.');
    } catch (error) {
      $('import-preview').close();
      message(error.message + ' Choose the backup again to review the latest state.', true);
    } finally { $('confirm-import').disabled = false; }
  });
  S.subscribe(accept);
  S.read().then(accept).catch(error => message(error.message, true));
})();
