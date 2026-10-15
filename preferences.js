(() => {
  'use strict';
  const R = globalThis.LastfmRules, S = globalThis.LastfmStore;
  const $ = id => document.getElementById(id);
  const groups = ['artists', 'albums', 'tracks'];
  const labels = { artists: 'Artist', albums: 'Album', tracks: 'Song', albumArtists: 'Album artist' };
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const groupFor = type => type === 'albumArtists' ? 'artists' : type;
  const same = (a, b) => a === b || !!a && !!b &&
    a.from === b.from && a.to === b.to && a.artist === b.artist && a.exact === b.exact;
  const tie = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  let snapshot = { rules: R.empty(), settings: S.DEFAULT_SETTINGS };
  let editing = null, deleted = null, saving = false;

  function message(text, error = false) {
    $('message').textContent = text;
    $('message').dataset.tone = error ? 'error' : 'success';
  }
  function button(text, action, className = '') {
    const node = document.createElement('button');
    node.type = 'button'; node.textContent = text; node.className = className;
    node.disabled = saving;
    node.addEventListener('click', action); return node;
  }
  function cell(row, value) { const node = row.insertCell(); node.textContent = value; return node; }
  function focusRule(type, id, action = 'Edit') {
    const row = [...document.querySelectorAll('#rules tbody tr')].find(node => node.dataset.type === type && node.dataset.id === id);
    const control = row && [...row.querySelectorAll('button')].find(node => node.textContent === action && !node.disabled);
    (control || $('search')).focus();
  }
  function sortRows(a, b) {
    const aGroup = groupFor(a.type), bGroup = groupFor(b.type);
    return groups.indexOf(aGroup) - groups.indexOf(bGroup) ||
      (aGroup === 'artists' ? 0 : collator.compare(a.rule.artist || '', b.rule.artist || '')) ||
      collator.compare(a.rule.to, b.rule.to) || tie(a.rule.from, b.rule.from) ||
      tie(a.rule.artist || '', b.rule.artist || '') || tie(a.type, b.type) || tie(a.id, b.id);
  }
  function editCell(preferred, actions, type, id) {
    preferred.replaceChildren();
    const input = document.createElement('input');
    input.id = 'preferred-edit'; input.type = 'text'; input.maxLength = 500;
    input.disabled = saving;
    input.value = editing.value; input.setAttribute('aria-label', 'Preferred name for ' + editing.original.from);
    input.addEventListener('input', () => { editing.value = input.value; });
    const conflict = !same(snapshot.rules[type][id], editing.original);
    const save = button('Save', saveEdit, 'primary'); save.disabled = conflict || saving;
    const cancel = button('Cancel', () => { editing = null; redraw(); focusRule(type, id); message('Edit cancelled.'); });
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
  }
  function redraw(focusEdit = false) {
    const hadFocus = document.activeElement?.id === 'preferred-edit';
    const selection = hadFocus ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    const focusedRow = document.activeElement?.closest('#rules tr');
    const action = focusedRow && document.activeElement.tagName === 'BUTTON'
      ? { ...focusedRow.dataset, name: document.activeElement.textContent } : null;
    for (const group of groups) $('rules-' + group).replaceChildren();
    const query = R.normalize($('search').value), filter = $('type-filter').value;
    const rows = [], totals = { artists: 0, albums: 0, tracks: 0 }, shown = { ...totals };
    for (const type of R.TYPES) {
      for (const [id, rule] of Object.entries(snapshot.rules[type])) {
        rows.push({ type, id, rule }); totals[groupFor(type)]++;
      }
    }
    // Keep a dirty edit visible if another tab removed its preference.
    if (editing && !snapshot.rules[editing.type][editing.id]) rows.push({ ...editing, rule: editing.original });
    rows.sort(sortRows);
    for (const { type, id, rule } of rows) {
      const group = groupFor(type), active = editing?.id === id && editing?.type === type;
      if (!active && ((filter && group !== filter) || (query &&
          ![labels[type], type === 'tracks' ? 'track' : '', rule.from, rule.to, rule.artist || ''].some(value => R.normalize(value).includes(query))))) continue;
      shown[group]++;
      const row = document.createElement('tr'); row.dataset.type = type; row.dataset.id = id;
      cell(row, labels[type]); cell(row, rule.from);
      const preferred = cell(row, rule.to);
      cell(row, rule.artist || '—');
      const actions = cell(row, ''); actions.className = 'row-actions';
      if (active) { row.className = 'editing'; editCell(preferred, actions, type, id); }
      else actions.append(button('Edit', () => {
        editing = { type, id, original: structuredClone(rule), value: rule.to }; redraw(true);
      }), button('Delete', () => removeRule(type, id, rule), 'danger'));
      $('rules-' + group).append(row);
    }
    for (const group of groups) {
      $('group-' + group).hidden = shown[group] === 0;
      $('count-' + group).textContent = shown[group].toLocaleString() + ' shown · ' + totals[group].toLocaleString() + ' total';
    }
    const total = Object.values(totals).reduce((sum, n) => sum + n, 0);
    const visible = Object.values(shown).reduce((sum, n) => sum + n, 0);
    $('count').textContent = total.toLocaleString() + (total === 1 ? ' preference' : ' preferences') + ' · ' + visible.toLocaleString() + ' shown';
    $('empty').hidden = visible > 0;
    $('empty').textContent = total ? 'No preferences match your search.' : 'No preferences yet. Edit a display name in your Last.fm library to add one.';
    $('undo').disabled = saving || !deleted;
    if (focusEdit || hadFocus) {
      const input = $('preferred-edit'); input?.focus();
      if (selection) input?.setSelectionRange(...selection); else if (focusEdit) input?.select();
    } else if (action && !saving) focusRule(action.type, action.id, action.name);
  }
  function accept(next) {
    snapshot = next; $('profile-status').textContent = 'Profile: ' + next.settings.username; redraw();
  }
  async function saveEdit() {
    if (!editing || saving) return;
    const { type, id, original, value } = editing;
    const returnFocus = !!document.activeElement?.closest('#rules tr');
    saving = true; redraw();
    try {
      const next = await S.mutate([{ op: 'put', type, from: original.from, to: value,
        artist: original.artist || '', expected: original }]);
      editing = null; accept(next); message('Display preference saved.');
    } catch (error) { message(error.message, true); }
    finally {
      saving = false; redraw();
      if (returnFocus && document.activeElement === document.body) {
        if (editing) $('preferred-edit')?.focus(); else focusRule(type, id);
      }
    }
  }
  async function removeRule(type, id, rule) {
    if (saving) return;
    const returnFocus = !!document.activeElement?.closest('#rules tr');
    let removed = false;
    saving = true; redraw();
    try {
      const next = await S.mutate([{ op: 'delete', type, id, expected: rule }]);
      deleted = { type, id, rule }; removed = true; accept(next);
      $('undo-label').textContent = 'Deleted “' + rule.to + '”.'; $('undo-area').hidden = false;
      message('Preference deleted. You can undo the last deletion.');
    } catch (error) { message(error.message, true); }
    finally {
      saving = false; redraw();
      if (returnFocus && document.activeElement === document.body) {
        if (removed) $('undo').focus(); else focusRule(type, id, 'Delete');
      }
    }
  }
  $('undo').addEventListener('click', async () => {
    if (!deleted || saving) return;
    const target = deleted, returnFocus = document.activeElement === $('undo');
    saving = true; redraw();
    try {
      const next = await S.mutate([{ op: 'restore', ...target, expected: null }]);
      deleted = null; $('undo-area').hidden = true; accept(next); message('Preference restored.');
    } catch (error) { message(error.message, true); }
    finally {
      saving = false; redraw();
      if (returnFocus && document.activeElement === document.body) focusRule(target.type, target.id);
    }
  });
  $('search').addEventListener('input', () => redraw());
  $('type-filter').addEventListener('change', () => redraw());
  S.subscribe(accept);
  S.read().then(accept).catch(error => message(error.message, true));
})();
