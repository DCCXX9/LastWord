(() => {
  'use strict';
  const R = globalThis.LastfmRules;
  const A = globalThis.LastfmAdapter;
  const S = globalThis.LastfmStore;
  const ERROR = /edit doesn.t contain any real changes|cannot accept casing changes/i;
  const MODAL = '.popup_content,.modal,[role="dialog"]';
  const MODAL_FORMS = '.popup_content form,.modal form,[role="dialog"] form';
  let username = '';
  let rules = R.empty();
  let lookup = null;
  let queued = false;
  const pending = new Set();
  const saving = new WeakSet();
  const own = () => A.ownProfile(location.href, username);
  const select = (root, selector) => [
    ...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)
  ];

  function manageLink() {
    const link = document.createElement('a');
    link.href = chrome.runtime.getURL('preferences.html');
    link.target = '_blank'; link.rel = 'noopener';
    link.textContent = 'Manage preferences';
    return link;
  }
  function notice(text, kind = 'error', action) {
    document.querySelector('[data-lfm-local-toast]')?.remove();
    const note = document.createElement('div');
    note.dataset.lfmLocalToast = ''; note.dataset.kind = kind;
    note.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    note.append(text);
    if (kind === 'success') note.append(manageLink());
    const dismiss = document.createElement('button');
    dismiss.type = 'button'; dismiss.textContent = action ? 'Cancel' : 'Dismiss';
    dismiss.addEventListener('click', () => { action?.(); note.remove(); });
    note.append(dismiss); document.body.append(note);
    return note;
  }
  function context() { return A.musicItem(location.href); }
  function rowItem(row) {
    const items = [...row.querySelectorAll('a[href]')].map(link => A.musicItem(link)).filter(Boolean);
    return items.find(item => item.type === 'tracks') || items.find(item => item.type === 'albums') || items[0];
  }
  function ownTrack(value) {
    const item = A.musicItem(value);
    return A.ownProfile(value, username) && item?.type === 'tracks' ? String(value) : null;
  }
  function trackUrl(item) {
    const encode = value => encodeURIComponent(value).replace(/%20/g, '+');
    return `${location.origin}/user/${encode(username)}/library/music/+noredirect/${encode(item.artist)}/_/${encode(item.name)}`;
  }
  function openForm(original, source, row) {
    document.querySelector('[data-lfm-track-edit-launcher]')?.remove();
    const form = document.importNode(original, true);
    form.dataset.lfmTrackEditLauncher = '';
    form.action = new URL(original.getAttribute('action'), source).href;
    form.hidden = true;
    let submit = form.querySelector('button:not([type]),button[type="submit"],input[type="submit"]');
    if (!submit) { submit = document.createElement('button'); submit.type = 'submit'; form.append(submit); }
    const host = row.querySelector('[data-lfm-track-action]');
    if (!row.isConnected || !host) throw new Error('The track list changed. Open its menu again.');
    host.append(form);
    const visibleForms = () => [...document.querySelectorAll(MODAL_FORMS)]
      .filter(candidate => candidate.getClientRects().length && editForm(candidate));
    const before = new Set(visibleForms());
    let opened = false;
    const checkOpened = () => { opened ||= visibleForms().some(candidate => !before.has(candidate)); };
    const observer = new MutationObserver(checkOpened);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true,
      attributeFilter: ['class', 'style', 'hidden'] });
    // Retain Last.fm's delegated submit handler. Guard against page navigation if
    // it is unavailable; this extension never submits real edits itself.
    const guard = event => { if (event.target === form) event.preventDefault(); };
    document.addEventListener('submit', guard);
    submit.click();
    document.removeEventListener('submit', guard);
    checkOpened();
    setTimeout(() => {
      observer.disconnect();
      if (own() && !opened && form.isConnected) {
        notice('Last.fm did not open its edit dialog. Open this track in your library and use its normal Edit action.');
      }
      form.remove();
    }, 8000);
  }
  async function openTrack(item, button, row) {
    lookup?.abort();
    const controller = new AbortController(); lookup = controller;
    button.disabled = true; button.textContent = 'Loading edit…';
    const loading = notice('Finding a scrobble for this track…', 'loading', () => controller.abort());
    try {
      let url = [...row.querySelectorAll('a[href]')].map(link => ownTrack(link.href)).find(Boolean) || trackUrl(item);
      let original = null;
      let source = url;
      let alternative = null;
      for (let pages = 0; url && pages < 3; pages++) {
        const result = await LastfmPages.get(url, { signal: controller.signal });
        if (!ownTrack(result.url)) throw new Error('Last.fm did not return your track history.');
        const matches = [...result.doc.querySelectorAll('form[data-edit-scrobble]')]
          .map(form => ({ form, fields: A.editRow(form, result.url, username) }))
          .filter(entry => entry.fields && R.normalize(entry.fields.artist) === R.normalize(item.artist) &&
            R.normalize(entry.fields.track) === R.normalize(item.name));
        const match = matches.find(entry => R.normalize(entry.fields.album) === R.normalize(item.album));
        if (match) { original = match.form; source = result.url; break; }
        if (!alternative && matches.length) alternative = { ...matches[0], url: result.url };
        url = A.nextPage(result.doc, result.url);
      }
      if (controller.signal.aborted || !own()) return;
      if (!original && alternative) {
        const found = alternative.fields.album || '(no album)';
        if (!confirm(`No scrobble tagged “${item.album}” was found in the checked pages (up to 3). Open the normal edit dialog for this track tagged “${found}”?`)) return;
        original = alternative.form; source = alternative.url;
      }
      if (!original) throw new Error('No matching editable scrobble was found in the checked pages (up to 3). Open the track in your library to choose an older play.');
      openForm(original, source, row);
    } catch (error) { if (error.name !== 'AbortError') notice(error.message); }
    finally {
      loading.remove(); if (lookup === controller) lookup = null;
      button.disabled = false; button.textContent = 'Edit track';
    }
  }
  function trackMenus(root) {
    const album = context();
    if (album?.type !== 'albums') return;
    const rows = new Set(select(root, 'tr.chartlist-row'));
    const closest = root.closest?.('tr.chartlist-row');
    if (closest) rows.add(closest);
    for (const row of rows) {
      const item = rowItem(row);
      const menu = row.querySelector('.chartlist-more-menu,.dropdown-menu,[role="menu"]');
      if (item?.type !== 'tracks' || !menu) continue;
      let entry = menu.querySelector('[data-lfm-track-action]');
      if (!entry) {
        entry = document.createElement('li'); entry.dataset.lfmTrackAction = '';
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'mimic-link dropdown-menu-clickable-item more-item--edit-old';
        button.textContent = 'Edit track';
        button.addEventListener('click', event => {
          event.preventDefault(); event.stopPropagation();
          if (own()) openTrack({ ...item, album: album.name }, button, row);
        });
        entry.append(button);
      }
      if (menu.firstElementChild !== entry) menu.prepend(entry);
    }
  }
  function artistDialog(artist, opener) {
    document.querySelector('[data-lfm-artist-dialog]')?.close();
    const dialog = document.createElement('dialog'); dialog.dataset.lfmArtistDialog = '';
    dialog.setAttribute('aria-labelledby', 'lfm-artist-dialog-title');
    const title = document.createElement('h2');
    title.id = 'lfm-artist-dialog-title'; title.textContent = 'Edit artist display name';
    const explanation = document.createElement('p');
    explanation.textContent = 'Choose how this artist appears on your profile in this browser.';
    const label = document.createElement('label'); label.textContent = 'Preferred name';
    const input = document.createElement('input'); input.type = 'text'; input.maxLength = 500;
    input.value = R.get(rules, 'artists', artist) || artist; label.append(input);
    const save = document.createElement('button');
    save.type = 'button'; save.dataset.primary = ''; save.textContent = 'Save locally';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel';
    const message = document.createElement('div'); message.setAttribute('role', 'alert');
    cancel.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { dialog.remove(); if (opener?.isConnected) opener.focus(); });
    save.addEventListener('click', async () => {
      save.disabled = true;
      try {
        if (!own()) throw new Error('Your configured profile changed. Refresh this page.');
        await S.mutate([{ op: 'put', type: 'artists', from: artist, to: input.value }]);
        dialog.close(); notice('Artist display name saved locally.', 'success');
      } catch (error) { message.textContent = error.message; }
      finally { save.disabled = false; }
    });
    input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); save.click(); } });
    dialog.append(title, explanation, label, save, cancel, message);
    document.body.append(dialog); dialog.showModal(); input.focus(); input.select();
  }
  function artistMenus(root) {
    const menus = new Set(select(root, '.chartlist-more-menu,.dropdown-menu,[role="menu"]'));
    const closest = root.closest?.('.chartlist-more-menu,.dropdown-menu,[role="menu"]');
    if (closest) menus.add(closest);
    for (const menu of menus) {
      if (menu.querySelector('[data-lfm-artist-action]')) continue;
      const link = [...menu.querySelectorAll('a[href]')].find(candidate =>
        A.ownProfile(candidate.href, username) && A.musicItem(candidate)?.type === 'artists');
      if (!link) continue;
      const artist = A.musicItem(link).artist;
      const entry = document.createElement('li'); entry.dataset.lfmArtistAction = '';
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'mimic-link dropdown-menu-clickable-item more-item--edit-old';
      button.textContent = 'Edit artist display name';
      button.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation(); if (own()) artistDialog(artist, button);
      });
      entry.append(button); (link.closest('li') || link).after(entry);
    }
  }
  function editForm(form) {
    if (!form?.matches?.('form') || form.hasAttribute('data-edit-scrobble')) return false;
    try {
      const action = new URL(form.getAttribute('action'), location.href);
      return A.ownProfile(action.href, username) && /^\/user\/[^/]+\/library\/edit-(track|album)$/.test(action.pathname);
    } catch { return false; }
  }
  function casingOperations(pairs) {
    const changes = Object.entries(pairs).filter(([, pair]) => pair.from !== pair.to);
    if (!changes.length || changes.some(([, pair]) => !pair.from.trim() || !pair.to.trim() ||
        R.normalize(pair.from) !== R.normalize(pair.to))) return [];
    const types = { track: 'tracks', album: 'albums', artist: 'artists', albumArtist: 'albumArtists' };
    return changes.map(([type, pair]) => ({ op: 'put', type: types[type], from: pair.from,
      to: pair.to, ...(['track', 'album'].includes(type) ? { artist: pairs.artist.from } : {}) }));
  }
  async function saveCasing(form, operations, error) {
    if (saving.has(form)) return;
    saving.add(form);
    try {
      await S.mutate(operations);
      form.querySelector('[data-lfm-case-confirmation]')?.remove();
      const confirmation = document.createElement('div'); confirmation.dataset.lfmCaseConfirmation = '';
      confirmation.setAttribute('role', 'status');
      confirmation.append('Case-sensitive changes saved locally. ', manageLink());
      form.append(confirmation); if (error) error.hidden = true;
      notice('Case-sensitive changes saved locally.', 'success');
    } catch (failure) { notice('Could not save display preferences: ' + failure.message); }
    finally { saving.delete(form); }
  }
  function intercept(event) {
    if (!own()) return;
    const button = event.type === 'click' && event.target.closest?.('button,input[type="submit"]');
    if (event.type === 'click' && (!button || button.type !== 'submit')) return;
    const form = event.type === 'submit' ? event.target : button.form;
    if (!editForm(form)) return;
    const pairs = A.editPairs(form);
    if (!pairs) {
      notice('This Last.fm form is not supported for local display changes yet. Its normal edit controls remain available.');
      return;
    }
    const operations = casingOperations(pairs);
    if (!operations.length) return;
    event.preventDefault(); event.stopImmediatePropagation(); saveCasing(form, operations);
  }
  function errors(root) {
    const forms = new Set(select(root, MODAL_FORMS));
    const enclosing = root.closest?.('form');
    if (enclosing?.closest(MODAL)) forms.add(enclosing);
    for (const form of forms) {
      if (!editForm(form) || form.querySelector('[data-lfm-case-confirmation]')) continue;
      // Check only a native dialog's error nodes, never the entire page text.
      const error = [...form.querySelectorAll('[role="alert"],.alert,.errorlist,.alert-danger,span,p,div')]
        .find(node => !node.hidden && ERROR.test(node.textContent) &&
          ![...node.children].some(child => ERROR.test(child.textContent)));
      if (!error) continue;
      const pairs = A.editPairs(form);
      if (!pairs) { notice('Last.fm rejected this edit, but its fields could not be matched safely. No local preference was saved.'); continue; }
      const operations = casingOperations(pairs);
      if (operations.length) saveCasing(form, operations, error);
    }
  }
  function queue(root) {
    if (!root?.querySelectorAll) return;
    pending.add(root);
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      const roots = [...pending]; pending.clear();
      if (!own()) return;
      for (const node of roots) if (node === document || node.isConnected) {
        trackMenus(node); artistMenus(node); errors(node);
      }
    });
  }
  function update(state) {
    const changed = username !== state.settings.username;
    username = state.settings.username; rules = state.rules;
    if (changed) lookup?.abort();
    if (!own()) {
      document.querySelector('[data-lfm-artist-dialog]')?.close();
      document.querySelectorAll('[data-lfm-track-action],[data-lfm-artist-action],[data-lfm-local-toast],[data-lfm-case-confirmation]')
        .forEach(node => node.remove());
    } else queue(document);
  }
  async function init() {
    update(await S.read()); S.subscribe(update);
    document.addEventListener('click', intercept, true);
    document.addEventListener('submit', intercept, true);
    new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') {
          const form = record.target.parentElement?.closest('form');
          if (form?.closest(MODAL)) queue(form);
        } else {
          if (record.target.matches?.('.chartlist-more-menu,.dropdown-menu,[role="menu"]')) queue(record.target);
          record.addedNodes.forEach(node => { if (node.nodeType === Node.ELEMENT_NODE) queue(node); });
        }
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    addEventListener('pagehide', () => lookup?.abort());
  }
  init().catch(error => notice('Extension edit controls could not start: ' + error.message));
})();
