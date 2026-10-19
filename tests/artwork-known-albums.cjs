const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'), origin = 'https://www.last.fm';
const library = '/user/DCCXX/library/music/Dean+Blunt/+tracks';
const placeholder = 'https://lastfm-img.freetls.fastly.net/i/u/64s/4128a6eb29f94943c9d206c08e625904.jpg';
const image = 'https://lastfm-img.freetls.fastly.net/i/u/64s/6da014dd54bb1082a3a51218fcbf7a89.jpg';
const encode = value => encodeURIComponent(value).replace(/%20/g, '+');
const track = name => '/music/Dean+Blunt/_/' + encode(name);
const row = (name, n, src = placeholder) => `<tr class="chartlist-row"><td class="chartlist-image"><span class="cover-art"><img width="32" height="32" src="${src}"></span></td><td class="chartlist-name"><a href="${track(name)}">${name}</a></td><td><span data-stat-value="${n}">${n}</span></td></tr>`;
const list = second => `<!doctype html><main class="col-main"><table class="chartlist"><tbody>${second ? row('lucre 6', 18) : row('lucre 5', 18) + row('lucre 7', 1, image) + row('Unproven', 18)}</tbody></table>${second ? '' : '<nav class="pagination"><a class="pagination-next" href="?page=2">Next</a></nav>'}</main>`;
const album = `<main class="col-main"><p class="metadata-display">37</p><table class="chartlist"><tbody>${row('lucre 5', 18)}${row('lucre 6', 13)}${row('lucre 7', 1)}${row('Unproven', 5)}</tbody></table></main>`;
(async () => {
  fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
  const profile = fs.mkdtempSync(path.join(root, 'test-results', 'known-albums-profile-'));
  const browser = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, headless: false,
    args: ['--headless=new', '--no-sandbox', `--disable-extensions-except=${root}`, `--load-extension=${root}`]
  });
  try {
    const calls = [], errors = [];
    await browser.route('https://lastfm-img.freetls.fastly.net/**', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=', 'base64') }));
    await browser.route(origin + '/**', r => {
      const u = new URL(r.request().url());
      if (u.pathname.endsWith('/+tracks')) return r.fulfill({ contentType: 'text/html', body: list(u.searchParams.has('page')) });
      calls.push(u.pathname);
      if (u.pathname === '/user/DCCXX/library/music/+noredirect/Dean+Blunt/LUCRE') return r.fulfill({ contentType: 'text/html', body: album });
      // Reproduced public boundary: individual history reads intermittently
      // return HTTP 600 while the exact album and its existing cover are valid.
      return r.fulfill({ status: 600, body: 'Last.fm - Temporarily Unavailable' });
    });
    const worker = browser.serviceWorkers()[0] || await browser.waitForEvent('serviceworker');
    const setupUrl = new URL('options.html', worker.url()).href, deadline = Date.now() + 10000;
    let setup;
    while (!(setup = browser.pages().find(p => p.url() === setupUrl)) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
    assert.ok(setup); await setup.locator('#profile-status').filter({ hasText: 'Not connected' }).waitFor();
    const saved = { settings: { username: 'DCCXX', infiniteScroll: true }, rules: { artists: {}, albums: {}, tracks: {}, albumArtists: {} } };
    const cover = { artist: 'Dean Blunt', album: 'LUCRE', image, url: origin + '/music/Dean+Blunt/LUCRE', fallback: false, scanned: 1, total: 1, sourceVersion: 3 };
    const item = { artist: 'Dean Blunt', name: 'lucre 7' };
    await worker.evaluate(data => chrome.storage.local.set(data), { ...saved, lfmPersonalArtworkCacheV1: [{ key: JSON.stringify(['dccxx', 'dean blunt', 'lucre 7']), username: 'DCCXX', item, cover, checkedAt: Date.now() }] });
    const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin + library);
    const painted = async name => {
      await page.waitForFunction(({ name, image }) => {
        const a = [...document.querySelectorAll('.chartlist-name a')].find(a => a.textContent === name);
        const i = a?.closest('tr').querySelector('img');
        return i?.src === image && i.naturalWidth > 0 && getComputedStyle(i).visibility === 'visible';
      }, { name, image }, { timeout: 7000 });
      const target = page.locator('.chartlist-name a').filter({ hasText: name }).locator('..').locator('..');
      assert.equal(await target.locator('.chartlist-image a').getAttribute('href'), cover.url);
    };
    await painted('lucre 5');
    assert.equal(calls.filter(p => p.endsWith('/_/lucre+5')).length, 0, 'a proved aggregate avoids the unavailable individual history');
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('tr.chartlist-row').length === 4);
    await painted('lucre 6');
    assert.equal(calls.filter(p => p.endsWith('/_/lucre+6')).length, 0, 'scroll-added rows reuse the same proved counts');
    assert.equal(calls.filter(p => p.endsWith('/Dean+Blunt/LUCRE')).length, 1, 'one exact album read serves initial and appended rows');
    assert.equal(await page.locator('.chartlist-name a').filter({ hasText: 'Unproven' }).locator('..').locator('..').locator('img').getAttribute('src'), placeholder, 'five of eighteen plays cannot prove this album wins');
    const before = calls.length;
    await page.reload(); await painted('lucre 5');
    assert.equal(calls.slice(before).some(p => p.endsWith('/_/lucre+5')), false, 'saved winners paint without repeating history reads');
    assert.deepEqual(await worker.evaluate(() => chrome.storage.local.get(['settings', 'rules'])), saved);
    await page.goto(origin + library.replace('DCCXX', 'Friend'));
    await page.waitForTimeout(150);
    assert.equal(await page.locator('img').first().getAttribute('src'), placeholder);
    assert.deepEqual(errors, []);
    console.log('PASS: verified known-album counts recover initial and scroll-added covers despite unavailable histories, prove majority, reject guesses, cache winners and isolate profiles/preferences');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
