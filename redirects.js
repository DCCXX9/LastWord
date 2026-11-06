(() => {
  'use strict';
  if (globalThis.LastfmRedirects) return;
  const A = globalThis.LastfmAdapter;
  const normalize = value => String(value || '').trim().normalize('NFC').toLowerCase();
  const encode = value => encodeURIComponent(value).replace(/%20/g, '+');

  function route(value, base) {
    try {
      const url = new URL(value, base);
      if (url.origin !== 'https://www.last.fm') return null;
      const parts = url.pathname.split('/');
      const start = parts[1] === 'music' ? 2
        : parts[1] === 'user' && parts[3] === 'library' && parts[4] === 'music' ? 5 : -1;
      if (start < 0) return null;
      const index = parts[start] === '+noredirect' ? start + 1 : start;
      if (!parts[index] || parts[index].startsWith('+')) return null;
      // Image galleries and edit/delete actions retain their native URLs.
      if (parts.slice(index + 1).some(part => ['+images', '+edit', '+delete'].includes(part)) ||
          parts[index + 1] === '+wiki' && parts[index + 2] === 'edit') return null;
      const artist = decodeURIComponent(parts[index].replace(/\+/g, ' '));
      return {url, parts, start, index, artist};
    } catch { return null; }
  }

  function protect(value, settings, base = 'https://www.last.fm/', original) {
    if (!settings?.username || settings.redirectProtection === false) return value;
    const parsed = route(value, base);
    if (!parsed || parsed.parts[1] === 'user' && !A.ownProfile(parsed.url.href, settings.username)) return value;
    let artist = parsed.artist;
    if (original?.artist) {
      // The caller supplies original fields only for a verified native row's
      // matching music link. Display text and guessed aliases are never evidence.
      const item = A.musicItem(parsed.url.href);
      if (item && (item.type === 'artists' ||
          item.type === 'tracks' && normalize(item.name) === normalize(original.track) ||
          item.type === 'albums' && normalize(item.name) === normalize(original.album))) artist = original.artist;
    }
    if (artist !== parsed.artist) parsed.parts[parsed.index] = encode(artist);
    if (parsed.index === parsed.start) parsed.parts.splice(parsed.start, 0, '+noredirect');
    parsed.url.pathname = parsed.parts.join('/');
    return parsed.url.href;
  }

  function samePagePath(first, second) {
    const left = route(first), right = route(second);
    if (!left || !right) return false;
    const path = parsed => {
      const parts = [...parsed.parts];
      if (parsed.index !== parsed.start) parts.splice(parsed.start, 1);
      return parts.join('/');
    };
    return path(left) === path(right);
  }

  let current = {username:''}, active = false;
  const changed = new Map();
  globalThis.LastfmRedirects = Object.freeze({ protect, samePagePath,
    status: () => ({enabled:active, protectedLinks:changed.size}) });
  if (!globalThis.document || !globalThis.LastfmStore) return;

  function context() {
    if (!current.username || current.redirectProtection === false) return false;
    if (A.ownProfile(location.href, current.username)) return true;
    const publicPage = route(location.href);
    return publicPage?.parts[1] === 'music';
  }
  function restore(link, previous) {
    if (link.getAttribute('href') === previous.applied) link.setAttribute('href', previous.original);
    changed.delete(link);
  }
  function originalIdentity(link) {
    if (!A.ownProfile(location.href, current.username)) return null;
    const forms = link.closest('tr.chartlist-row')?.querySelectorAll('form[data-edit-scrobble]');
    const original = forms?.length === 1 ? A.editRow(forms[0], location.href, current.username, true) : null;
    const item = A.musicItem(link.href);
    if (!original || !item) return null;
    // Restrict evidence to the row's named cells, not related/image links.
    if (item.type === 'tracks' && link.closest('.chartlist-name')) return original;
    if (item.type === 'artists' && link.closest('.chartlist-artist')) return original;
    if (item.type === 'albums' && link.closest('.chartlist-album'))
      return {...original, artist:original.albumArtist || original.artist};
    return null;
  }
  function apply(link) {
    if (!link.isConnected || link.closest('[data-lfm-ui]')) return;
    const href = link.getAttribute('href');
    if (href === null) { changed.delete(link); return; }
    const previous = changed.get(link);
    if (!active) { if (previous) restore(link, previous); return; }
    if (previous?.applied === href) return;
    const protectedUrl = protect(href, current, location.href, originalIdentity(link));
    if (protectedUrl === href) { changed.delete(link); return; }
    changed.set(link, {original:href, applied:protectedUrl});
    link.setAttribute('href', protectedUrl);
  }
  function scan(root) {
    if (root.matches?.('a[href],area[href]')) apply(root);
    root.querySelectorAll?.('a[href],area[href]').forEach(apply);
  }
  function update(state) {
    current = state.settings;
    active = context();
    for (const [link, previous] of changed) {
      if (!link.isConnected) changed.delete(link);
      else if (!active) restore(link, previous);
    }
    if (active) scan(document);
  }
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') apply(record.target);
      else for (const node of record.addedNodes) if (node.nodeType === 1) {
        // A native form can arrive after its sibling links during hydration.
        scan(node.closest?.('tr.chartlist-row') || node);
      }
    }
    for (const link of changed.keys()) if (!link.isConnected) changed.delete(link);
  });
  observer.observe(document, {subtree:true, childList:true, attributes:true, attributeFilter:['href']});
  // Capture the final href for normal clicks, new-tab clicks and context menus.
  for (const event of ['click', 'auxclick', 'contextmenu']) document.addEventListener(event, e => {
    const link = e.target?.closest?.('a[href],area[href]');
    if (link) apply(link);
  }, true);
  LastfmStore.subscribe(update);
  LastfmStore.read().then(update).catch(error => console.error('Last.fm redirect protection:', error));
})();
