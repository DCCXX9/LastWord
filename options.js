(() => {
  'use strict';
  const R = globalThis.LastfmRules;
  const $ = id => document.getElementById(id);
  let rules = R.empty();
  let settings = { username: 'DCCXX', infiniteScroll: true };

  function message(value) { $('message').textContent = value; }
  function redraw() {
    const body = $('rules');
    body.replaceChildren();
    let count = 0;
    let shown = 0;
    const query = R.normalize($('search').value);
    for (const type of R.TYPES) {
      for (const [id, rule] of Object.entries(rules[type])) {
        count++;
        if (query && ![type, rule.from, rule.to, rule.artist || '']
          .some(value => R.normalize(value).includes(query))) continue;
        shown++;
        const row = document.createElement('tr');
        for (const value of [type, rule.from, rule.to, rule.artist || '']) {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.append(cell);
        }
        const action = document.createElement('td');
        action.className = 'row-actions';
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.textContent = 'Edit';
        edit.addEventListener('click', () => {
          action.replaceChildren();
          const input = document.createElement('input');
          input.type = 'text';
          input.value = rule.to;
          input.setAttribute('aria-label', 'Preferred name for ' + rule.from);
          const save = document.createElement('button');
          save.type = 'button';
          save.textContent = 'Save';
          save.addEventListener('click', async () => {
            try {
              R.put(rules, type, rule.from, input.value, rule.artist || '');
              await chrome.storage.local.set({ rules });
              redraw();
              message('Preference saved.');
            } catch (error) { message(error.message); }
          });
          const cancel = document.createElement('button');
          cancel.type = 'button';
          cancel.textContent = 'Cancel';
          cancel.addEventListener('click', redraw);
          input.addEventListener('keydown', event => {
            if (event.key === 'Enter') save.click();
            if (event.key === 'Escape') redraw();
          });
          action.append(input, save, cancel);
          input.focus();
          input.select();
        });
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Delete';
        button.addEventListener('click', async () => {
          delete rules[type][id];
          await chrome.storage.local.set({ rules });
          redraw();
          message('Rule deleted.');
        });
        action.append(edit, button);
        row.append(action);
        body.append(row);
      }
    }
    $('count').textContent = count + (count === 1 ? ' rule' : ' rules') +
      (query ? ` · ${shown} shown` : '');
  }

  $('search').addEventListener('input', redraw);

  async function init() {
    const stored = await chrome.storage.local.get(['rules', 'settings']);
    rules = R.clean(stored.rules);
    settings = { ...settings, ...(stored.settings || {}) };
    $('username').value = settings.username;
    $('infinite').checked = settings.infiniteScroll !== false;
    redraw();
  }

  $('save-settings').addEventListener('click', async () => {
    const username = $('username').value.trim();
    if (!/^[^\/\s?#]+$/.test(username)) {
      message('Enter a valid Last.fm username.');
      return;
    }
    settings = { username, infiniteScroll: $('infinite').checked };
    await chrome.storage.local.set({ settings });
    message('Settings saved. Refresh Last.fm to apply them.');
  });

  $('export').addEventListener('click', () => {
    const data = JSON.stringify({ version: 1, settings, rules }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lastfm-personal-library-backup.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $('import').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Backup is too large.');
      const data = JSON.parse(await file.text());
      if (data.version !== 1 || !data.rules ||
          typeof data.settings?.username !== 'string') {
        throw new Error('This is not a valid backup.');
      }
      if (!confirm('Replace your current display preferences with this backup?')) return;
      rules = R.clean(data.rules);
      settings = {
        username: data.settings.username,
        infiniteScroll: data.settings.infiniteScroll !== false
      };
      await chrome.storage.local.set({ rules, settings });
      $('username').value = settings.username;
      $('infinite').checked = settings.infiniteScroll;
      redraw();
      message('Backup imported.');
    } catch (error) {
      message(error.message);
    } finally {
      event.target.value = '';
    }
  });

  init().catch(error => message(error.message));
})();
