(() => {
  'use strict';
  if (globalThis.LastfmContent) { LastfmContent.refresh(); return; }
  const R = LastfmRules;
  const A = LastfmAdapter;
  const S = LastfmStore;
  let settings = S.DEFAULT_SETTINGS;
  let rules = R.empty();
  let scroller = null;
  let observer;
  let scrollTimer;
  let queued = false;
  let currentUrl = location.href;
  const pending = new Set();
  const changed = new Map();
  const ownProfile = () => A.ownProfile(location.href, settings.username);
  const canScroll = () => settings.infiniteScroll && A.scrollView(location.href);

  function nameNode(element, name) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (R.normalize(node.nodeValue) === R.normalize(name)) return node;
    }
    return null;
  }

  function replaceName(element, item) {
    if (!item) return;
    // Verify Last.fm's double-escaped literal '+' against the actual text.
    // Never substitute a different title based on a decoded URL alone.
    if (/%2b/i.test(item.name)) {
      const literal = item.name.replace(/%2b/gi, '+');
      if (nameNode(element, literal)) item = { ...item, name: literal };
    }
    let saved = changed.get(element);
    if (saved && (!saved.node.isConnected || !element.contains(saved.node))) {
      changed.delete(element);
      saved = null;
    }
    // Another renderer owns its replacement text. Never restore our stale
    // baseline over it, or keep rewriting a title changed by another tool.
    if (saved && saved.node.nodeValue !== saved.applied) {
      changed.delete(element);
      return;
    }
    if (!saved) {
      const node = nameNode(element, item.name);
      if (!node) return;
      saved = { node, original: node.nodeValue };
    }
    const preferred = R.get(rules, item.type, item.name, item.artist) ||
      (item.type === 'artists' ? R.get(rules, 'albumArtists', item.name) : null);
    const whitespace = saved.original.match(/^(\s*)(.*?)(\s*)$/s);
    const value = preferred
      ? (whitespace ? whitespace[1] + preferred + whitespace[3] : preferred)
      : saved.original;
    if (saved.node.nodeValue !== value) saved.node.nodeValue = value;
    saved.applied = value;
    if (preferred) changed.set(element, saved);
    else changed.delete(element);
  }

  function spaceDuration(link) {
    const cell = link.closest('.chartlist-name');
    if (!cell || !cell.closest('tr.chartlist-row')) return;
    let last = link;
    while (last.parentElement !== cell && last.parentElement) last = last.parentElement;
    const next = last.nextSibling;
    if (next && /^\(\d+:\d{2}(?::\d{2})?\)/.test(next.textContent || '')) {
      cell.insertBefore(document.createTextNode(' '), next);
    }
  }

  function applyLink(link) {
    if (link.closest('[data-lfm-ui]')) return;
    const item = A.musicItem(link);
    replaceName(link, item);
    if (item?.type === 'tracks') spaceDuration(link);
  }

  function applyNames(root) {
    if (!ownProfile() || !root?.isConnected) return;
    if (root.matches?.('a[href]')) applyLink(root);
    root.querySelectorAll?.('a[href]').forEach(applyLink);
    const item = A.musicItem(location.href);
    if (item) {
      if (root.matches?.('h1,.library-header-title')) replaceName(root, item);
      root.querySelectorAll?.('h1,.library-header-title').forEach(h => replaceName(h, item));
    }
  }

  function restoreNames() {
    for (const { node, original, applied } of changed.values()) {
      if (node.isConnected && node.nodeValue === applied) node.nodeValue = original;
    }
    changed.clear();
  }

  function libraryTable() {
    return [...document.querySelectorAll('table.chartlist')].find(table =>
      table.querySelector('tbody tr.chartlist-row') && table.getBoundingClientRect().height > 0 &&
      paginationFor(table));
  }

  function paginationFor(table) {
    for (let parent = table.parentElement; parent; parent = parent.parentElement) {
      const pagination = [...parent.querySelectorAll('nav.pagination')].find(nav =>
        !nav.hidden && nav.getBoundingClientRect().height > 0);
      if (pagination) return pagination;
    }
    return null;
  }

  function datedSections(table) {
    const section = table.closest('section.tracklist-section');
    return section && [...section.parentElement.children]
      .filter(node => node.matches('section.tracklist-section'));
  }

  function historyEntry(row) {
    const form = row.querySelector('form[data-edit-scrobble]');
    const value = name => {
      const fields = form?.querySelectorAll(`[name="${name}"]`);
      return fields?.length === 1 ? fields[0].value : null;
    };
    let artist = value('artist_name'), track = value('track_name');
    let time = /^\d+$/.test(value('timestamp') || '') ? Number(value('timestamp')) * 1000 : NaN;
    if (!Number.isFinite(time)) {
      time = Date.parse(row.querySelector('time[datetime]')?.getAttribute('datetime'));
      const item = [...row.querySelectorAll('a[href]')].map(link => A.musicItem(link)).find(item => item?.type === 'tracks');
      artist = item?.artist; track = item?.name;
    }
    return Number.isFinite(time) && artist && track
      ? { time, key: JSON.stringify([time, R.normalize(artist), R.normalize(track)]) } : null;
  }

  function askScroll(state) {
    state.automatic = false;
    const count = state.loaded + 1;
    renderScroll(state, 'prompt', count >= state.checkpoint
      ? `${count} pages are loaded. Load next page?`
      : 'Load next page?');
  }

  function renderScroll(state, mode, message) {
    state.mode = mode;
    if (mode === 'complete') {
      // Keep the completed state so DOM updates cannot restart page-one links.
      state.notice.remove();
      return;
    }
    state.label.textContent = message;
    state.notice.dataset.state = mode;
    state.action.textContent = mode === 'prompt' ? 'Yes'
      : mode === 'loading' || mode === 'ready' ? 'Pause loading'
      : mode === 'error' ? 'Try again'
      : mode === 'paused' ? 'Resume loading' : 'Load next page?';
    state.no.hidden = state.always.hidden = mode !== 'prompt';
    state.notice.setAttribute('aria-busy', String(mode === 'loading'));
  }

  async function appendRows(state, sourceTable, pageUrl, controller) {
    const added = [];
    let rows = [];
    let lastSection = state.lastSection;
    let copies;
    if (lastSection) {
      const sections = datedSections(sourceTable);
      if (!sections?.length) throw new Error('The scrobble date sections changed. Use Last.fm’s page links below.');
      copies = sections.map(section => document.importNode(section, true));
      // Validate the whole fetched page before changing the visible history.
      for (const copy of copies) {
        if (!copy.querySelector('h2.date-heading')?.textContent.trim() || !copy.querySelector('table.chartlist tbody > tr.chartlist-row')) {
          throw new Error('A scrobble date section contained no library rows. Loading stopped.');
        }
        rows.push(...copy.querySelectorAll('table.chartlist tbody > tr.chartlist-row'));
      }
    } else {
      rows.push(...[...sourceTable.querySelectorAll('tbody > tr.chartlist-row')]
        .map(row => document.importNode(row, true)));
    }
    if (!rows.length) throw new Error('This page contained no library rows. Loading stopped.');
    if (lastSection) {
      const existing = datedSections(state.table).flatMap(section => [...section.querySelectorAll('tr.chartlist-row')])
        .map(historyEntry).filter(Boolean);
      const seen = new Set(existing.map(entry => entry.key));
      let oldest = existing.at(-1)?.time ?? Infinity;
      // Offset pages can repeat plays when fresh scrobbles arrive during a pause.
      // Compare play identities, not song names: real repeated listens survive.
      rows = rows.filter(row => {
        const entry = historyEntry(row);
        if (!entry) return true;
        if (seen.has(entry.key)) { row.remove(); return false; }
        if (entry.time > oldest) throw new Error('Last.fm returned reordered history. Refresh this view before continuing.');
        oldest = entry.time; seen.add(entry.key); return true;
      });
      copies = copies.filter(copy => copy.querySelector('tr.chartlist-row'));
    }
    for (const row of rows) {
      row.querySelectorAll('img[data-src]').forEach(img => {
        if (!img.getAttribute('src') || img.getAttribute('src').startsWith('data:')) {
          img.src = new URL(img.dataset.src, pageUrl).href;
        }
      });
    }
    await globalThis.LastfmArtwork?.prepareRows(rows, {signal:controller.signal});
    if (scroller !== state || !state.active || state.controller !== controller || controller.signal.aborted) return false;
    if (lastSection) {
      const heading = section => section.querySelector('h2.date-heading')?.textContent.trim();
      for (const copy of copies) {
        const incoming = [...copy.querySelectorAll('table.chartlist tbody > tr.chartlist-row')];
        if (heading(lastSection) === heading(copy)) {
          lastSection.querySelector('table.chartlist').tBodies[0].append(...incoming);
          added.push(...incoming);
        } else {
          lastSection.after(copy);
          added.push(copy);
          lastSection = copy;
        }
      }
    } else {
      state.table.tBodies[0].append(...rows);
      added.push(...rows);
    }
    await new Promise(requestAnimationFrame);
    if (scroller !== state || !state.active || state.controller !== controller || controller.signal.aborted) {
      added.forEach(node => node.remove());
      if (controller.signal.aborted) throw new DOMException('Loading paused.', 'AbortError');
      return false;
    }
    // A styling extension may deliberately hide individual rows.
    if (rows.every(row => row.getBoundingClientRect().height === 0)) {
      added.forEach(node => node.remove());
      throw new Error('Last.fm hid the added rows. Use its page links below.');
    }
    if (lastSection) {
      state.lastSection = lastSection;
      lastSection.after(state.notice);
    }
    rows.forEach(applyNames);
    return true;
  }

  async function loadMore(state, resume = false) {
    if (scroller !== state || !state.active || state.mode === 'loading' || !state.next ||
        !canScroll() || document.hidden) return;
    const controller = new AbortController();
    state.controller = controller;
    renderScroll(state, 'loading', 'Loading the next library page…');
    try {
      if (resume && LastfmPages.status().rateLimited) await LastfmPages.resume();
      if (scroller !== state || !state.active || state.controller !== controller || controller.signal.aborted) return;
      const page = await LastfmPages.get(state.next, { signal: controller.signal, priority: 'navigation' });
      if (scroller !== state || !state.active || state.controller !== controller || !canScroll() || controller.signal.aborted) return;
      const url = new URL(page.url);
      if (url.pathname !== new URL(currentUrl).pathname &&
          !globalThis.LastfmRedirects?.samePagePath(currentUrl, page.url) ||
          url.searchParams.get('page') !== new URL(state.next).searchParams.get('page')) {
        throw new Error('Last.fm returned a different library page. Loading stopped.');
      }
      const source = page.doc.querySelectorAll('table.chartlist')[state.tableIndex];
      if (!source) throw new Error('The library layout changed. Use Last.fm’s page links below.');
      if (!await appendRows(state, source, page.url, controller)) return;
      state.pagination.hidden = true;
      state.visited.add(state.next);
      const next = A.nextPage(page.doc, page.url);
      state.next = next && !state.visited.has(next) ? next : null;
      state.loaded++;
      if (!state.next) {
        renderScroll(state, 'complete', 'You’ve reached the end of this library view.');
        state.observer.disconnect();
      } else if (!state.automatic || state.loaded + 1 >= state.checkpoint) askScroll(state);
      else {
        renderScroll(state, 'ready', `${state.loaded + 1} pages loaded. Keep scrolling.`);
        const bounds = state.notice.getBoundingClientRect();
        if (bounds.bottom > 0 && bounds.top < innerHeight + 1200) setTimeout(() => {
          if (state.mode === 'ready' && state.automatic) void loadMore(state);
        }, 0);
      }
    } catch (error) {
      if (scroller !== state || !state.active || state.controller !== controller) return;
      state.automatic = false;
      state.pagination.hidden = false;
      renderScroll(state, error.name === 'AbortError' || LastfmPages.status().rateLimited
        ? 'paused' : 'error', error.name === 'AbortError'
        ? 'Loading paused. Your loaded rows are still here.' : error.message);
    }
  }

  function suspendScroll() {
    if (!scroller?.active) return;
    scroller.active = false;
    scroller.automatic = false;
    scroller.controller?.abort();
    scroller.observer.disconnect();
    scroller.notice.remove();
    scroller.pagination.hidden = scroller.wasHidden;
    if (scroller.mode === 'loading') renderScroll(scroller, 'paused', 'Loading paused. Your loaded rows are still here.');
    else if (scroller.mode === 'ready') askScroll(scroller);
  }
  function stopScroll() {
    suspendScroll();
    scroller = null;
  }

  function startScroll() {
    // Casing runs during parsing; layout and navigation controls wait for idle.
    if (!globalThis.LastfmPages || document.readyState === 'loading') return;
    if (!canScroll()) {
      suspendScroll(); return;
    }
    if (scroller?.table.isConnected) {
      if (!scroller.active) {
        scroller.active = true;
        scroller.pagination.hidden = scroller.loaded > 0 || scroller.wasHidden;
        if (scroller.mode !== 'complete') {
          (scroller.lastSection || scroller.table).after(scroller.notice);
          scroller.observer.observe(scroller.notice);
        }
      }
      return;
    }
    stopScroll();
    // A replaced library container can include copies of our old controls.
    document.querySelectorAll('[data-lfm-ui="scroll"]').forEach(notice => notice.remove());
    const table = libraryTable();
    if (!table) return;
    const pagination = paginationFor(table);
    const next = A.nextPage(pagination, location.href);
    if (!next) return;
    const notice = document.createElement('div');
    notice.className = 'lfm-scroll-status';
    notice.dataset.lfmUi = 'scroll';
    const label = document.createElement('span');
    label.setAttribute('role', 'status');
    const action = document.createElement('button');
    action.type = 'button';
    const no = document.createElement('button'), always = document.createElement('button');
    no.type = always.type = 'button'; no.textContent = 'No'; always.textContent = 'Always';
    const actions = document.createElement('div');
    actions.className = 'lfm-scroll-actions';
    actions.append(action, no, always); notice.append(label, actions);
    const isHistory = ['scrobbles', 'artistScrobbles'].includes(A.libraryView(location.href));
    const lastSection = isHistory ? datedSections(table)?.at(-1) : null;
    (lastSection || table).after(notice);
    const state = { table, lastSection, pagination, notice, label, action, no, always, next,
      wasHidden: pagination.hidden, tableIndex: [...document.querySelectorAll('table.chartlist')].indexOf(table),
      visited: new Set([location.href]), loaded: 0, checkpoint: 10, automatic: false,
      controller: null, observer: null, mode: 'prompt', active: true };
    scroller = state;
    askScroll(state);
    action.addEventListener('click', () => {
      if (scroller !== state || !state.active) return;
      state.automatic = false;
      if (state.mode === 'loading') { state.controller.abort(); return; }
      if (state.mode === 'ready') { renderScroll(state, 'paused', 'Loading paused. Your loaded rows are still here.'); return; }
      if (state.mode === 'declined') { askScroll(state); return; }
      // Only the explicit 'Resume loading' / 'Try again' button may end a Last.fm
      // cooldown early. Answering 'Yes' to the next-page prompt must not.
      void loadMore(state, state.mode === 'paused' || state.mode === 'error');
    });
    no.addEventListener('click', () => {
      if (scroller !== state || !state.active || state.mode !== 'prompt') return;
      state.automatic = false; state.pagination.hidden = state.wasHidden;
      renderScroll(state, 'declined', 'Page loading is off for this view. Your loaded rows are still here.');
      state.action.focus({ preventScroll: true });
    });
    always.addEventListener('click', () => {
      if (scroller !== state || !state.active || state.mode !== 'prompt') return;
      state.automatic = true;
      if (state.loaded + 1 >= state.checkpoint) state.checkpoint = (Math.floor((state.loaded + 1) / 10) + 1) * 10;
      void loadMore(state);
      state.action.focus({ preventScroll: true });
    });
    state.observer = new IntersectionObserver(entries => {
      if (state.mode === 'ready' && state.automatic && entries.some(entry => entry.isIntersecting)) void loadMore(state);
    }, { rootMargin: '400px 0px 1200px 0px' });
    state.observer.observe(notice);
  }

  function refresh() {
    if (currentUrl !== location.href) {
      currentUrl = location.href;
      stopScroll();
      restoreNames();
    }
    if (ownProfile()) applyNames(document.body);
    else restoreNames();
    startScroll();
  }

  function flush() {
    queued = false;
    if (currentUrl !== location.href) refresh();
    for (const node of pending) applyNames(node);
    pending.clear();
    for (const [element] of changed) if (!element.isConnected) changed.delete(element);
    if (scrollTimer === undefined) scrollTimer = setTimeout(() => {
      scrollTimer = undefined; startScroll();
    }, 60);
  }

  function profileAvatar() {
    const source = document.querySelector('header .avatar img')?.src;
    try {
      const url = new URL(source);
      return url.protocol === 'https:' && url.hostname === 'lastfm-img.freetls.fastly.net' ? url.href : '';
    } catch (_) { return ''; }
  }

  function status() {
    return { version: chrome.runtime.getManifest().version, username: settings.username,
      ownProfile: ownProfile(), view: A.libraryView(location.href),
      scrollState: settings.infiniteScroll ? (scroller?.active ? scroller.mode : 'unavailable') : 'off',
      ...globalThis.LastfmPages?.status(), artwork: globalThis.LastfmArtwork?.status(),
      redirects: globalThis.LastfmRedirects?.status(),
      imageRecovery: globalThis.LastfmImageRecovery?.status(),
      avatar: ownProfile() ? profileAvatar() : '' };
  }
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message?.type === 'lfm:status') reply(status());
    if (message?.type === 'lfm:refresh-artwork') {
      if (sender.id !== chrome.runtime.id || !ownProfile() || !globalThis.LastfmArtwork?.refresh) {
        reply({ ok: false, error: 'Open your connected Last.fm profile first.' }); return;
      }
      LastfmArtwork.refresh().then(result => {
        reply({ ok: true, ...result });
        setTimeout(() => location.reload(), 100);
      }).catch(error => reply({ ok: false, error: error.message }));
      return true;
    }
  });

  async function init() {
    const applyState = state => {
      settings = state.settings;
      rules = state.rules;
      refresh();
    };
    let revision = 0;
    S.subscribe(state => { revision++; applyState(state); });
    const initialRevision = revision;
    const initial = await S.readDisplay();
    if (revision === initialRevision) applyState(initial);
    observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.target.parentElement?.closest('[data-lfm-ui]')) continue;
        if (record.type === 'characterData') {
          const element = record.target.parentElement?.closest('a[href],h1,.library-header-title');
          if (element) pending.add(element);
        } else {
          for (const node of record.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && !node.matches('[data-lfm-ui]')) pending.add(node);
          }
        }
      }
      if (pending.size && !queued) { queued = true; queueMicrotask(flush); }
    });
    observer.observe(document, { childList: true, characterData: true, subtree: true });
    addEventListener('DOMContentLoaded', refresh, { once: true });
    addEventListener('popstate', refresh);
    addEventListener('pagehide', event => {
      if (event.persisted) {
        // The browser retains these rows in its history cache. Keep their next
        // page/completion state so returning cannot append the same page again.
        suspendScroll();
      } else stopScroll();
      observer.disconnect();
    });
    addEventListener('pageshow', event => { if (event.persisted) {
      observer.observe(document, { childList: true, characterData: true, subtree: true });
      refresh();
    } });
  }
  globalThis.LastfmContent = Object.freeze({ refresh });
  init().catch(error => console.error('LastWord for Last.fm:', error.message));
})();
