(() => {
  'use strict';
  const R = globalThis.LastfmRules;
  const S = globalThis.LastfmStore;
  const $ = id => document.getElementById(id);
  const labels = { artists: 'Artist', albums: 'Album', tracks: 'Track', albumArtists: 'Album artist' };
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const count = rules => R.TYPES.reduce((sum, type) => sum + Object.keys(rules[type] || {}).length, 0);
  let snapshot = { rules: R.empty(), settings: S.DEFAULT_SETTINGS };
  let editing = null, deleted = null, pendingImport = null;
  let settingsDirty = false, saving = false;

  function message(text, error = false) {
    $('message').textContent = text;
    $('message').dataset.tone = error ? 'error' : 'success';
  }
  function button(text, action, className = '') {
    const node = document.createElement('button');
    node.type = 'button'; node.textContent = text; node.className = className;
    node.addEventListener('click', action);
    return node;
  }
  function cell(row, value) {
    const node = row.insertCell(); node.textContent = value; return node;
  }
  function redraw(focusEdit = false) {
    const body = $('rules');
    const hadFocus = document.activeElement?.id === 'preferred-edit';
    const selection = hadFocus ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    body.replaceChildren();
    const query = R.normalize($('search').value), filter = $('type-filter').value;
    const rows = [];
    for (const type of R.TYPES) {
      for (const [id, rule] of Object.entries(snapshot.rules[type])) rows.push({ type, id, rule });
    }
    // Keep a dirty edit visible even if the preference was removed in another tab.
    if (editing && !snapshot.rules[editing.type][editing.id]) rows.push({ ...editing, rule: editing.original });
    let shown = 0;
    for (const { type, id, rule } of rows) {
      const active = editing?.id === id && editing?.type === type;
      if (!active && ((filter && type !== filter) ||
          (query && ![labels[type], rule.from, rule.to, rule.artist || ''].some(value => R.normalize(value).includes(query))))) continue;
      shown++;
      const row = document.createElement('tr');
      cell(row, labels[type]); cell(row, rule.from);
      const preferred = cell(row, rule.to);
      cell(row, rule.artist || '—');
      const actions = cell(row, ''); actions.className = 'row-actions';
      if (active) {
        row.className = 'editing';
        preferred.replaceChildren();
        const input = document.createElement('input');
        input.id = 'preferred-edit'; input.type = 'text'; input.maxLength = 500;
        input.value = editing.value; input.setAttribute('aria-label', 'Preferred name for ' + editing.original.from);
        input.addEventListener('input', () => { editing.value = input.value; });
        const conflict = !same(snapshot.rules[type][id], editing.original);
        const save = button('Save', saveEdit, 'primary'); save.disabled = conflict || saving;
        const cancel = button('Cancel', () => { editing = null; redraw(); message('Edit cancelled.'); });
        input.addEventListener('keydown', event => {
          if (event.key === 'Enter') { event.preventDefault(); save.click(); }
          if (event.key === 'Escape') cancel.click();
        });
        preferred.append(input); actions.append(save, cancel);
        if (conflict) {
          const note = document.createElement('p'); note.className = 'conflict';
          note.textContent = 'Changed in another tab. Your draft is kept; cancel to load the latest preference.';
          preferred.append(note);
        }
      } else {
        actions.append(button('Edit', () => {
          editing = { type, id, original: structuredClone(rule), value: rule.to };
          redraw(true);
        }), button('Delete', () => removeRule(type, id, rule), 'danger'));
      }
      body.append(row);
    }
    const total = count(snapshot.rules);
    $('count').textContent = total + (total === 1 ? ' preference' : ' preferences') + (query || filter ? ' · ' + shown + ' shown' : '');
    $('empty').hidden = shown > 0;
    $('empty').textContent = total ? 'No preferences match your search.' : 'No preferences yet. Edit a display name in your Last.fm library to add one.';
    if (focusEdit || hadFocus) {
      const input = $('preferred-edit'); input?.focus();
      if (selection) input?.setSelectionRange(...selection); else if (focusEdit) input?.select();
    }
  }
  function accept(next) {
    snapshot = next;
    $('profile-status').textContent = 'Profile: ' + next.settings.username;
    if (!settingsDirty) {
      $('username').value = next.settings.username;
      $('infinite').checked = next.settings.infiniteScroll !== false;
    }
    redraw();
  }
  async function saveEdit() {
    if (!editing || saving) return;
    const { type, original, value } = editing;
    saving = true;
    try {
      const next = await S.mutate([{ op: 'put', type, from: original.from, to: value,
        artist: original.artist || '', expected: original }]);
      editing = null; accept(next); message('Display preference saved.');
    } catch (error) { message(error.message, true); }
    finally { saving = false; redraw(); }
  }
  async function removeRule(type, id, rule) {
    try {
      const next = await S.mutate([{ op: 'delete', type, id, expected: rule }]);
      deleted = { type, id, rule };
      accept(next);
      $('undo-label').textContent = 'Deleted “' + rule.to + '”.';
      $('undo-area').hidden = false;
      message('Preference deleted. You can undo the last deletion.');
    } catch (error) { message(error.message, true); }
  }
  $('undo').addEventListener('click', async () => {
    if (!deleted) return;
    $('undo').disabled = true;
    try {
      const next = await S.mutate([{ op: 'restore', ...deleted, expected: null }]);
      deleted = null; $('undo-area').hidden = true; accept(next);
      message('Preference restored.');
    } catch (error) { message(error.message, true); }
    finally { $('undo').disabled = false; }
  });
  $('search').addEventListener('input', () => redraw());
  $('type-filter').addEventListener('change', () => redraw());
  $('settings-form').addEventListener('input', () => {
    settingsDirty = true; $('settings-note').textContent = 'Unsaved changes';
  });
  $('settings-form').addEventListener('submit', async event => {
    event.preventDefault();
    const username = $('username').value.trim();
    if (!/^[^/\s?#]+$/.test(username)) return message('Enter a valid Last.fm username.', true);
    $('save-settings').disabled = true;
    try {
      const next = await S.saveSettings({ username, infiniteScroll: $('infinite').checked });
      settingsDirty = false; accept(next); $('settings-note').textContent = '';
      message('Settings saved. Your open Last.fm pages will update.');
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
  $('import-preview').addEventListener('close', () => { pendingImport = null; });
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
      editing = null; deleted = null; settingsDirty = false;
      $('undo-area').hidden = true; $('settings-note').textContent = '';
      accept(next); $('import-preview').close(); message('Backup imported.');
    } catch (error) {
      $('import-preview').close();
      message(error.message + ' Choose the backup again to review the latest state.', true);
    } finally { $('confirm-import').disabled = false; }
  });
  S.subscribe(accept);
  S.read().then(accept).catch(error => message(error.message, true));
})();
