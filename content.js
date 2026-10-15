(() => {
  'use strict';
  const R = LastfmRules;
  const A = LastfmAdapter;
  const S = LastfmStore;
  let settings = S.DEFAULT_SETTINGS;
  let rules = R.empty();
  let scroller = null;
  let observer;
  let queued = false;
  let currentUrl = location.href;
  const pending = new Set();
  const changed = new Map();
  const ownProfile = () => A.ownProfile(location.href, settings.username);

  function nameNode(element, name) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (R.normalize(node.nodeValue) === R.normalize(name)) return node;
    }
    return null;
  }

  function replaceName(element, item) {
    if (!item) return;
    let saved = changed.get(element);
    if (saved && !saved.node.isConnected) {
      changed.delete(element);
      saved = null;
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
    for (const { node, original } of changed.values()) {
      if (node.isConnected) node.nodeValue = original;
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

  function renderScroll(state, mode, message) {
    state.mode = mode;
    if (mode === 'complete') {
      // Keep the completed state so DOM updates cannot restart page-one links.
      state.notice.remove();
      return;
    }
    state.label.textContent = message;
    state.notice.dataset.state = mode;
    state.action.textContent = mode === 'loading' ? 'Pause loading'
      : mode === 'error' ? 'Try again'
      : mode === 'paused' ? 'Resume loading' : 'Load next page';
    state.notice.setAttribute('aria-busy', String(mode === 'loading'));
  }

  async function appendRows(state, sourceTable, pageUrl) {
    const added = [], rows = [];
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
    for (const row of rows) {
      row.querySelectorAll('img[data-src]').forEach(img => {
        if (!img.getAttribute('src') || img.getAttribute('src').startsWith('data:')) {
          img.src = new URL(img.dataset.src, pageUrl).href;
        }
      });
    }
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
    if (scroller !== state || state.controller?.signal.aborted) {
      added.forEach(node => node.remove());
      if (state.controller?.signal.aborted) throw new DOMException('Loading paused.', 'AbortError');
      return false;
    }
    if (rows.some(row => row.getBoundingClientRect().height === 0)) {
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

  async function loadMore(state) {
    if (scroller !== state || state.mode === 'loading' || !state.next ||
        !ownProfile() || document.hidden) return;
    state.controller = new AbortController();
    renderScroll(state, 'loading', 'Loading the next library page…');
    try {
      const page = await LastfmPages.get(state.next, { signal: state.controller.signal });
      if (scroller !== state || !ownProfile() || state.controller.signal.aborted) return;
      const url = new URL(page.url);
      if (url.pathname !== new URL(currentUrl).pathname ||
          url.searchParams.get('page') !== new URL(state.next).searchParams.get('page')) {
        throw new Error('Last.fm returned a different library page. Loading stopped.');
      }
      const source = page.doc.querySelectorAll('table.chartlist')[state.tableIndex];
      if (!source) throw new Error('The library layout changed. Use Last.fm’s page links below.');
      if (!await appendRows(state, source, page.url)) return;
      state.pagination.hidden = true;
      state.visited.add(state.next);
      const next = A.nextPage(page.doc, page.url);
      state.next = next && !state.visited.has(next) ? next : null;
      state.loaded++;
      renderScroll(state, state.next ? 'ready' : 'complete', state.next
        ? `${state.loaded} more ${state.loaded === 1 ? 'page' : 'pages'} loaded. Keep scrolling.`
        : 'You’ve reached the end of this library view.');
      if (!state.next) state.observer.disconnect();
    } catch (error) {
      if (scroller !== state) return;
      state.pagination.hidden = false;
      renderScroll(state, error.name === 'AbortError' || LastfmPages.status().rateLimited
        ? 'paused' : 'error', error.name === 'AbortError'
        ? 'Loading paused. Your loaded rows are still here.' : error.message);
    }
  }

  function stopScroll() {
    if (!scroller) return;
    scroller.controller?.abort();
    scroller.observer.disconnect();
    scroller.notice.remove();
    scroller.pagination.hidden = scroller.wasHidden;
    scroller = null;
  }

  function startScroll() {
    if (!ownProfile() || !settings.infiniteScroll || !A.libraryView(location.href)) {
      stopScroll(); return;
    }
    if (scroller?.table.isConnected) return;
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
    notice.append(label, action);
    const isHistory = ['scrobbles', 'artistScrobbles'].includes(A.libraryView(location.href));
    const lastSection = isHistory ? datedSections(table)?.at(-1) : null;
    (lastSection || table).after(notice);
    const state = { table, lastSection, pagination, notice, label, action, next,
      wasHidden: pagination.hidden, tableIndex: [...document.querySelectorAll('table.chartlist')].indexOf(table),
      visited: new Set([location.href]), loaded: 0, controller: null, observer: null, mode: 'ready' };
    scroller = state;
    renderScroll(state, 'ready', 'Keep scrolling is ready.');
    action.addEventListener('click', async () => {
      if (state.mode === 'loading') { state.controller.abort(); return; }
      try {
        if (LastfmPages.status().rateLimited) await LastfmPages.resume();
        await loadMore(state);
      } catch (error) { renderScroll(state, 'error', error.message); }
    });
    state.observer = new IntersectionObserver(entries => {
      if (state.mode === 'ready' && entries.some(entry => entry.isIntersecting)) loadMore(state);
    }, { rootMargin: '400px 0px' });
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
    startScroll();
  }

  function status() {
    return { version: chrome.runtime.getManifest().version, username: settings.username,
      ownProfile: ownProfile(), view: A.libraryView(location.href),
      scrollState: scroller?.mode || (settings.infiniteScroll ? 'unavailable' : 'off'),
      ...LastfmPages.status(), artwork: globalThis.LastfmArtwork?.status() };
  }
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message?.type === 'lfm:status') reply(status());
  });

  async function init() {
    const applyState = state => {
      settings = state.settings;
      rules = state.rules;
      refresh();
    };
    S.subscribe(applyState);
    applyState(await S.read());
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
      if (pending.size && !queued) { queued = true; setTimeout(flush, 60); }
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    addEventListener('popstate', refresh);
    addEventListener('pagehide', event => {
      if (event.persisted) {
        // The browser retains these rows in its history cache. Keep their next
        // page/completion state so returning cannot append the same page again.
        scroller?.controller?.abort(); scroller?.observer.disconnect();
      } else stopScroll();
      observer.disconnect();
    });
    addEventListener('pageshow', event => { if (event.persisted) {
      observer.observe(document.body, { childList: true, characterData: true, subtree: true });
      refresh();
      if (scroller && scroller.mode !== 'complete') scroller.observer.observe(scroller.notice);
    } });
  }
  init().catch(error => console.error('Last.fm Personal Library:', error.message));
})();
