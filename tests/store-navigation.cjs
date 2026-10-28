const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const { createMockWorker } = require('./harness.cjs');
const origin = 'https://www.last.fm', root = path.resolve(__dirname, '..');
const own = origin + '/user/DCCXX/library/music/Kanye+West/+albums';
const publicUrl = origin + '/music/Kanye+West';
const operation = { op: 'put', type: 'albums', artist: 'Kanye West', from: 'JESUS IS KING', to: 'Jesus Is King' };
const seed = { settings: { username: 'DCCXX', infiniteScroll: false },
  itunesImportUndo: { version: 1, id: 'undo', username: 'DCCXX', appliedAt: 1, changes: [] },
  albumlessScanDraft: { sentinel: 'scan' },
  lfmNetworkPause: { sentinel: 'pause' }, lfmPersonalArtworkCacheV1: [] };

(async () => {
  const worker = createMockWorker(seed);
  const sender = { id: 'test', url: publicUrl, frameId: 0, tab: { id: 1, url: own } };
  await worker.request('mutate', { operations: [operation] }, sender);
  const before = structuredClone(worker.data);
  for (const rejected of [
    { ...sender, url: own, tab: { url: origin + '/user/Friend/library' } },
    { ...sender, url: own, tab: { url: publicUrl } },
    { ...sender, frameId: 2 },
    { ...sender, url: 'https://example.com/' },
    { ...sender, tab: { url: 'https://example.com/user/DCCXX/library' } }
  ]) await assert.rejects(worker.request('mutate', { operations: [operation] }, rejected), /connected/);
  assert.deepEqual(worker.data, before, 'navigation away and child frames cannot borrow the own-profile URL');
  for (const key of Object.keys(seed)) assert.deepEqual(worker.data[key], seed[key], key + ' preserved');

  const profile = fs.mkdtempSync(path.join(root, 'test-results', 'store-navigation-profile-'));
  const context = await chromium.launchPersistentContext(profile, { headless: false,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: ['--headless=new', '--no-sandbox', `--disable-extensions-except=${root}`, `--load-extension=${root}`] });
  try {
    const posts = [];
    await context.route('https://**/*', r => {
      if (r.request().method() !== 'GET') posts.push(r.request().url());
      return r.fulfill({ contentType: 'text/html', body: '<!doctype html><main class="col-main"></main>' });
    });
    const w = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    await w.evaluate(data => chrome.storage.local.set(data), seed);
    const page = await context.newPage();
    await page.goto(publicUrl);
    // Keep the content script's original public document, just as Last.fm does.
    await page.evaluate(url => {
      history.pushState({}, '', url);
      document.querySelector('main').innerHTML = `<a href="/music/Kanye+West/JESUS+IS+KING">JESUS IS KING</a>
        <div class="popup_content"><form method="post" action="/user/DCCXX/library/edit-album?edited-variation=library-album-scrobble">
        <input name="album_name_original" value="JESUS IS KING" readonly><input name="album_name" value="Jesus Is King">
        <input name="album_artist_name_original" value="Kanye West" readonly><input name="album_artist_name" value="Kanye West">
        <button type="submit">Save edit</button></form></div>`;
    }, own);
    await page.getByRole('button', { name: 'Save edit', exact: true }).click();
    await page.locator('[data-lfm-local-toast][data-kind="success"]').waitFor({ timeout: 3000 });
    const after = await w.evaluate(() => chrome.storage.local.get(null));
    assert.equal(after.rules.albums['["kanye west","jesus is king"]'].to, 'Jesus Is King');
    for (const key of Object.keys(seed)) assert.deepEqual(after[key], seed[key], key + ' preserved');
    assert.deepEqual(posts, [], 'native save never reaches Last.fm');
    await page.waitForFunction(() => document.querySelector('main > a').textContent === 'Jesus Is King');
    console.log('PASS: real extension saves native album casing after public-to-library pushState; worker rejects navigation away, child frames and foreign origins; saved state preserved');
  } finally { await context.close(); fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
