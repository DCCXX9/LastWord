const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    // Artist pages contain album summaries followed by a potentially long track list.
    const cover = 'https://lastfm-img.freetls.fastly.net/i/u/64s/real-album.jpg';
    const album = `<tr class="chartlist-row"><td class="chartlist-image"><img src="${cover}"></td><td class="chartlist-name"><a href="/music/Artist/Album">Album</a></td><td data-stat-value="200"></td></tr>`;
    const rows = Array.from({ length: 200 }, (_, i) => `<tr class="chartlist-row"><td class="chartlist-image"><img src="${cover}"></td><td class="chartlist-name"><a href="/music/Artist/_/Song+${i}">Song ${i}</a></td><td data-stat-value="1"></td></tr>`).join('');
    await page.route('https://www.last.fm/**', route => route.fulfill({ contentType: 'text/html',
      body: `<main class="col-main"><table class="chartlist">${album}</table><table class="chartlist">${rows}</table></main>` }));
    await page.route('https://lastfm-img.freetls.fastly.net/**', route => route.abort());
    await page.goto('https://www.last.fm/user/DCCXX/library/music/Artist');
    await mockExtension(page, { settings: { username: 'DCCXX', infiniteScroll: false } });
    await loadScripts(page, ['rules.js', 'store.js', 'adapter.js', 'artwork-albums.js']);
    // Suppress discovery requests: measure just reconsideration of existing rows.
    await page.evaluate(() => {
      window.LastfmPages = { status: () => ({ rateLimited: true }) };
      const query = document.querySelectorAll.bind(document);
      window.albumTraversals = 0;
      document.querySelectorAll = selector => {
        if (selector === '.col-main table.chartlist tr.chartlist-row') window.albumTraversals++;
        return query(selector);
      };
    });
    await loadScripts(page, ['artwork.js']);
    await page.waitForFunction(() => LastfmArtwork.status().jobs.waiting === 200);
    const measured = await page.evaluate(() => {
      const samples = [];
      window.albumTraversals = 0;
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        LastfmArtwork.start();
        samples.push(performance.now() - start);
      }
      return { traversals: window.albumTraversals, medianMs: samples.sort((a, b) => a - b)[2],
        rows: document.querySelectorAll('tr.chartlist-row').length,
        covers: [...document.querySelectorAll('img')].every(image => image.src.endsWith('/real-album.jpg')) };
    });
    console.log('Artwork scan:', JSON.stringify(measured));
    assert.equal(measured.rows, 201);
    assert.equal(measured.covers, true, 'scan scheduling must preserve every existing cover');
    assert.ok(measured.traversals <= 5, 'each refresh must read the shared album/track context once, not once per queued song');
    console.log('PASS: long artist lists share one album-context traversal per refresh and preserve native rows/covers');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
