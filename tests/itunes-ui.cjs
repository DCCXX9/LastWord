const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const project = path.resolve(__dirname, '..');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
function xml(songs) {
  return '<plist version="1.0"><dict><key>Tracks</key><dict>' + songs.map((song, i) =>
    '<key>' + i + '</key><dict>' + Object.entries(song).map(([key, value]) => '<key>' + key + '</key><string>' + escape(value) + '</string>').join('') + '</dict>').join('') + '</dict></dict></plist>';
}
async function openPage(browser, worker) {
  const page = await browser.newPage();
  await page.goto('about:blank');
  await page.setContent(fs.readFileSync(path.join(project, 'itunes.html'), 'utf8').replace(/<script[^>]*><\/script>/g, ''));
  await page.addStyleTag({ path: path.join(project, 'extension-ui.css') });
  await page.addStyleTag({ path: path.join(project, 'itunes.css') });
  const mock = await mockExtension(page, { settings: { username: 'DCCXX', infiniteScroll: true }, rules: {
    artists: { '["artist"]': { from: 'Artist', to: 'aRTIST' } }, albums: {}, tracks: {}, albumArtists: {}
  } }, { worker, senderUrl: 'chrome-extension://test/itunes.html' });
  await loadScripts(page, ['rules.js', 'store.js', 'library-casing.js', 'itunes-parser.js', 'itunes.js']);
  await page.waitForFunction(() => !document.querySelector('#xml-file').disabled);
  return { page, worker: mock };
}
async function upload(page, text) {
  await page.locator('#xml-file').setInputFiles({ name: 'Library.xml', mimeType: 'text/xml', buffer: Buffer.from(text) });
  await page.waitForFunction(() => document.querySelector('#message').textContent.startsWith('Scan complete.'));
}
async function confirm(page, button) {
  await page.locator(button).click();
  await page.locator('#confirm-dialog').waitFor({ state: 'visible' });
  await page.locator('#confirm').click();
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox'] });
  try {
    const { page, worker } = await openPage(browser);
    const songs = [{ Name: 'lowercase', Artist: 'Artist', Album: 'ALBUM' },
      { Name: 'lowercase', Artist: 'ARTIST', Album: 'ALBUM' }, { Artist: 'Missing title' }];
    for (let i = 0; i < 105; i++) songs.push({ Name: 'Song ' + i, Artist: 'Artist', Album: 'ALBUM' });
    await upload(page, xml(songs));
    assert.equal(worker.writes, 0, 'local scan must never save preferences');
    assert.equal(await page.locator('#scan-file').innerText(), 'File: Library.xml');
    assert.match(await page.locator('#scan-summary').innerText(), /108 songs checked. 1 skipped/);
    assert.match(await page.locator('#review-totals').innerText(), /106 tracks/);
    // Type selection reaches beyond both the active search and the 100-row page.
    await page.locator('#clear-all').click();
    await page.locator('#search').fill('lowercase');
    await page.locator('#select-tracks').check();
    assert.equal(await page.locator('#selected-count').innerText(), '106 selected');
    assert.equal(await page.locator('#candidates tr').count(), 1);
    await page.locator('#candidates tr input').uncheck();
    assert.equal(await page.locator('#select-tracks').evaluate(x => x.indeterminate), true);
    assert.equal(await page.locator('#selected-count').innerText(), '105 selected');
    await page.locator('#select-tracks').check();
    assert.equal(await page.locator('#selected-count').innerText(), '106 selected');
    await page.locator('#select-tracks').uncheck();
    assert.equal(await page.locator('#selected-count').innerText(), '0 selected');
    await page.locator('#search').fill('');
    await page.locator('#select-all').click();
    assert.equal(await page.locator('#candidates tr').count(), 100);
    await page.locator('#next').click();
    assert.ok(await page.locator('#candidates tr').count() > 0, 'names beyond first page remain accessible');
    await page.locator('#search').fill('lowercase');
    assert.equal(await page.locator('#candidates tr').count(), 1);
    const lower = page.locator('#candidates tr');
    assert.equal(await lower.locator('input').isChecked(), true, 'all-lowercase XML becomes an exact rule');
    await page.locator('#search').fill('');
    await page.locator('#type-filter').selectOption('artists');
    const artist = page.locator('#candidates tr');
    assert.equal(await artist.locator('input').isDisabled(), true, 'variants require a casing choice');
    await artist.locator('select').focus();
    await artist.locator('select').selectOption('ARTIST');
    assert.equal(await artist.locator('select').evaluate(select => document.activeElement === select), true,
      'choosing XML casing must keep keyboard focus on the replacement control');
    assert.equal(await artist.locator('input').isChecked(), false, 'choosing a variant does not overwrite an existing preference');
    await artist.locator('input').check();
    await page.locator('#clear-all').click();
    await page.locator('#type-filter').selectOption('tracks');
    await page.locator('#search').fill('lowercase');
    await page.locator('#select-filtered').click();
    assert.equal(await page.locator('#selected-count').innerText(), '1 selected');
    await confirm(page, '#apply');
    await page.waitForFunction(() => document.querySelector('#message').textContent === '1 display preferences applied.');
    assert.deepEqual(worker.data.rules.tracks['["artist","lowercase"]'], { from: 'lowercase', to: 'lowercase', artist: 'Artist', exact: true });
    assert.equal(worker.data.rules.artists['["artist"]'].to, 'aRTIST');
    assert.equal(Object.keys(worker.data.rules.tracks).length, 1, 'apply honors selection');
    await page.close();

    const reopened = (await openPage(browser, worker)).page;
    await reopened.locator('#revert-section').waitFor({ state: 'visible' });
    await confirm(reopened, '#revert');
    await reopened.waitForFunction(() => document.querySelector('#message').textContent.startsWith('1 preferences reverted;'));
    assert.equal(worker.data.rules.tracks['["artist","lowercase"]'], undefined);
    assert.equal(worker.data.rules.artists['["artist"]'].to, 'aRTIST');

    // Another extension tab changes preferences during review: require a fresh review.
    await upload(reopened, xml([{ Name: 'Kept', Artist: 'Artist' }, { Name: 'Removed', Artist: 'Artist' }]));
    await worker.request('mutate', { operations: [{ op: 'put', type: 'tracks', from: 'Kept', to: 'KEPT', artist: 'Artist' }] });
    await reopened.locator('#stale-notice').waitFor({ state: 'visible' });
    assert.equal(await reopened.locator('#apply').isDisabled(), true);
    await reopened.locator('#refresh-review').click();
    await reopened.waitForFunction(() => document.querySelector('#stale-notice').hidden);
    await reopened.locator('#search').fill('Kept');
    assert.equal(await reopened.locator('#candidates tr input').isChecked(), false);
    await reopened.locator('#clear-all').click();
    await reopened.locator('#search').fill('Removed');
    await reopened.locator('#select-filtered').click();
    await confirm(reopened, '#apply');
    await reopened.waitForFunction(() => document.querySelector('#message').textContent === '1 display preferences applied.');
    await worker.request('mutate', { operations: [{ op: 'put', type: 'tracks', from: 'removed', to: 'REMOVED', artist: 'Artist' }] });
    await confirm(reopened, '#revert');
    await reopened.waitForFunction(() => document.querySelector('#message').textContent.includes('1 later changes kept'));
    assert.equal(worker.data.rules.tracks['["artist","removed"]'].to, 'REMOVED');

    // Quota failure from the storage boundary must stay visible and keep the review.
    await upload(reopened, xml([{ Name: 'Quota', Artist: 'Artist' }]));
    const before = structuredClone(worker.data.rules);
    const set = worker.chrome.storage.local.set;
    worker.chrome.storage.local.set = async () => { throw new Error('QUOTA_BYTES quota exceeded'); };
    await confirm(reopened, '#apply');
    await reopened.waitForFunction(() => document.querySelector('#message').dataset.tone === 'error');
    assert.match(await reopened.locator('#message').innerText(), /quota|storage|space/i);
    assert.deepEqual(worker.data.rules, before);
    worker.chrome.storage.local.set = set;
    await reopened.locator('#refresh-review').click();
    await reopened.waitForFunction(() => document.querySelector('#stale-notice').hidden);
    // Revert confirmation remains tied to the import the user reviewed.
    const makeEntry = name => ({ type: 'artists', id: JSON.stringify([name.toLowerCase()]), rule: { from: name.toLowerCase(), to: name, exact: true }, expected: null });
    await worker.request('itunes-apply', { username: 'DCCXX', entries: [makeEntry('FIRST')] });
    await reopened.locator('#revert-section').waitFor({ state: 'visible' });
    await reopened.locator('#revert').click();
    await reopened.locator('#confirm-dialog').waitFor({ state: 'visible' });
    const newer = await worker.request('itunes-apply', { username: 'DCCXX', entries: [makeEntry('SECOND'), makeEntry('THIRD')] });
    await reopened.waitForFunction(() => document.querySelector('#batch-summary').textContent.startsWith('2 names imported'));
    await reopened.locator('#confirm').click();
    await reopened.waitForFunction(() => document.querySelector('#message').textContent.includes('no longer the latest'));
    assert.equal(worker.data.itunesImportUndo.id, newer.batch.id);
    assert.ok(worker.data.rules.artists['["second"]']);
    await reopened.screenshot({ path: path.join(process.env.TEMP || '/tmp', 'lastfm-itunes-review.png'), fullPage: true });
    console.log('PASS: local full scan, pagination, search/type filter, conflict choice, selected exact lowercase apply, persistent selective revert, stale review, quota failure and frozen revert confirmation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
