(() => {
  'use strict';
  const S = LastfmStore, R = LastfmRules, C = LastfmLibraryCache, $ = id => document.getElementById(id);
  const names = { tracks: 'Song', albums: 'Album', artists: 'Artist' }, size = 100;
  const equal = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  let snapshot, cache, scan, reviewProfile = '', entries = [], batch, page = 1, busy = false, stale = false, controller, confirmation;
  const selected = () => entries.filter(e => e.selected && e.choice && e.choice !== e.before);
  function message(text = '', error = false) { $('message').textContent = text; $('message').dataset.tone = error ? 'error' : 'success'; }
  function setBusy(value) {
    busy = value;
    $('xml-file').disabled = value || !snapshot?.settings.username;
    $('compare').disabled = value || !snapshot?.settings.username || !$('xml-file').files.length;
    for (const id of ['refresh-review', 'revert', 'select-all']) $(id).disabled = value;
    $('apply').disabled = value || stale || !selected().length;
  }
  function filtered() {
    const query = R.normalize($('search').value), type = $('type-filter').value, kind = $('review-filter').value;
    return entries.filter(e => (!e.choice || e.choice !== e.before) && (!type || type === e.type) &&
      (!kind || (kind === 'unresolved' ? !e.choice : !!e.expected)) &&
      (!query || [e.before, e.artist || '', ...e.variants].some(v => R.normalize(v).includes(query))));
  }
  function summary() {
    const n = selected().length, eligible = entries.filter(e => e.choice && e.choice !== e.before);
    $('selected-count').textContent = n.toLocaleString() + ' selected';
    $('select-all').checked = eligible.length > 0 && n === eligible.length;
    $('select-all').indeterminate = n > 0 && n < eligible.length;
    $('apply-summary').textContent = n.toLocaleString() + ' casing changes';
    $('apply').disabled = busy || stale || !n;
    $('stale-notice').hidden = !scan;
  }
  function draw() {
    const list = filtered(), total = Math.max(1, Math.ceil(list.length / size));
    page = Math.min(Math.max(1, page), total);
    $('candidates').replaceChildren();
    for (const entry of list.slice((page - 1) * size, page * size)) {
      const row = document.createElement('tr'); row.dataset.id = entry.id; row.dataset.type = entry.type;
      const cell = text => { const c = row.insertCell(); c.textContent = text; return c; };
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = entry.selected && !!entry.choice;
      check.disabled = busy || !entry.choice || entry.choice === entry.before;
      check.setAttribute('aria-label', 'Use ' + entry.before);
      check.addEventListener('change', () => { entry.selected = check.checked; summary(); }); cell('').append(check);
      const context = cell(names[entry.type]);
      if (entry.artist) { const artist = document.createElement('span'); artist.className = 'artist-context'; artist.textContent = entry.artist; context.append(artist); }
      cell(entry.before); const arrow = cell('→'); arrow.className = 'arrow'; const after = cell(entry.choice || '');
      if (entry.variants.length > 1) {
        const select = document.createElement('select'); select.setAttribute('aria-label', 'Choose casing for ' + entry.before);
        for (const value of ['', ...entry.variants]) { const o = document.createElement('option'); o.value = value; o.textContent = value || 'Choose casing…'; select.append(o); }
        select.value = entry.choice; select.disabled = busy;
        select.addEventListener('change', () => { entry.choice = select.value; entry.selected = false; draw(); }); after.replaceChildren(select);
      }
      if (entry.expected) { const note = document.createElement('span'); note.className = 'replacement-note'; note.textContent = 'Replaces saved casing'; after.append(note); }
      $('candidates').append(row);
    }
    $('shown-count').textContent = list.length.toLocaleString() + ' changes';
    $('empty').hidden = !!list.length;
    $('page-label').textContent = 'Page ' + page + ' of ' + total;
    $('previous').disabled = page === 1; $('next').disabled = page === total;
    summary();
  }
  function build(keep = false) {
    const choices = new Map(entries.map(e => [e.type + e.id, e.choice]));
    reviewProfile = snapshot.settings.username;
    const matched = C.compare(scan, cache, snapshot.rules);
    entries = matched.candidates.map(e => {
      const expected = snapshot.rules[e.type]?.[e.id] || null;
      const choice = keep && choices.has(e.type + e.id) ? choices.get(e.type + e.id) : e.variants.length === 1 ? e.to : '';
      return { ...e, choice, expected: structuredClone(expected), selected: !expected && !!choice };
    });
    stale = false; page = 1; $('review').hidden = false;
    $('scan-summary').textContent = entries.length.toLocaleString() + ' changes · ' + entries.filter(e => !e.choice).length.toLocaleString() + ' need a casing choice' + (C.status(cache).complete ? '' : ' · Partial library');
    draw();
  }
  async function refresh() {
    snapshot = await S.read(); batch = (await S.itunesStatus()).batch;
    $('profile-status').textContent = snapshot.settings.username || 'Not connected';
    if (!snapshot.settings.username) message('Connect your Last.fm profile in Settings before importing XML.', true);
    $('revert-section').hidden = !batch;
    if (batch) $('batch-summary').textContent = batch.remaining.toLocaleString() + ' changes can be undone. Later edits are kept.';

  }
  $('xml-file').addEventListener('change', () => { scan = null; entries = []; $('review').hidden = true; setBusy(false); message(); });
  $('compare').addEventListener('click', async () => {
    if (busy || !$('xml-file').files.length) return;
    controller = new AbortController(); const signal = controller.signal, user = snapshot.settings.username;
    reviewProfile = user;
    setBusy(true); $('review').hidden = true; $('scan-status').hidden = false; $('scan-error').textContent = ''; message();
    try {
      const combined = new Map(); let songs = 0;
      for (const file of $('xml-file').files) {
        const result = await LastfmItunes.scanFile(file, { signal, onProgress: p => {
          $('scan-progress').max = p.totalBytes; $('scan-progress').value = p.bytesRead;
          $('scan-label').textContent = 'Reading XML · ' + p.processed.toLocaleString() + ' songs';
        } });
        songs += result.songs;
        for (const candidate of result.candidates) {
          const key = candidate.type + candidate.id, old = combined.get(key);
          combined.set(key, old ? { ...old, variants: [...new Set([...old.variants, ...candidate.variants])] } : candidate);
        }
      }
      scan = { songs, candidates: [...combined.values()] }; $('scan-progress').removeAttribute('value');
      cache = await S.cacheLibrary('read');
      if(!cache)throw new Error('Start caching your Last.fm library, then compare again.');
      if (signal.aborted) throw new DOMException('Comparison paused.', 'AbortError');
      await refresh();
      if (snapshot.settings.username !== user || cache.username !== user) throw new Error('Your connected profile changed. Compare again.');
      build();
    } catch (error) {
      if (signal.aborted || error.name === 'AbortError') message('Paused. Compare again to resume.');
      else $('scan-error').textContent = error.message;
      try { await refresh(); cache = await S.cacheLibrary('read'); if (scan && cache && cache.username === user && snapshot.settings.username === user) build(); }
      catch { /* Keep the original comparison error visible. */ }
    } finally { controller = null; $('scan-status').hidden = true; setBusy(false); if (!$('review').hidden) draw(); }
  });
  $('cancel-scan').addEventListener('click', () => controller?.abort());
  $('select-all').addEventListener('change', e => { for (const entry of entries) entry.selected = e.target.checked && !!entry.choice && entry.choice !== entry.before; draw(); });
  for (const id of ['search', 'type-filter', 'review-filter']) $(id).addEventListener(id === 'search' ? 'input' : 'change', () => { page = 1; draw(); });
  $('previous').addEventListener('click', () => { page--; draw(); }); $('next').addEventListener('click', () => { page++; draw(); });
  $('refresh-review').addEventListener('click', async () => {
    try { await refresh(); cache = await S.cacheLibrary('read'); build(true); } catch (error) { message(error.message, true); }
  });
  function confirm(action, payload, detail) {
    confirmation = { action, payload }; $('confirm-heading').textContent = action === 'apply' ? 'Save casing changes?' : 'Undo last import?';
    $('confirm-detail').textContent = detail; $('confirm').textContent = action === 'apply' ? 'Save casing changes' : 'Undo';
    $('confirm-dialog').showModal(); $('cancel-confirm').focus();
  }
  $('apply').addEventListener('click', () => {
    if (busy || stale || !selected().length) return;
    const chosen = selected();
    confirm('apply', { username: reviewProfile, cacheId: cache.id, entries: chosen.map(e => ({ type: e.type, id: e.id,
      rule: { from: e.from, to: e.choice, ...(e.artist ? { artist: e.artist } : {}), exact: true }, expected: e.expected })) },
      chosen.length.toLocaleString() + ' display changes. ' + chosen.filter(e => e.expected).length + ' saved preferences replaced.' +
      (batch?.remaining ? ' This replaces the previous import’s undo record.' : '') + ' Scrobbles stay unchanged.');
  });
  $('revert').addEventListener('click', () => { if (batch && !busy) confirm('revert', { id: batch.id }, 'Restore the previous display preferences. Later edits are kept.'); });
  $('cancel-confirm').addEventListener('click', () => $('confirm-dialog').close());
  $('confirm-dialog').addEventListener('close', () => { confirmation = null; });
  $('confirm').addEventListener('click', async () => {
    if (!confirmation || busy) return;
    const { action, payload } = confirmation; $('confirm-dialog').close(); setBusy(true);
    try {
      const out = action === 'apply' ? await S.applyItunes(payload) : await S.revertItunes(payload);
      message(action === 'apply' ? out.applied.toLocaleString() + ' casing changes saved locally.' : out.reverted.toLocaleString() + ' changes undone.');
      await refresh(); if (scan && cache) build(true);
    } catch (error) { stale = true; message(error.message, true); }
    finally { setBusy(false); if (entries.length) draw(); }
  });
  $('export').addEventListener('click', async () => {
    try { const data = await S.backup(), url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'lastfm-display-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { message(error.message, true); }
  });
  window.addEventListener('lfm-cache-changed',event=>{if(cache&&event.detail?.cache?.id!==cache.id){stale=true;summary()}});
  S.subscribe(next => {
    snapshot = next; $('profile-status').textContent = next.settings.username || 'Not connected';
    if (controller && reviewProfile && reviewProfile !== next.settings.username) controller.abort();
    if (!busy && entries.length) { stale = reviewProfile !== next.settings.username || entries.some(e => !equal(e.expected, next.rules[e.type]?.[e.id])); summary(); }
    setBusy(busy);
  });
  refresh().then(() => setBusy(false)).catch(error => message(error.message, true));
})();
