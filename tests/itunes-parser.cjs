const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/itunes.xml'), 'utf8');
const wrap = tracks => `<plist version="1.0"><dict><key>Tracks</key><dict>${tracks}</dict></dict></plist>`;
const entry = (id, name = 'Song', artist = 'Artist') => `<key>${id}</key><dict><key>Name</key><string>${name}</string><key>Artist</key><string>${artist}</string></dict>`;

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const requests = [];
  await page.route('**/*', route => { requests.push(route.request().url()); return route.abort(); });
  try {
    await page.goto('about:blank');
    for (const file of ['rules.js', 'itunes-parser.js']) await page.addScriptTag({ path: path.join(root, file) });
    const result = await page.evaluate(xml => LastfmItunes.scan(xml), fixture);
    assert.equal(result.songs, 5);
    assert.equal(result.skipped, 1);
    assert.equal(result.duplicates, 5);
    const crest = result.candidates.find(item => item.type === 'albums' && item.from === 'crest');
    assert.deepEqual(crest.variants, ['Crest', 'CREST']);
    assert.equal(crest.occurrences, 2);
    assert.equal(crest.artist, 'Bladee & Ecco2k');
    assert.equal(result.candidates.find(item => item.type === 'tracks' && item.from === 'café & blue').to, 'Café & BLUE');
    assert.equal(result.candidates.find(item => item.type === 'tracks' && item.from === 'lowercase').to, 'lowercase');
    const compilation = result.candidates.filter(item => item.type === 'albums' && item.from === 'compilation');
    assert.deepEqual(compilation.map(item => item.artist), ['another artist', 'Various Artists']);
    assert.equal(result.candidates.filter(item => item.type === 'albums' && item.from === 'crest').length, 1);
    assert.equal(result.candidates.some(item => item.type === 'albums' && item.from === 'single'), false);
    assert.equal(JSON.stringify(result).includes('private/example'), false);
    assert.equal(result.issues[0].count, 1);
    const unicode = await page.evaluate(xml => LastfmItunes.scan(xml), wrap(entry(1, 'Cafe\u0301') + entry(2, 'Café')));
    assert.deepEqual(unicode.candidates.find(item => item.type === 'tracks').variants, ['Café']);
    assert.equal(unicode.candidates.find(item => item.type === 'tracks').occurrences, 2);
    const empty = await page.evaluate(xml => LastfmItunes.scan(xml), wrap(''));
    assert.deepEqual(empty, { songs: 0, total: 0, skipped: 0, duplicates: 0, candidates: [], issues: [] });
    for (const xml of ['<plist><dict>', '<html/>', '<plist><dict/></plist>',
      '<plist><dict><key>Tracks</key><array/></dict></plist>',
      '<plist><dict><key>Tracks</key><dict/><key>Tracks</key><dict/></dict></plist>',
      '<!DOCTYPE plist [<!ENTITY x "expanded">]><plist><dict><key>Tracks</key><dict/></dict></plist>',
      '<!DOCTYPE plist SYSTEM "https://example.invalid/unsafe.dtd"><plist><dict><key>Tracks</key><dict/></dict></plist>']) {
      const error = await page.evaluate(async xml => { try { await LastfmItunes.scan(xml); return ''; } catch (error) { return error.message; } }, xml);
      assert.ok(error, 'invalid XML must be rejected');
    }
    const many = wrap(Array.from({ length: 1101 }, (_, index) => entry(index, `Song ${index}`)).join(''));
    const progress = await page.evaluate(async xml => {
      const updates = [];
      const result = await LastfmItunes.scan(xml, { onProgress: info => updates.push(info.processed) });
      return { updates, songs: result.songs, count: result.candidates.length };
    }, many);
    assert.equal(progress.songs, 1101); assert.equal(progress.count, 1102);
    assert.equal(progress.updates[0], 0); assert.equal(progress.updates.at(-1), 1101);
    assert.ok(progress.updates.slice(1).every((value, index) => value - progress.updates[index] <= 100));
    const cancel = await page.evaluate(async xml => {
      const controller = new AbortController();
      const updates = [];
      try {
        await LastfmItunes.scan(xml, { signal: controller.signal, onProgress: info => {
          updates.push(info.processed); if (info.processed >= 100) controller.abort();
        } });
      } catch (error) { return { name: error.name, updates }; }
    }, many);
    assert.equal(cancel.name, 'AbortError'); assert.deepEqual(cancel.updates, [0, 100]);
    assert.deepEqual(requests, [], 'XML scans must not request external DTDs or any other resource');
    console.log('PASS: iTunes XML names/scopes/conflicts, empty/invalid/entity inputs, 1101 tracks, progress/cancel, zero network requests');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
