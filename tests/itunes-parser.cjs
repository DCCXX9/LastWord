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
    for (const file of ['rules.js', 'library-casing.js', 'itunes-parser.js']) await page.addScriptTag({ path: path.join(root, file) });
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
    const streaming = await page.evaluate(async () => {
      const tracks = '<key>Tracks</key><dict><key>1</key><dict><key>Name</key><string>First</string><key>Artist</key><string>A</string></dict>' +
        '<key>2</key><dict><key>Name</key><string>Last</string><key>Artist</key><string>B</string></dict></dict>';
      const prefix = '<plist><dict>' + tracks + '<key>Playlists</key><array><dict><key>Unused</key><string>';
      const suffix = '</string></dict></array></dict></plist>';
      const blob = new Blob([prefix, ...Array(128).fill('x'.repeat(1024 * 1024)), suffix]);
      const updates = [];
      const result = await LastfmItunes.scanFile(blob, { onProgress: info => {
        if (!updates.length || info.bytesRead - updates.at(-1).bytesRead >= 16 * 1024 * 1024 || info.total !== null) updates.push(info);
      } });
      const controller = new AbortController();
      let cancelled;
      try {
        await LastfmItunes.scanFile(blob, { signal: controller.signal, onProgress: info => {
          if (info.bytesRead >= 2 * 1024 * 1024) controller.abort();
        } });
      } catch (error) { cancelled = error.name; }
      return { size: blob.size, result, updates, cancelled };
    });
    assert.ok(streaming.size > 128 * 1024 * 1024);
    assert.equal(streaming.result.songs, 2);
    assert.deepEqual(streaming.result.candidates.filter(item => item.type === 'tracks').map(item => item.to), ['First', 'Last']);
    assert.ok(streaming.updates.length >= 9);
    assert.ok(streaming.updates.slice(0, -1).every(update => update.total === null));
    assert.equal(streaming.updates.at(-1).total, 2);
    assert.equal(streaming.updates.at(-1).bytesRead, streaming.size);
    assert.equal(streaming.cancelled, 'AbortError');

    const splitResults = await page.evaluate(async () => {
      const prefix = '<plist><dict><key>Padding</key><string>';
      const rest = '</string><key>Tracks</key><dict><key>1</key><dict note="one > zero">' +
        '<!-- comment --><key>Name</key><string><![CDATA[Café & Blue]]></string>' +
        '<key>Artist</key><string>A &amp; B</string></dict></dict></dict></plist>';
      const markers = ['<!--', '<![CDATA[', 'Café', ']]>', '&amp;', 'note="one > zero"', '</plist>'];
      const results = [];
      for (const marker of markers) {
        for (const offset of [1, Math.max(1, marker.length - 1)]) {
          const target = rest.indexOf(marker) + offset;
          const bytes = new TextEncoder().encode(prefix + rest.slice(0, target)).length;
          const blob = new Blob([prefix, 'x'.repeat(65536 - bytes), rest]);
          const result = await LastfmItunes.scanFile(blob);
          results.push(result.candidates.find(item => item.type === 'tracks').to);
        }
      }
      // Split the two-byte UTF-8 é in the middle, independently of token splits.
      const unicodeTarget = rest.indexOf('é');
      const before = new TextEncoder().encode(prefix + rest.slice(0, unicodeTarget)).length;
      results.push((await LastfmItunes.scanFile(new Blob([prefix, 'x'.repeat(65535 - before), rest])))
        .candidates.find(item => item.type === 'tracks').to);
      return results;
    });
    assert.equal(splitResults.length, 15);
    assert.ok(splitResults.every(value => value === 'Café & Blue'));
    for (const trailing of ['</wrong>', '<plist/>', '&unknown;', '<!-- unclosed', '<?xml?>']) {
      const error = await page.evaluate(async ({ xml, trailing }) => {
        try { await LastfmItunes.scanFile(new Blob([xml, trailing])); return ''; }
        catch (error) { return error.message; }
      }, { xml: wrap(entry(1)), trailing });
      assert.ok(error, 'Malformed trailing XML must not return a partial successful result');
    }
    assert.deepEqual(requests, [], 'XML scans must not request external DTDs or any other resource');
    console.log('PASS: shared streaming parser, 128 MiB Blob, chunk boundaries/Unicode/CDATA/entities, full tail validation, progress/cancel, zero network requests');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
