const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');

const albumPath = '/user/DCCXX/library/music/Yeat/DANGEROUS+SUMMER';
const albumLink = 'https://www.last.fm/music/Yeat/DANGEROUS+SUMMER';
const cover = 'https://lastfm-img.freetls.fastly.net/i/u/64s/album-preferred.jpg';
const changedCover = 'https://lastfm-img.freetls.fastly.net/i/u/64s/album-new-star.jpg';
const wrong = 'https://lastfm-img.freetls.fastly.net/i/u/64s/other-release.jpg';
const placeholder = 'https://lastfm-img.freetls.fastly.net/i/u/64s/4128a6eb29f94943c9d206c08e625904.jpg';
const row = (name, src = wrong, artist = 'Yeat') => `<tr class="chartlist-row"><td class="chartlist-image"><span class="cover-art"><img width="34" height="34" src="${src}" data-src="${src}"></span></td><td class="chartlist-name"><a href="/music/${artist}/_/${name}">${name}</a></td><td class="chartlist-duration">3:18</td></tr>`;
const header = (artist = 'Yeat', album = 'DANGEROUS+SUMMER') => `<header class="library-header"><span class="library-header-image cover-art"><img src="${cover.replace('/64s/', '/avatar70s/')}" width="48" height="48"></span><h2 class="library-header-title">My local album display name</h2><a href="/music/${artist}/${album}">Go to album page</a></header>`;
const html = `<main class="col-main">${header()}<h3>Tracks</h3><table class="chartlist"><tbody>${row('COME+N+GO')}${row('IM+YEAT')}${row('OH+I+DID', placeholder)}${row('M.F.U.', placeholder, 'Guest+Artist')}</tbody></table></main><aside><table class="chartlist">${row('Unrelated')}</table></aside>`;

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage(), requests = [], errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://lastfm-img.freetls.fastly.net/**', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64') }));
    await page.route('https://www.last.fm/**', r => {
      if (r.request().isNavigationRequest()) return r.fulfill({ contentType: 'text/html', body: html });
      requests.push(r.request().url());
      return r.fulfill({ status: 503, body: 'Album-view artwork must not require history or cover requests.' });
    });
    await page.goto('https://www.last.fm' + albumPath);
    const initial = { settings: { username: 'DCCXX', infiniteScroll: false }, rules: { artists: {}, albums: {}, tracks: {}, albumArtists: {} },
      lfmPersonalArtworkCacheV1: [{ key: '["dccxx","yeat","im yeat"]', username: 'DCCXX', item: { artist: 'Yeat', name: 'IM YEAT' }, checkedAt: Date.now(),
        cover: { artist: 'Yeat', album: 'Different all-time winner', url: 'https://www.last.fm/music/Yeat/Other', image: wrong, sourceVersion: 3, total: 20, scanned: 20, fallback: false } }],
      itunesUndo: { preserved: true }, legacyScan: { page: 93 } };
    const worker = await mockExtension(page, initial);
    await loadScripts(page, ['rules.js', 'store.js', 'adapter.js']);
    // The current album already supplies its cover; even a stalled cache read
    // or absent idle-time resolver must not delay any of its track rows.
    await page.evaluate(async () => { const state = await LastfmStore.read(); globalThis.LastfmStore = Object.freeze({ ...LastfmStore, read: () => Promise.resolve(state), readArtwork: () => new Promise(() => {}) }); });
    await loadScripts(page, ['artwork.js']);
    await page.waitForFunction(() => LastfmArtwork.status().cacheReady === false);
    const sources = await page.locator('.col-main .chartlist-image img').evaluateAll(images => images.map(i => i.src));
    assert.deepEqual(sources, Array(4).fill(cover), 'album tracks must immediately use their album header, including wrong releases, blanks and guest artists');
    assert.equal(await page.locator('.col-main .chartlist-image a').count(), 4);
    assert.deepEqual(await page.locator('.col-main .chartlist-image a').evaluateAll(a => a.map(x => x.href)), Array(4).fill(albumLink));
    assert.equal(await page.locator('aside img').getAttribute('src'), wrong, 'do not change sidebar tracks');
    assert.equal(await page.locator('.chartlist-duration').first().textContent(), '3:18');
    assert.deepEqual(worker.data, initial, 'album-scoped covers must not replace all-time cached winners or write preferences');
    assert.deepEqual(requests, []);

    await page.evaluate(wrong => { const i = document.querySelector('.col-main .chartlist-image img'); i.src = wrong; i.srcset = wrong + ' 2x'; i.style.visibility = 'hidden'; i.closest('a').href = '/music/Various/Compilation'; }, wrong);
    await page.waitForFunction(cover => { const i = document.querySelector('.col-main .chartlist-image img'); return i.src === cover && !i.srcset && i.style.visibility === 'visible' && i.closest('a').href.endsWith('/Yeat/DANGEROUS+SUMMER'); }, cover);
    await page.evaluate(({ row, src }) => {
      document.querySelector('.col-main tbody').insertAdjacentHTML('beforeend', row);
      document.querySelector('.library-header img').src = src;
    }, { row: row('Late+track', placeholder), src: changedCover.replace('/64s/', '/avatar70s/') });
    await page.waitForFunction(src => [...document.querySelectorAll('.col-main .chartlist-image img')].every(i => i.src === src), changedCover);
    await page.waitForFunction(() => [...document.querySelectorAll('.col-main .chartlist-image img')].every(i => i.naturalWidth > 0));
    assert.deepEqual(requests, []);
    assert.deepEqual(worker.data, initial);
    await page.screenshot({ path: require('node:path').join(__dirname, '../test-results/album-view-fixed.png') });

    await worker.externalSet({ settings: { username: 'Friend', infiniteScroll: false } });
    await page.waitForFunction(src => document.querySelector('.col-main .chartlist-image img').src === src, wrong);
    assert.equal(await page.locator('.col-main .chartlist-image span.cover-art').count(), 5, 'disconnect restores native cover spans');
    assert.equal(await page.locator('.col-main .chartlist-image a').count(), 0);

    // A redirected album URL is still the selected album. Its raw URL/link
    // identity must agree, regardless of locally preferred display text.
    await page.evaluate(path => { history.replaceState(null, '', path); LastfmArtwork.start(); }, albumPath.replace('/music/', '/music/+noredirect/'));
    await worker.externalSet({ settings: { username: 'DCCXX', infiniteScroll: false } });
    await page.waitForFunction(src => document.querySelector('.col-main .chartlist-image img').src === src, changedCover);
    assert.deepEqual(requests, []);

    const invalid = await browser.newPage();
    await invalid.route('https://www.last.fm/**', r => r.fulfill({ contentType: 'text/html', body: html.replace('href="/music/Yeat/DANGEROUS+SUMMER"', 'href="/music/Yeat/Other"') }));
    await invalid.goto('https://www.last.fm' + albumPath);
    await mockExtension(invalid, { settings: { username: 'DCCXX', infiniteScroll: false } });
    await loadScripts(invalid, ['rules.js', 'store.js', 'adapter.js', 'artwork.js']);
    await invalid.waitForFunction(() => LastfmArtwork.status().cacheReady);
    assert.equal(await invalid.locator('.col-main .chartlist-image img').first().getAttribute('src'), wrong, 'a mismatched header is not album proof');

    await page.goto('https://www.last.fm/user/Friend/library/music/Yeat/DANGEROUS+SUMMER');
    await mockExtension(page, { settings: { username: 'DCCXX', infiniteScroll: false } });
    await loadScripts(page, ['rules.js', 'store.js', 'adapter.js', 'artwork.js']);
    assert.equal(await page.locator('.col-main .chartlist-image img').first().getAttribute('src'), wrong);
    assert.deepEqual(errors, []);
    console.log('PASS: immediate album-scoped covers/links, no cache or network dependency, guest artists, late rows, preferred-cover updates, lazy-loader repair and own-profile isolation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
