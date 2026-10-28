const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'test-results');

(async () => {
 fs.mkdirSync(output, { recursive: true });
 const profile = fs.mkdtempSync(path.join(output, 'itunes-capacity-'));
 let browser;
 try {
  browser = await chromium.launchPersistentContext(profile, {
   executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, headless: false,
   args: ['--headless=new', '--no-sandbox', `--disable-extensions-except=${root}`, `--load-extension=${root}`]
  });
  await browser.route('https://**/*', r => r.abort());
  const worker = browser.serviceWorkers()[0] || await browser.waitForEvent('serviceworker');
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${new URL(worker.url()).host}/itunes.html`);
  const result = await page.evaluate(async () => {
   const seed = { settings: { username: 'LibraryTest', infiniteScroll: false },
    rules: { artists: {}, albums: {}, tracks: {}, albumArtists: {} },
    legacyScan: { page: 93 }, lfmNetworkPause: { until: 12345 } };
   await chrome.storage.local.set(seed);
   const entries = Array.from({length: 56000}, (_, n) => {
    const to = 'sTyLiSeD library song ' + n + ' — café & friends';
    return { type: 'tracks', id: LastfmRules.idFor('tracks', to, 'Artist'),
     rule: { from: LastfmRules.normalize(to), to, artist: 'Artist', exact: true }, expected: null };
   });
   const saved = await LastfmStore.applyItunes({ username: 'LibraryTest', entries });
   const bytes = await chrome.storage.local.getBytesInUse(null);
   const status = await LastfmStore.itunesStatus();
   await LastfmStore.mutate([{op:'put',type:'tracks',from:entries[0].rule.from,to:'Later manual choice',artist:'Artist'}]);
   const reverted = await LastfmStore.revertItunes({id:status.batch.id});
   const stored = await chrome.storage.local.get(null);
   return { applied: saved.applied, bytes, undoCount: status.batch.count,
    reverted: reverted.reverted, kept: reverted.kept,
    trackCount: Object.keys(stored.rules.tracks).length,
    laterChoice: stored.rules.tracks[entries[0].id].to,
    legacy: stored.legacyScan, pause: stored.lfmNetworkPause, settings: stored.settings,
    permissions: chrome.runtime.getManifest().permissions };
  });
  assert.equal(result.applied, 56000); assert.equal(result.undoCount, 56000);
  assert.ok(result.bytes > 10 * 1024 * 1024, 'real Chrome storage exceeds its ordinary 10 MB quota');
  assert.equal(result.reverted, 55999); assert.equal(result.kept, 1);
  assert.equal(result.trackCount, 1); assert.equal(result.laterChoice, 'Later manual choice');
  assert.deepEqual(result.legacy, {page:93}); assert.deepEqual(result.pause, {until:12345});
  assert.equal(result.settings.username, 'LibraryTest');
  assert.deepEqual(result.permissions, ['storage', 'unlimitedStorage']);
  console.log(`PASS: real extension storage saved 56,000 stylisations and undo (${result.bytes} bytes), reverted 55,999 and preserved a later edit, profile, scan and pause`);
 } finally {
  if (browser) await browser.close();
  const actual = fs.realpathSync(profile), parent = fs.realpathSync(output);
  assert.equal(path.dirname(actual), parent, 'cleanup stays inside test-results');
  assert.ok(path.basename(actual).startsWith('itunes-capacity-'));
  fs.rmSync(actual, { recursive: true, force: true, maxRetries: 5 });
 }
})().catch(error => { console.error(error); process.exitCode = 1; });
