const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const placeholder = 'https://lastfm-img.freetls.fastly.net/i/u/64s/4128a6eb29f94943c9d206c08e625904.jpg';
const image = 'https://lastfm-img.freetls.fastly.net/i/u/64s/preferred.jpg';
const row = (name, top, src = placeholder) => `<tr class="chartlist-row" style="position:absolute;top:${top}px;height:50px"><td class="chartlist-image"><img width="32" height="32" src="${src}"></td><td class="chartlist-name"><a href="/music/Artist/_/${name}">${name}</a></td></tr>`;
(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
    await page.route('https://www.last.fm/**', r => r.fulfill({ contentType: 'text/html',
      body: `<body style="height:6000px"><table class="chartlist"><tbody>${row('Current', 20, image)}${row('Ahead', 1000)}${row('Far', 5000)}</tbody></table>` }));
    await page.route('https://lastfm-img.freetls.fastly.net/**', r => r.fulfill({ contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=', 'base64') }));
    await page.goto('https://www.last.fm/user/DCCXX/library/tracks');
    const worker = await mockExtension(page, { settings: { username: 'DCCXX', infiniteScroll: true } });
    await page.evaluate(image => {
      window.calls = []; window.pending = {}; window.aborts = 0;
      window.LastfmPages = { status: () => ({ rateLimited: false }) };
      window.LastfmArtworkSource = { clear() {}, resolve(item, username, signal) {
        calls.push(item.name);
        return new Promise((resolve, reject) => {
          pending[item.name] = () => resolve({ artist: 'Artist', album: 'Scrobbled Album', image,
            url: 'https://www.last.fm/music/Artist/Scrobbled+Album', fallback: false, scanned: 1, total: 1, sourceVersion: 3 });
          signal.addEventListener('abort', () => { aborts++; setTimeout(() => reject(new DOMException('Cancelled', 'AbortError')), 0); }, { once: true });
        });
      } };
      LastfmArtworkSource.forBlankScrobble = LastfmArtworkSource.resolve;
    }, image);
    await loadScripts(page, ['rules.js', 'store.js', 'adapter.js', 'artwork.js']);
    await page.waitForFunction(() => calls.length === 1);
    assert.deepEqual(await page.evaluate(() => calls), ['Current'], 'on-screen ordinary artwork wins over a nearby blank');
    const single = row('SingleAhead', 1100).replace('</td></tr>', '<form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Artist"><input name="track_name" value="SingleAhead"><input name="album_name" value=""><input name="album_artist_name" value=""><input name="timestamp" value="20"></form></td></tr>');
    await page.evaluate(html => document.querySelector('tbody').insertAdjacentHTML('beforeend', html), single);
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => aborts), 0, 'an off-screen album-less row must not repeatedly cancel the visible lookup');
    await page.evaluate(() => pending.Current());
    await page.waitForFunction(() => calls.includes('SingleAhead'));
    await page.evaluate(() => pending.SingleAhead());
    await page.waitForFunction(() => calls.includes('Ahead'), null, { timeout: 1500 });
    await page.evaluate(() => pending.Ahead());
    const painted = async name => {
      await page.waitForFunction(({ name, image }) => {
        const r = [...document.querySelectorAll('tr')].find(r => r.textContent === name), i = r?.querySelector('img');
        return i?.src === image && i.naturalWidth > 0 && getComputedStyle(i).visibility === 'visible';
      }, { name, image });
    };
    await painted('Ahead');
    assert.ok(await page.locator('tr').filter({ hasText: /^Ahead$/ }).evaluate(r => r.getBoundingClientRect().top >= innerHeight), 'cover must paint before entering view');
    await page.evaluate(html => { scrollTo(0, 700); document.querySelector('tbody').insertAdjacentHTML('beforeend', html); }, row('Appended', 2000));
    await page.waitForFunction(() => calls.includes('Appended'), null, { timeout: 1500 });
    await page.evaluate(() => pending.Appended());
    await painted('Appended');
    assert.ok(await page.locator('tr').filter({ hasText: 'Appended' }).evaluate(r => r.getBoundingClientRect().top >= innerHeight), 'scroll-added cover must paint ahead of the viewport');
    assert.equal(await page.evaluate(() => calls.includes('Far')), false, 'distant loaded rows must not start a full-list scan');
    await worker.externalSet({ settings: { username: 'Friend', infiniteScroll: true } });
    await page.waitForFunction(() => LastfmArtwork.status().jobs.complete === 0);
    await page.evaluate(html => document.querySelector('tbody').insertAdjacentHTML('beforeend', html), row('FriendOnly', 1800));
    await page.waitForTimeout(100);
    assert.deepEqual(await page.evaluate(() => calls), ['Current', 'SingleAhead', 'Ahead', 'Appended']);
    console.log('PASS: visible priority, loaded-row look-ahead, scroll-added covers painted before entry, bounded distance and profile isolation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
