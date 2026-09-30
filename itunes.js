(() => {
  'use strict';
  const S = globalThis.LastfmStore, R = globalThis.LastfmRules, P = globalThis.LastfmItunes;
  const $ = id => document.getElementById(id);
  const names = { artists: 'Artist', albums: 'Album', tracks: 'Track', albumArtists: 'Album artist' };
  const plural = { artists: 'artists', albums: 'albums', tracks: 'tracks', albumArtists: 'album artists' };
  const size = 100;
  const equal = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  let snapshot = null, reviewProfile = '', batch = null, result = null, entries = [];
  let page = 1, busy = false, stale = false, controller = null, confirmation = null;
  function message(value, error = false) {
    $('message').textContent = value;
    $('message').dataset.tone = error ? 'error' : 'success';
  }
  function setBusy(value) {
    busy = value;
    $('xml-file').disabled = value || !snapshot;
    for (const id of ['refresh-review', 'select-filtered', 'clear-filtered', 'select-all', 'clear-all', 'revert']) $(id).disabled = value;
    $('apply').disabled = value || stale || !selected().length;
  }
  function chosen(entry) { return entry.choice || ''; }
  function matching(entry) { return !!chosen(entry) && entry.expected?.to === chosen(entry); }
  function eligible(entry) { return !!chosen(entry) && !matching(entry); }
  function selected() { return entries.filter(entry => entry.selected && eligible(entry)); }
  function filtered() {
    const query = R.normalize($('search').value), type = $('type-filter').value;
    return entries.filter(entry => (!type || type === entry.type) && (!query ||
      [entry.from, entry.artist || '', entry.expected?.to || '', ...entry.variants].some(value => R.normalize(value).includes(query))));
  }
  function updateSummary() {
    const n = selected().length;
    $('selected-count').textContent = n.toLocaleString() + ' selected';
    $('apply-summary').textContent = n.toLocaleString() + (n === 1 ? ' display preference' : ' display preferences') + ' selected for ' + reviewProfile + '.';
    $('apply').disabled = busy || stale || n === 0;
    $('stale-notice').hidden = !stale;
  }
  function cell(row, text) { const node = row.insertCell(); node.textContent = text; return node; }
  function draw() {
    const visible = filtered(), totalPages = Math.max(1, Math.ceil(visible.length / size));
    page = Math.max(1, Math.min(page, totalPages));
    const start = (page - 1) * size;
    $('candidates').replaceChildren();
    for (const entry of visible.slice(start, start + size)) {
      const row = document.createElement('tr');
      row.dataset.type = entry.type; row.dataset.id = entry.id;
      const checkCell = cell(row, '');
      const check = document.createElement('input'); check.type = 'checkbox';
      check.setAttribute('aria-label', 'Use ' + names[entry.type].toLowerCase() + ' ' + (entry.choice || entry.from));
      check.checked = entry.selected && eligible(entry); check.disabled = busy || !eligible(entry);
      check.addEventListener('change', () => { entry.selected = check.checked; updateSummary(); });
      checkCell.append(check); cell(row, names[entry.type]);
      const preferred = cell(row, entry.choice || '');
      if (entry.variants.length > 1) {
        preferred.replaceChildren();
        const select = document.createElement('select');
        select.setAttribute('aria-label', 'Choose casing for ' + entry.from);
        const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Choose casing…'; select.append(placeholder);
        for (const value of entry.variants) { const option = document.createElement('option'); option.value = value; option.textContent = value; select.append(option); }
        select.value = entry.choice; select.disabled = busy;
        select.addEventListener('change', () => { entry.choice = select.value; entry.selected = false; draw(); });
        preferred.append(select);
      }
      const occurrences = document.createElement('span'); occurrences.className = 'name-count';
      occurrences.textContent = entry.occurrences.toLocaleString() + (entry.occurrences === 1 ? ' occurrence in XML' : ' occurrences in XML'); preferred.append(occurrences);
      cell(row, entry.artist || '—'); cell(row, entry.expected?.to || 'None');
      const state = cell(row, ''); state.className = 'review-state';
      if (!entry.choice) { state.textContent = 'Choose between ' + entry.variants.length + ' casings'; state.dataset.kind = 'conflict'; }
      else if (matching(entry)) state.textContent = 'Already matching';
      else if (entry.expected) { state.textContent = 'Replaces current preference'; state.dataset.kind = 'conflict'; }
      else { state.textContent = 'New preference'; state.dataset.kind = 'new'; }
      $('candidates').append(row);
    }
    $('empty').hidden = visible.length > 0;
    $('shown-count').textContent = visible.length.toLocaleString() + ' of ' + entries.length.toLocaleString() + ' distinct names match';
    $('page-label').textContent = 'Page ' + page + ' of ' + totalPages + (visible.length ? ' · ' + (start + 1) + '–' + Math.min(start + size, visible.length) : '');
    $('previous').disabled = page === 1; $('next').disabled = page === totalPages;
    updateSummary();
  }
  function buildReview(keepChoices = false) {
    const previous = new Map(entries.map(entry => [entry.type + ':' + entry.id, entry.choice]));
    reviewProfile = snapshot.settings.username;
    entries = result.candidates.map(candidate => {
      const variants = [...new Set(candidate.variants?.length ? candidate.variants : [candidate.to])];
      const choice = keepChoices && previous.has(candidate.type + ':' + candidate.id) ? previous.get(candidate.type + ':' + candidate.id) : variants.length === 1 ? variants[0] : '';
      const expected = structuredClone(snapshot.rules[candidate.type]?.[candidate.id] || null);
      return { ...candidate, variants, choice, expected, occurrences: candidate.occurrences || 1, selected: !expected && !!choice };
    });
    stale = false; page = 1;
    $('review').hidden = false; draw();
  }
  function showBatch(value) {
    batch = value;
    $('revert-section').hidden = !batch;
    $('replace-undo-warning').hidden = !batch || batch.remaining === 0;
    if (batch) {
      const date = new Date(batch.appliedAt);
      $('batch-summary').textContent = batch.count.toLocaleString() + ' names imported for ' + batch.username +
        (Number.isNaN(date.getTime()) ? '.' : ' on ' + date.toLocaleString() + '.') +
        ' ' + batch.remaining.toLocaleString() + ' preferences remain eligible for revert.';
    }
  }
  async function refreshSaved() {
    const [next, status] = await Promise.all([S.read(), S.itunesStatus()]);
    snapshot = next; showBatch(status.batch);
    $('profile-status').textContent = 'Profile: ' + snapshot.settings.username;
  }
  function showIssues(scan) {
    $('issues-list').replaceChildren();
    const issues = Array.isArray(scan.issues) ? scan.issues : [];
    $('issues-summary').textContent = scan.skipped.toLocaleString() + ' songs skipped; ' + scan.duplicates.toLocaleString() + ' repeated name occurrences combined.';
    for (const issue of issues) {
      const item = document.createElement('li');
      item.textContent = typeof issue === 'string' ? issue : issue.message ? issue.message + (issue.count ? ' (' + issue.count.toLocaleString() + ')' : '') : JSON.stringify(issue);
      $('issues-list').append(item);
    }
    $('issues').hidden = !scan.skipped && !scan.duplicates && !issues.length;
  }
  function readFile(file, signal) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const abort = () => reader.abort(); signal.addEventListener('abort', abort, { once: true });
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('The XML file could not be read.'));
      reader.onabort = () => reject(new DOMException('Scan cancelled.', 'AbortError'));
      reader.onloadend = () => signal.removeEventListener('abort', abort);
      reader.readAsText(file);
    });
  }
  $('xml-file').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = ''; $('scan-error').textContent = ''; message('');
    result = null; entries = []; $('review').hidden = true;
    if (file.size > 50 * 1024 * 1024) { $('scan-error').textContent = 'Choose an XML file no larger than 50 MB.'; return; }
    controller = new AbortController(); const signal = controller.signal;
    setBusy(true); $('review').hidden = true; $('scan-status').hidden = false;
    $('scan-progress').removeAttribute('value'); $('scan-label').textContent = 'Reading XML on this device…';
    try {
      const xml = await readFile(file, signal);
      if (signal.aborted) throw new DOMException('Scan cancelled.', 'AbortError');
      const scan = await P.scan(xml, { signal, onProgress: progress => {
        $('scan-progress').max = Math.max(1, progress.total);
        $('scan-progress').value = progress.processed;
        $('scan-label').textContent = 'Checked ' + progress.processed.toLocaleString() + ' of ' + progress.total.toLocaleString() + ' songs';
      } });
      if (signal.aborted) throw new DOMException('Scan cancelled.', 'AbortError');
      await refreshSaved(); result = scan; entries = [];
      $('scan-file').textContent = 'File: ' + file.name;
      $('scan-summary').textContent = scan.songs.toLocaleString() + ' songs checked. ' + scan.skipped.toLocaleString() + ' skipped. ' + scan.duplicates.toLocaleString() + ' repeated name occurrences combined.';
      $('review-totals').textContent = R.TYPES.map(type => scan.candidates.filter(entry => entry.type === type).length.toLocaleString() + ' ' + plural[type]).join(' · ');
      showIssues(scan); buildReview();
      message('Scan complete. Review the names below; no preferences have been changed.');
    } catch (error) {
      result = null; entries = [];
      if (error.name === 'AbortError') message('Scan cancelled. No preferences were changed.');
      else $('scan-error').textContent = error.message;
    } finally {
      controller = null; $('scan-status').hidden = true; setBusy(false); if (result) draw();
    }
  });
  $('cancel-scan').addEventListener('click', () => controller?.abort());
  for (const id of ['search', 'type-filter']) $(id).addEventListener(id === 'search' ? 'input' : 'change', () => { page = 1; draw(); });
  $('previous').addEventListener('click', () => { page--; draw(); });
  $('next').addEventListener('click', () => { page++; draw(); });
  for (const [id, all, select] of [['select-filtered', false, true], ['clear-filtered', false, false], ['select-all', true, true], ['clear-all', true, false]]) {
    $(id).addEventListener('click', () => { for (const entry of all ? entries : filtered()) entry.selected = select && eligible(entry); draw(); });
  }
  $('refresh-review').addEventListener('click', async () => {
    setBusy(true);
    try { await refreshSaved(); buildReview(true); message('Review updated. Existing preferences that differ are unchecked.'); }
    catch (error) { message(error.message, true); }
    finally { setBusy(false); draw(); }
  });
  $('export').addEventListener('click', async () => {
    try {
      const data = await S.backup();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'lastfm-personal-library-' + new Date().toISOString().slice(0, 10) + '.json';
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); message('JSON backup prepared for download.');
    } catch (error) { message(error.message, true); }
  });
  function confirm(action, payload, title, detail, label) {
    confirmation = { action, payload }; $('confirm-heading').textContent = title;
    $('confirm-detail').textContent = detail; $('confirm').textContent = label;
    $('confirm-dialog').showModal(); $('cancel-confirm').focus();
  }
  $('apply').addEventListener('click', () => {
    if (busy || stale || !selected().length) return;
    const payload = { username: reviewProfile, entries: selected().map(entry => ({
      type: entry.type, id: entry.id,
      rule: { from: entry.from, to: entry.choice, ...(entry.artist ? { artist: entry.artist } : {}), exact: true }, expected: entry.expected
    })) };
    confirm('apply', structuredClone(payload), 'Apply these display names?', 'Save ' + selected().length.toLocaleString() + ' selected preferences for ' + reviewProfile + '? ' +
      (batch?.remaining ? 'This replaces the undo record for the previous XML import. ' : '') + 'Your Last.fm scrobbles will not change.', 'Apply selected names');
  });
  $('revert').addEventListener('click', () => {
    if (busy || !batch) return;
    confirm('revert', { id: batch.id }, 'Revert the last XML import?', 'Restore the previous preferences for this import. Any preferences edited afterward will be kept.', 'Revert import');
  });
  $('cancel-confirm').addEventListener('click', () => $('confirm-dialog').close());
  $('confirm-dialog').addEventListener('close', () => { confirmation = null; });
  $('confirm').addEventListener('click', async () => {
    if (!confirmation || busy) return;
    const { action, payload } = confirmation;
    $('confirm-dialog').close(); setBusy(true); if (result) draw();
    message(action === 'apply' ? 'Saving selected preferences…' : 'Reverting the last XML import…');
    try {
      let outcome;
      if (action === 'apply') {
        outcome = await S.applyItunes(payload);
        message(outcome.applied.toLocaleString() + ' display preferences applied.' + (outcome.unchanged ? ' ' + outcome.unchanged.toLocaleString() + ' already matched.' : ''));
      } else {
        outcome = await S.revertItunes(payload);
        message(outcome.reverted.toLocaleString() + ' preferences reverted; ' + outcome.kept.toLocaleString() + ' later changes kept.');
      }
      await refreshSaved(); if (result) buildReview(true);
    } catch (error) {
      if (action === 'apply') stale = true;
      message(error.message + (action === 'apply' ? ' Review current preferences before trying again.' : ''), true);
    } finally { setBusy(false); if (result) draw(); }
  });
  S.subscribe(next => {
    snapshot = next; $('profile-status').textContent = 'Profile: ' + next.settings.username;
    if (result && !busy) {
      stale = reviewProfile !== next.settings.username || entries.some(entry => !equal(entry.expected, next.rules[entry.type]?.[entry.id]));
      updateSummary();
    }
    S.itunesStatus().then(status => showBatch(status.batch)).catch(error => message(error.message, true));
  });
  refreshSaved().then(() => setBusy(false)).catch(error => message(error.message, true));
})();
