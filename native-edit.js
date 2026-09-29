(() => {
  'use strict';

  const R = globalThis.LastfmRules;
  const ERROR = /edit doesn.t contain any real changes|cannot accept casing changes/i;
  let username = 'DCCXX';
  let rules = R.empty();
  let recent = null;
  let lastEdit = null;
  let scanQueued = false;

  function ownProfile() {
    const match = location.pathname.match(/^\/user\/([^/]+)(?:\/|$)/i);
    if (!match) return false;
    try {
      return R.normalize(decodeURIComponent(match[1])) === R.normalize(username);
    } catch {
      return false;
    }
  }

  function decode(part) {
    try { return decodeURIComponent(part.replace(/\+/g, ' ')); }
    catch { return part.replace(/\+/g, ' '); }
  }

  function musicItem(link) {
    let url;
    try { url = new URL(link.href); } catch { return null; }
    if (url.origin !== location.origin) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'music' || !parts[1]) return null;
    const index = parts[1] === '+noredirect' ? 2 : 1;
    if (!parts[index] || parts[index].startsWith('+')) return null;
    const artist = decode(parts[index]);
    if (parts[index + 1] === '_' && parts[index + 2]) {
      return { type: 'tracks', artist, name: decode(parts[index + 2]) };
    }
    if (parts[index + 1] && !parts[index + 1].startsWith('+') &&
        parts[index + 2] && !parts[index + 2].startsWith('+')) {
      return { type: 'tracks', artist, name: decode(parts[index + 2]) };
    }
    if (parts[index + 1] && !parts[index + 1].startsWith('+')) {
      return { type: 'albums', artist, name: decode(parts[index + 1]) };
    }
    return { type: 'artists', artist, name: artist };
  }

  function rowContext(row) {
    if (!row) return null;
    const items = [...row.querySelectorAll('a[href]')]
      .map(musicItem).filter(Boolean);
    return items.find(item => item.type === 'tracks') ||
      items.find(item => item.type === 'albums') ||
      items.find(item => item.type === 'artists') || null;
  }

  function libraryTrackUrl(item) {
    const encode = value => encodeURIComponent(value).replace(/%20/g, '+');
    return `${location.origin}/user/${encode(username)}/library/music/+noredirect/` +
      `${encode(item.artist)}/_/${encode(item.name)}`;
  }

  function ownLibraryTrackUrl(value) {
    try {
      const url = new URL(value, location.href);
      const parts = url.pathname.split('/').filter(Boolean);
      const music = parts.indexOf('music', 3);
      const track = parts[music + 1] === '+noredirect' ? music + 2 : music + 1;
      return url.origin === location.origin && parts[0] === 'user' &&
        R.normalize(decode(parts[1] || '')) === R.normalize(username) &&
        parts[2] === 'library' && music >= 3 && parts[track] &&
        parts[track + 1] === '_' && parts[track + 2] ? url.href : null;
    } catch { return null; }
  }

  async function openNativeTrackEdit(item, button, row) {
    button.disabled = true;
    const oldText = button.textContent;
    button.textContent = 'Loading edit…';
    try {
      const album = R.normalize(item.album);
      const linkedTrack = [...row.querySelectorAll('a[href]')]
        .map(link => ownLibraryTrackUrl(link.href)).find(Boolean);
      let url = linkedTrack || libraryTrackUrl(item);
      let original = null;
      let sourceUrl = url;
      let alternative = null;
      const visited = new Set();
      for (let pageNumber = 0; url && pageNumber < 20; pageNumber++) {
        if (visited.has(url)) break;
        visited.add(url);
        const response = await fetch(url, { credentials: 'same-origin' });
        const finalUrl = new URL(response.url);
        if (!response.ok || !ownLibraryTrackUrl(response.url)) {
          throw new Error('Could not load your track scrobbles.');
        }
        const page = new DOMParser().parseFromString(await response.text(), 'text/html');
        const forms = [...page.querySelectorAll('form[data-edit-scrobble]')]
          .filter(form => {
            const action = new URL(form.getAttribute('action') || '', response.url);
            return action.origin === location.origin &&
              action.pathname === `/user/${username}/library/edit` &&
              form.querySelector('[name="csrfmiddlewaretoken"]');
          });
        original = forms.find(form =>
          R.normalize(form.querySelector('[name="album_name"]')?.value) === album
        );
        if (original) { sourceUrl = response.url; break; }
        if (!alternative && forms.length) {
          alternative = { form: forms[0], url: response.url };
        }
        const next = page.querySelector('nav.pagination .pagination-next a[href],'+
          'nav.pagination a.pagination-next[href]');
        const nextUrl = next && new URL(next.getAttribute('href'), response.url);
        url = nextUrl?.origin === location.origin &&
          nextUrl.pathname === finalUrl.pathname ? nextUrl.href : null;
      }
      if (!original) {
        if (!alternative) {
          throw new Error('No editable scrobble was found on this track’s first 20 library pages.');
        }
        const fields = alternative.form;
        const actualArtist = fields.querySelector('[name="artist_name"]')?.value || item.artist;
        const actualTrack = fields.querySelector('[name="track_name"]')?.value || item.name;
        const actualAlbum = fields.querySelector('[name="album_name"]')?.value || '(no album)';
        const message = `No scrobble tagged “${item.album}” was found. ` +
          `Last.fm has an editable scrobble for “${actualTrack}” by ${actualArtist} ` +
          `tagged “${actualAlbum}”. Open its normal edit dialog instead?`;
        if (!confirm(message)) return;
        original = alternative.form;
        sourceUrl = alternative.url;
      }
      document.querySelector('[data-lfm-track-edit-launcher]')?.remove();
      const form = document.importNode(original, true);
      form.dataset.lfmTrackEditLauncher = '';
      form.action = new URL(original.getAttribute('action'), sourceUrl).href;
      form.style.display = 'none';
      let submit = form.querySelector(
        'button:not([type]),button[type="submit"],input[type="submit"]'
      );
      if (!submit) {
        submit = document.createElement('button');
        submit.type = 'submit';
        form.append(submit);
      }
      const host = row.querySelector('.chartlist-more-menu,.dropdown-menu,[role="menu"]') ||
        row.lastElementChild;
      if (!row.isConnected || !host) throw new Error('The track menu closed; open it again.');
      const holder = button.closest('li');
      if (holder?.isConnected) holder.append(form);
      else {
        const fallback = document.createElement('li');
        fallback.hidden = true;
        fallback.append(form);
        host.prepend(fallback);
      }
      // Last.fm's own delegated handler opens its normal Edit Scrobble dialog.
      const dialogOpen = () => [...document.querySelectorAll(
        '.popup_content,.modal,[role="dialog"]'
      )].some(node => node.getClientRects().length > 0 &&
        node.querySelector('form[action*="/library/edit"]'));
      let opened = dialogOpen();
      const observer = new MutationObserver(() => { opened ||= dialogOpen(); });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      const preventNavigation = event => {
        if (event.target === form && !event.defaultPrevented) event.preventDefault();
      };
      document.addEventListener('submit', preventNavigation);
      submit.click();
      document.removeEventListener('submit', preventNavigation);
      setTimeout(() => {
        observer.disconnect();
        if (!opened && !dialogOpen() && form.isConnected) {
          toast('Last.fm did not open its edit window. Please try again.');
        }
        form.remove();
      }, 8000);
    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  function addTrackMenuItems() {
    const context = contextFromPath();
    if (context?.type !== 'albums') return;
    for (const row of document.querySelectorAll('tr.chartlist-row')) {
      const item = [...row.querySelectorAll('a[href]')]
        .map(musicItem).find(link => link?.type === 'tracks');
      const menu = row.querySelector('.chartlist-more-menu,.dropdown-menu,[role="menu"]');
      if (!item || !menu) continue;
      const existing = menu.querySelector('[data-lfm-track-action]');
      if (existing) {
        if (menu.firstElementChild !== existing) menu.prepend(existing);
        continue;
      }
      const entry = document.createElement('li');
      entry.dataset.lfmTrackAction = '';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mimic-link dropdown-menu-clickable-item more-item--edit-old';
      button.textContent = 'Edit track';
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        recent = { ...item, time: Date.now() };
        openNativeTrackEdit({ ...item, album: context.name }, button, row);
      });
      entry.append(button);
      menu.prepend(entry);
    }
  }

  function artistFromLibraryLink(link) {
    let url;
    try { url = new URL(link.href); } catch { return null; }
    if (url.origin !== location.origin) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const music = parts[0] === 'user' && parts[2] === 'library'
      ? parts.indexOf('music', 3) : -1;
    if (music < 0 || R.normalize(decode(parts[1])) !== R.normalize(username)) {
      return null;
    }
    const index = parts[music + 1] === '+noredirect' ? music + 2 : music + 1;
    return parts[index] && !parts[index].startsWith('+')
      ? decode(parts[index]) : null;
  }

  function contextFromPath() {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'user' || parts[2] !== 'library') return null;
    const music = parts.indexOf('music', 3);
    if (music < 0) return null;
    const index = parts[music + 1] === '+noredirect' ? music + 2 : music + 1;
    if (!parts[index] || parts[index].startsWith('+')) return null;
    const artist = decode(parts[index]);
    if (parts[index + 1] && parts[index + 2] &&
        !parts[index + 2].startsWith('+')) {
      return { type: 'tracks', artist, name: decode(parts[index + 2]) };
    }
    if (parts[index + 1] && !parts[index + 1].startsWith('+')) {
      return { type: 'albums', artist, name: decode(parts[index + 1]) };
    }
    return { type: 'artists', artist, name: artist };
  }

  function artistDialog(artist) {
    document.querySelector('[data-lfm-artist-dialog]')?.remove();
    const dialog = document.createElement('dialog');
    dialog.dataset.lfmArtistDialog = '';
    dialog.style.cssText =
      'border:1px solid #ddd;border-radius:4px;padding:24px;' +
      'width:min(430px,calc(100vw - 40px));box-shadow:0 12px 40px #0005;' +
      'font:14px/1.5 system-ui,sans-serif;color:#222';
    const heading = document.createElement('h2');
    heading.textContent = 'Edit artist display name';
    heading.style.margin = '0 0 12px';
    const explanation = document.createElement('p');
    explanation.textContent =
      'This changes the name shown on your profile in this browser.';
    const label = document.createElement('label');
    label.textContent = 'Preferred name';
    label.style.display = 'block';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = R.get(rules, 'artists', artist) || artist;
    input.style.cssText =
      'box-sizing:border-box;width:100%;padding:8px;margin:5px 0 14px;' +
      'border:1px solid #aaa;font:inherit';
    label.append(input);
    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = 'Save locally';
    save.style.cssText =
      'background:#d51007;color:white;border:0;padding:8px 12px;cursor:pointer';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.style.cssText = 'margin-left:8px;padding:8px 12px;cursor:pointer';
    const message = document.createElement('div');
    message.setAttribute('role', 'status');
    message.style.marginTop = '8px';
    cancel.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => dialog.remove());
    save.addEventListener('click', async () => {
      try {
        R.put(rules, 'artists', artist, input.value);
        await chrome.storage.local.set({ rules });
        dialog.close();
        toast('Artist display name saved locally.');
      } catch (error) {
        message.textContent = error.message;
      }
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') save.click();
    });
    dialog.append(heading, explanation, label, save, cancel, message);
    document.body.append(dialog);
    dialog.showModal();
    input.focus();
    input.select();
  }

  function toast(text) {
    document.querySelector('[data-lfm-local-toast]')?.remove();
    const note = document.createElement('div');
    note.dataset.lfmLocalToast = '';
    note.setAttribute('role', 'status');
    note.textContent = text;
    note.style.cssText =
      'position:fixed;z-index:2147483647;right:20px;top:20px;' +
      'padding:12px 16px;background:#185c32;color:#fff;' +
      'border-radius:4px;box-shadow:0 3px 14px #0004;' +
      'font:14px system-ui,sans-serif';
    document.body.append(note);
    setTimeout(() => note.remove(), 4500);
  }

  function addArtistMenuItem() {
    const entries = [...document.querySelectorAll(
      'a[href*="/library/music/"],.dropdown-menu a,' +
      '.dropdown-menu button,[role="menu"] a,[role="menu"] button'
    )]
      .filter(el => el.textContent.trim() === 'Go to artist in library' &&
                    el.getBoundingClientRect().height > 0);
    for (const entry of entries) {
      const parent = entry.closest('li') || entry;
      const menu = entry.closest('.dropdown-menu,[role="menu"],ul') ||
        parent.parentElement;
      if (menu?.querySelector('[data-lfm-artist-action]')) continue;
      const artist = artistFromLibraryLink(entry) ||
        rowContext(entry.closest('tr.chartlist-row'))?.artist ||
        (recent?.type === 'artists' && Date.now() - recent.time < 10000
          ? recent.artist : null);
      if (!artist) continue;
      const clone = parent.cloneNode(true);
      clone.dataset.lfmArtistAction = '';
      const control = clone.matches('a,button')
        ? clone : clone.querySelector('a,button');
      if (!control) continue;
      control.textContent = 'Edit artist display name';
      control.removeAttribute('href');
      control.setAttribute('role', 'button');
      control.tabIndex = 0;
      clone.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        artistDialog(artist);
      });
      control.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          artistDialog(artist);
        }
      });
      parent.after(clone);
    }
  }

  function textInputs(container) {
    return [...container.querySelectorAll('input')].filter(input =>
      ['text', 'search'].includes(input.type) &&
      input.getBoundingClientRect().height > 0
    );
  }

  function inputType(input) {
    const identity = [input.name, input.id, input.getAttribute('aria-label')]
      .filter(Boolean).join(' ').toLowerCase();
    if (/album[_-\s]*artist|albumartist/.test(identity)) return 'albumArtist';
    if (/album/.test(identity)) return 'album';
    if (/artist/.test(identity)) return 'artist';
    if (/track|title/.test(identity)) return 'track';
    return null;
  }

  function editFields(container) {
    const inputs = textInputs(container);
    if (inputs.length < 2) return null;
    const fields = {};

    // The Edit Album form groups its before/after inputs under each label.
    // Those left-hand inputs are sometimes styled gray without being disabled.
    const types = {
      'track': 'track', 'track title': 'track',
      'artist': 'artist', 'album': 'album', 'album artist': 'albumArtist'
    };
    const labels = [...container.querySelectorAll('label,dt,strong,span,div')]
      .filter(el => el.childElementCount === 0 &&
        types[el.textContent.trim().toLowerCase()]);
    for (const label of labels) {
      const type = types[label.textContent.trim().toLowerCase()];
      let group = label.parentElement;
      for (let depth = 0; group && group !== container && depth < 5;
           depth++, group = group.parentElement) {
        const pair = textInputs(group);
        if (pair.length === 2) {
          fields[type] = { from: pair[0].value, to: pair[1].value };
          break;
        }
        if (pair.length > 2) break;
      }
    }
    const original = inputs.filter(input => input.disabled || input.readOnly);
    const edited = inputs.filter(input => !input.disabled && !input.readOnly);
    // Older forms mark original inputs readonly; newer forms put each pair
    // side by side with both inputs technically editable.
    const paired = original.length && original.length === edited.length
      ? original.map((input, i) => [input, edited[i]])
      : Array.from({ length: Math.floor(inputs.length / 2) }, (_, i) =>
        [inputs[i * 2], inputs[i * 2 + 1]]);
    const count = paired.length;
    const fallback = count >= 4
      ? ['track', 'album', 'artist', 'albumArtist']
      : count === 3
        ? ['album', 'artist', 'albumArtist']
        : count === 2
          ? ['album', 'albumArtist']
          : ['album'];
    for (let i = 0; i < count; i++) {
      const type = inputType(paired[i][1]) || fallback[i];
      if (type && !fields[type]) fields[type] = {
        from: paired[i][0].value, to: paired[i][1].value
      };
    }
    return fields;
  }

  function findContainer(element) {
    let node = element.closest('form,[role="dialog"],.modal') ||
      element.parentElement;
    for (let i = 0; node && node !== document.body && i < 12;
         i++, node = node.parentElement) {
      if (editFields(node)) return node;
    }
    return null;
  }

  function caseChanges(fields) {
    return Object.entries(fields).filter(([, pair]) =>
      pair.from !== pair.to &&
      R.normalize(pair.from) === R.normalize(pair.to)
    );
  }

  async function saveRejectedCase(error) {
    if (error.dataset.lfmCaseHandled) return;
    const container = findContainer(error);
    const fields = (container && editFields(container)) ||
      (lastEdit && Date.now() - lastEdit.time < 120000
        ? lastEdit.fields : null);
    if (!fields) return;
    const allChanges = Object.entries(fields).filter(([, pair]) => pair.from !== pair.to);
    const changes = caseChanges(fields);
    if (allChanges.length !== changes.length) return;
    if (!changes.length) return;
    error.dataset.lfmCaseHandled = '1';
    const context = (lastEdit && Date.now() - lastEdit.time < 120000
      ? lastEdit.context : null) || contextFromPath();
    const artist = fields.artist?.from ||
      (context?.type === 'albums' || context?.type === 'tracks'
        ? context.artist : null) ||
      fields.albumArtist?.from;
    let saved = 0;
    try {
      for (const [type, pair] of changes) {
        if (type === 'artist') {
          R.put(rules, 'artists', pair.from, pair.to);
          saved++;
        } else if (type === 'album' && artist) {
          R.put(rules, 'albums', pair.from, pair.to, artist);
          saved++;
        } else if (type === 'track' && artist) {
          R.put(rules, 'tracks', pair.from, pair.to, artist);
          saved++;
        } else if (type === 'albumArtist') {
          R.put(rules, 'albumArtists', pair.from, pair.to);
          saved++;
        }
      }
      if (!saved) {
        delete error.dataset.lfmCaseHandled;
        return;
      }
      await chrome.storage.local.set({ rules });
      const banner = error.closest('[role="alert"],.alert,.alert-danger') || error;
      banner.hidden = true;
      const confirmation = document.createElement('div');
      confirmation.dataset.lfmCaseConfirmation = '';
      confirmation.setAttribute('role', 'status');
      confirmation.append('Case-sensitive changes saved locally. ');
      const manage = document.createElement('a');
      manage.href = chrome.runtime.getURL('options.html');
      manage.target = '_blank';
      manage.rel = 'noopener';
      manage.textContent = 'Manage preferences';
      confirmation.append(manage);
      confirmation.style.cssText =
        'margin:10px 0;padding:10px;background:#e4f3e8;' +
        'border:1px solid #64a978;color:#1b5930';
      banner.after(confirmation);
      toast('Case-sensitive changes saved locally.');
    } catch (failure) {
      delete error.dataset.lfmCaseHandled;
      toast('Could not save local case changes: ' + failure.message);
    }
  }

  function scanErrors() {
    if (!ERROR.test(document.body.textContent)) return;
    // Last.fm's album dialog uses a red banner that need not have an alert
    // class or role. Pick the innermost visible element containing its message.
    const errors = [...document.body.querySelectorAll('*')].filter(el =>
      ERROR.test(el.textContent) && el.getClientRects().length > 0 &&
      ![...el.children].some(child => ERROR.test(child.textContent))
    );
    errors.forEach(error => saveRejectedCase(error));
  }

  function scheduleScan() {
    if (scanQueued) return;
    scanQueued = true;
    setTimeout(() => {
      scanQueued = false;
      if (!ownProfile()) return;
      addArtistMenuItem();
      addTrackMenuItems();
      scanErrors();
    }, 80);
  }

  async function init() {
    const stored = await chrome.storage.local.get(['settings', 'rules']);
    username = stored.settings?.username || username;
    rules = R.clean(stored.rules);
    if (!ownProfile()) return;
    document.addEventListener('click', event => {
      const row = event.target.closest?.('tr.chartlist-row');
      const item = rowContext(row);
      if (item) recent = { ...item, time: Date.now() };
      const button = event.target.closest?.('button,input[type="submit"]');
      if (/save\s+edit/i.test(button?.textContent || button?.value || '')) {
        const container = findContainer(button);
        const fields = container && editFields(container);
        if (fields) {
          lastEdit = {
            fields, context: recent || contextFromPath(), time: Date.now()
          };
        }
      }
      scheduleScan();
    }, true);
    document.addEventListener('submit', event => {
      const fields = editFields(event.target);
      if (fields) lastEdit = {
        fields, context: recent || contextFromPath(), time: Date.now()
      };
    }, true);
    new MutationObserver(scheduleScan)
      .observe(document.body, {
        childList: true, characterData: true, subtree: true
      });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.rules) rules = R.clean(changes.rules.newValue);
      if (changes.settings) username = changes.settings.newValue?.username || '';
    });
    scheduleScan();
  }

  init().catch(error => console.error('Last.fm Personal Library edit controls:', error));
})();
