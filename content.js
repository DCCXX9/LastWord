(() => {
  'use strict';

  const R = globalThis.LastfmRules;
  const DEFAULT_SETTINGS = { username: 'DCCXX', infiniteScroll: true };
  let settings = DEFAULT_SETTINGS;
  let rules = R.empty();
  let scroller = null;
  let queued = false;
  const pending = new Set();
  const changedText = new WeakMap();
  const changedHeading = new WeakMap();

  function ownProfile() {
    const match = location.pathname.match(/^\/user\/([^/]+)(?:\/|$)/i);
    if (!match || !settings.username) return false;
    try {
      return R.normalize(decodeURIComponent(match[1])) ===
        R.normalize(settings.username);
    } catch {
      return false;
    }
  }

  function segment(value) {
    try { return decodeURIComponent(value.replace(/\+/g, ' ')); }
    catch { return value.replace(/\+/g, ' '); }
  }

  function musicLink(link) {
    let url;
    try { url = new URL(link.href); } catch { return null; }
    if (url.origin !== location.origin) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    let index = parts[0] === 'music' ? 0 : -1;
    if (index < 0 && parts[0] === 'user' && parts[2] === 'library') {
      index = parts.indexOf('music', 3);
    }
    if (index < 0) return null;
    const artistIndex = parts[index + 1] === '+noredirect'
      ? index + 2 : index + 1;
    if (!parts[artistIndex] || parts[artistIndex].startsWith('+')) return null;
    const artist = segment(parts[artistIndex]);
    const item = parts[artistIndex + 1];
    if (item === '_' && parts[artistIndex + 2]) {
      return { type: 'tracks', artist, name: segment(parts[artistIndex + 2]) };
    }
    if (item && !item.startsWith('+') && parts[artistIndex + 2] &&
        !parts[artistIndex + 2].startsWith('+')) {
      return { type: 'tracks', artist, name: segment(parts[artistIndex + 2]) };
    }
    if (item && !item.startsWith('+') && item !== '_') {
      return { type: 'albums', artist, name: segment(item) };
    }
    return { type: 'artists', artist, name: artist };
  }

  function nameNode(link, name) {
    const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (R.normalize(node.nodeValue) === R.normalize(name)) return node;
    }
    return null;
  }

  function applyLink(link) {
    const item = musicLink(link);
    if (!item) return;
    let saved = changedText.get(link);
    if (!saved) {
      const text = nameNode(link, item.name);
      if (!text) return;
      saved = { node: text, original: text.nodeValue };
    }
    if (!saved.node.isConnected) {
      changedText.delete(link);
      return;
    }
    const preferred = R.get(rules, item.type, item.name, item.artist) ||
      (item.type === 'artists'
        ? R.get(rules, 'albumArtists', item.name) : null);
    const target = preferred || saved.original.trim();
    const whitespace = saved.original.match(/^(\s*)(.*?)(\s*)$/s);
    const value = whitespace
      ? whitespace[1] + target + whitespace[3] : target;
    if (saved.node.nodeValue !== value) saved.node.nodeValue = value;
    if (preferred) changedText.set(link, saved);
    else changedText.delete(link);
    if (item.type === 'tracks') spaceTrackDuration(link);
  }

  function spaceTrackDuration(link) {
    const name = link.closest('.chartlist-name');
    if (!name || !name.closest('tr.chartlist-row')) return;
    let last = link;
    while (last.parentElement !== name && last.parentElement) last = last.parentElement;
    if (last.parentElement !== name) return;
    const next = last.nextSibling;
    if (!next || /^\s/.test(next.textContent || '')) return;
    if (!/^\(\d+:\d{2}(?::\d{2})?\)/.test(next.textContent || '')) return;
    name.insertBefore(document.createTextNode(' '), next);
  }

  function applyNames(root) {
    if (!ownProfile() || !root) return;
    if (root.nodeType === Node.ELEMENT_NODE && root.matches('a[href]')) {
      applyLink(root);
    }
    if (root.querySelectorAll) {
      root.querySelectorAll('a[href]').forEach(applyLink);
    }
    applyLibraryHeading();
  }

  function applyLibraryHeading() {
    const parts = location.pathname.split('/').filter(Boolean);
    const music = parts[0] === 'user' && parts[2] === 'library'
      ? parts.indexOf('music', 3) : -1;
    if (music < 0) return;
    const index = parts[music + 1] === '+noredirect' ? music + 2 : music + 1;
    if (!parts[index] || parts[index].startsWith('+')) return;
    const artist = segment(parts[index]);
    const item = parts[index + 1];
    const type = item && !item.startsWith('+') && parts[index + 2] &&
      !parts[index + 2].startsWith('+') ? 'tracks'
      : item && !item.startsWith('+') ? 'albums' : 'artists';
    const name = type === 'tracks' ? segment(parts[index + 2])
      : type === 'albums' ? segment(item) : artist;
    const preferred = R.get(rules, type, name, artist) ||
      (type === 'artists' ? R.get(rules, 'albumArtists', name) : null);
    for (const heading of document.querySelectorAll('h1,.library-header-title')) {
      let saved = changedHeading.get(heading);
      if (!saved) {
        const node = nameNode(heading, name);
        if (!node) continue;
        saved = { node, original: node.nodeValue };
      }
      const value = preferred || saved.original;
      if (saved.node.nodeValue !== value) saved.node.nodeValue = value;
      if (preferred) changedHeading.set(heading, saved);
      else changedHeading.delete(heading);
    }
  }

  function nextPage(root, base) {
    const link = [...root.querySelectorAll('nav.pagination a[href]')].find(a =>
      a.closest('.pagination-next') ||
      a.textContent.trim().toLowerCase() === 'next'
    );
    if (!link) return null;
    const url = new URL(link.getAttribute('href'), base);
    return url.origin === location.origin && url.pathname === location.pathname
      ? url.href : null;
  }

  function libraryView() {
    const path = location.pathname.replace(/\/$/, '');
    if (/^\/user\/[^/]+\/library\/artists$/.test(path)) return 'artists';
    if (/^\/user\/[^/]+\/library\/albums$/.test(path)) return 'albums';
    if (/^\/user\/[^/]+\/library(?:\/scrobbles)?$/.test(path)) return 'scrobbles';
    if (/^\/user\/[^/]+\/library\/music\/(?:\+noredirect\/)?[^/]+\/\+tracks$/.test(path)) return 'tracks';
    if (/^\/user\/[^/]+\/library\/music\/(?:\+noredirect\/)?[^/]+\/\+albums$/.test(path)) return 'artistAlbums';
    if (/^\/user\/[^/]+\/library\/music\/(?:\+noredirect\/)?[^/]+$/.test(path)) return 'artistScrobbles';
    return null;
  }

  function paginationFor(table) {
    for (let parent = table.parentElement; parent; parent = parent.parentElement) {
      const nav = [...parent.querySelectorAll('nav.pagination')]
        .find(el => el.getBoundingClientRect().height > 0);
      if (nav) return { section: parent, pagination: nav };
    }
    return null;
  }

  function visibleLibraryTable() {
    return [...document.querySelectorAll('table.chartlist')]
      .filter(table => table.querySelector('tbody tr.chartlist-row') &&
        table.getBoundingClientRect().height > 0)
      .map(table => ({ table, ...paginationFor(table) }))
      .filter(candidate => candidate.pagination)
      .sort((a, b) =>
        b.table.getBoundingClientRect().height -
        a.table.getBoundingClientRect().height
      )[0];
  }

  function removeJump(section) {
    const form = [...section.querySelectorAll('form')]
      .find(el => /jump\s+to\s+position/i.test(el.textContent));
    if (form) form.remove();
  }

  function unclamp(row) {
    const bottom = row.getBoundingClientRect().bottom;
    for (let parent = row.parentElement; parent && parent !== document.body;
         parent = parent.parentElement) {
      const box = parent.getBoundingClientRect();
      const style = getComputedStyle(parent);
      if (bottom > box.bottom + 2 && /hidden|clip|auto/.test(style.overflowY)) {
        parent.style.setProperty('height', 'auto', 'important');
        parent.style.setProperty('max-height', 'none', 'important');
        parent.style.setProperty('overflow-y', 'visible', 'important');
      }
    }
  }

  async function appendNativeRows(state, sourceBody, pageUrl) {
    const body = document.importNode(sourceBody, true);
    const rows = [...body.querySelectorAll('tr.chartlist-row')];
    if (!rows.length) throw new Error('No library rows found.');
    body.querySelectorAll('img[data-src]').forEach(img => {
      const source = img.getAttribute('data-src');
      if (source && (!img.getAttribute('src') ||
                     img.getAttribute('src').startsWith('data:'))) {
        img.src = new URL(source, pageUrl).href;
      }
    });
    const oldHeight = state.table.getBoundingClientRect().height;
    state.table.append(body);
    await new Promise(requestAnimationFrame);
    if (scroller !== state) return false;
    if (state.table.getBoundingClientRect().height - oldHeight < rows.length * 10) {
      body.style.setProperty('display', 'table-row-group', 'important');
      rows.forEach(row => row.style.setProperty('display', 'table-row', 'important'));
      await new Promise(requestAnimationFrame);
    }
    if (state.table.getBoundingClientRect().height - oldHeight < rows.length * 10) {
      body.remove();
      state.table.tBodies[0].append(...rows);
      rows.forEach(row => row.style.setProperty('display', 'table-row', 'important'));
      await new Promise(requestAnimationFrame);
    }
    if (state.table.getBoundingClientRect().height - oldHeight < rows.length * 10) {
      rows.forEach(row => row.remove());
      throw new Error('Last.fm hid the added rows.');
    }
    unclamp(rows[rows.length - 1]);
    applyNames(body.isConnected ? body : state.table.tBodies[0]);
    return true;
  }

  async function loadMore(state) {
    if (state.busy || !state.next || !state.table.isConnected) return;
    state.busy = true;
    try {
      const url = state.next;
      const response = await fetch(url, { credentials: 'same-origin' });
      if (!response.ok || new URL(response.url).pathname !== location.pathname) {
        throw new Error('Could not fetch the next page.');
      }
      const doc = new DOMParser().parseFromString(
        await response.text(), 'text/html'
      );
      const tables = [...doc.querySelectorAll('table.chartlist')];
      const indexedBody = tables[state.tableIndex]?.tBodies[0];
      const body = (indexedBody?.querySelector('tr.chartlist-row') && indexedBody) ||
        tables.map(table => table.tBodies[0])
          .filter(Boolean)
          .sort((a, b) =>
            b.querySelectorAll('tr.chartlist-row').length -
            a.querySelectorAll('tr.chartlist-row').length
          )[0];
      if (!body) throw new Error('Could not find the next library page.');
      if (scroller !== state) return;
      if (!await appendNativeRows(state, body, response.url)) return;
      state.pagination.hidden = true;
      if (state.view === 'artists') removeJump(state.section);
      state.visited.add(url);
      const next = nextPage(doc, response.url);
      state.next = next && !state.visited.has(next) ? next : null;
      if (!state.next) state.observer.disconnect();
    } catch (error) {
      if (scroller === state) {
        state.observer.disconnect();
        state.pagination.hidden = false;
        state.notice.textContent = error.message + ' Use Last.fm’s page links or refresh.';
      }
    } finally {
      state.busy = false;
      if (scroller === state && state.next && !state.notice.textContent &&
          state.marker.getBoundingClientRect().top < innerHeight + 600) {
        loadMore(state);
      }
    }
  }

  function stopScroll() {
    scroller?.observer.disconnect();
    scroller?.marker.remove();
    scroller?.notice.remove();
    if (scroller?.pagination?.isConnected) {
      scroller.pagination.hidden = scroller.wasHidden;
    }
    scroller = null;
  }

  function startScroll() {
    const view = libraryView();
    if (settings.infiniteScroll === false || !ownProfile() || !view) {
      stopScroll();
      return;
    }
    const candidate = visibleLibraryTable();
    if (!candidate || scroller?.table === candidate.table) return;
    stopScroll();
    const { section, table, pagination } = candidate;
    const next = nextPage(pagination, location.href);
    if (!next || !pagination) return;
    const marker = document.createElement('div');
    marker.style.height = '1px';
    marker.setAttribute('aria-hidden', 'true');
    const notice = document.createElement('div');
    table.after(marker, notice);
    const state = {
      section, table, pagination, marker, notice, next, view,
      tableIndex: [...document.querySelectorAll('table.chartlist')].indexOf(table),
      wasHidden: pagination.hidden, visited: new Set([location.href]),
      busy: false, observer: null
    };
    scroller = state;
    state.observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadMore(state);
    }, { rootMargin: '600px 0px' });
    state.observer.observe(marker);
  }

  function flush() {
    queued = false;
    if (!ownProfile()) return;
    for (const node of pending) applyNames(node);
    pending.clear();
    startScroll();
  }

  async function init() {
    const stored = await chrome.storage.local.get(['settings', 'rules']);
    settings = { ...DEFAULT_SETTINGS, ...(stored.settings || {}) };
    rules = R.clean(stored.rules);
    if (!ownProfile()) return;
    applyNames(document.body);
    startScroll();

    new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) pending.add(node);
        }
      }
      if (!queued) {
        queued = true;
        setTimeout(flush, 80);
      }
    }).observe(document.body, { childList: true, subtree: true });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.rules) rules = R.clean(changes.rules.newValue);
      if (changes.settings) settings = {
        ...DEFAULT_SETTINGS, ...(changes.settings.newValue || {})
      };
      applyNames(document.body);
      startScroll();
    });
  }

  init().catch(error => console.error('Last.fm Personal Library:', error));
})();
