const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const placeholder = 'https://lastfm-img.freetls.fastly.net/i/u/64s/4128a6eb29f94943c9d206c08e625904.jpg';
const cover = 'https://lastfm-img.freetls.fastly.net/i/u/64s/6da014dd54bb1082a3a51218fcbf7a89.jpg';
const item = { artist: 'Dean Blunt', name: 'lucre 5' };
// Captured public rows use a span around the generic cover, and repeat the
// edit-scrobble id for different plays; the timestamp title distinguishes them.
const row = (name, album, time, id = 'f611fd8705dc1b7a5ac8a1c9d6397e81') => `<tr class="chartlist-row" data-edit-scrobble-id="${id}"><td class="chartlist-name"><a href="/music/Dean+Blunt/_/${name.replaceAll(' ', '+')}">${name}</a></td><td class="chartlist-album"><a href="/music/Dean+Blunt/${album}">${album}</a></td><td class="chartlist-timestamp"><span title="${time}">${time}</span></td></tr>`;
const history = (name, rows, next) => `<main class="col-main"><p class="metadata-display">${name === 'Paged' ? 10 : 2}</p><table class="chartlist"><tbody>${rows}</tbody></table>${next ? '<nav class="pagination"><a class="pagination-next" href="?page=2">Next</a></nav>' : ''}</main>`;
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
  let release;
  try {
    const page = await browser.newPage();
    const gate = new Promise(resolve => { release = resolve; });
    let hold = true;
    const requests = [];
    await page.route('https://lastfm-img.freetls.fastly.net/**', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=', 'base64') }));
    await page.route('https://www.last.fm/**', async r => {
      const u = new URL(r.request().url());
      if (u.pathname === '/user/DCCXX/library/tracks') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><table class="chartlist"><tbody><tr class="chartlist-row"><td class="chartlist-image"><span class="cover-art"><img width="34" height="34" style="visibility:hidden" src="${placeholder}"></span></td><td class="chartlist-name"><a href="/music/Dean+Blunt/_/lucre+5">lucre 5</a></td></tr></tbody></table>` });
      requests.push(u.pathname + u.search);
      if (u.pathname.includes('/_/')) {
        const name = decodeURIComponent(u.pathname.split('/').at(-1)).replaceAll('+', ' ');
        if (name === item.name && hold) await gate;
        const albums = name === 'Paged' ? (u.search ? ['Old','Old','Old','Old','Old','Recent'] : ['Recent','Recent','Recent','Old']) : ['LUCRE','LUCRE'];
        return r.fulfill({ contentType: 'text/html', body: history(name, albums.map((a,i) => row(name,a,`2026-10-${u.search ? '02' : '03'} ${i}:00`, a === 'Old' ? 'a'.repeat(32) : 'b'.repeat(32))).join(''), name === 'Paged' && !u.search) });
      }
      const noPrimary = u.pathname.endsWith('/NoPrimary');
      const missing = u.pathname.endsWith('/NoArt') || noPrimary;
      const generic = u.pathname.endsWith('/Sharing') || missing;
      return r.fulfill({ contentType: 'text/html', body: `<meta property="og:image" content="${missing ? placeholder : cover}">${noPrimary ? '' : `<div class="cover-art"><img src="${generic ? placeholder : cover}"></div>`}<aside><div class="cover-art"><img src="https://lastfm-img.freetls.fastly.net/i/u/300x300/unrelated.jpg"></div></aside>` });
    });
    await page.goto('https://www.last.fm/user/DCCXX/library/tracks');
    const savedRules = { artists: {}, albums: {}, tracks: {}, albumArtists: {} };
    const worker = await mockExtension(page, { settings: { username: 'DCCXX', infiniteScroll: false }, rules: savedRules,
      lfmPersonalArtworkCacheV1: [{ key: JSON.stringify(['dccxx','dean blunt','lucre 5']), username: 'DCCXX', item, checkedAt: Date.now(), cover: { artist: item.artist, album: 'LUCRE', image: placeholder, url: 'https://www.last.fm/music/Dean+Blunt/LUCRE', fallback: false, scanned: 2, total: 2, sourceVersion: 2 } }] });
    await page.evaluate(() => { let t = Date.now(); Date.now = () => t += 2000; });
    await loadScripts(page, ['rules.js','store.js','adapter.js','pages.js','artwork-source.js','artwork.js']);
    await page.waitForFunction(() => LastfmArtwork.status().cacheReady);
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.chartlist-image img').evaluate(i => getComputedStyle(i).visibility), 'hidden', 'the generic cover must never remain visible while resolving');
    assert.equal(await page.locator('.chartlist-image').getAttribute('title'), null);
    hold = false; release();
    await page.waitForFunction(src => document.querySelector('.chartlist-image img').src === src, cover, { timeout: 3000 });
    assert.equal(await page.locator('.chartlist-image img').evaluate(i => getComputedStyle(i).visibility), 'visible');
    assert.equal(await page.locator('.chartlist-image a').getAttribute('href'), 'https://www.last.fm/music/Dean+Blunt/LUCRE', 'a span placeholder must become a link to the selected album');
    assert.ok(requests.some(u => u.includes('/_/lucre+5')), 'an old cached generic cover must be resolved again');
    await page.evaluate(() => { LastfmArtworkAlbums = { peekMany: () => new Map(), resolve: async () => { throw new Error('The shared album totals were unavailable.'); } }; });
    const individual = await page.evaluate(() => LastfmArtworkSource.resolve({ artist: 'Dean Blunt', name: 'Fallback' }, 'DCCXX'));
    assert.equal(individual.album, 'LUCRE', 'a failed aggregate must fall back to the individual scrobble album');
    const beforePause = requests.length;
    const paused = await page.evaluate(async () => {
      const pages = LastfmPages;
      globalThis.LastfmPages = { ...pages, status: () => ({ rateLimited: true }) };
      try { await LastfmArtworkSource.resolve({ artist: 'Dean Blunt', name: 'Paused' }, 'DCCXX'); }
      catch (e) { return e.message; }
      finally { globalThis.LastfmPages = pages; }
    });
    assert.match(paused, /shared album totals/);
    assert.equal(requests.length, beforePause, 'a shared rate-limit pause must stop the fallback request');
    await page.evaluate(() => { delete globalThis.LastfmArtworkAlbums; });
    const paged = await page.evaluate(() => LastfmArtworkSource.resolve({ artist: 'Dean Blunt', name: 'Paged' }, 'DCCXX'));
    assert.equal(paged.album, 'Old', 'a repeated edit id on different pages is not a repeated scrobble');
    const sharing = await page.evaluate(() => LastfmArtworkSource.forBlankScrobble({ artist: 'Dean Blunt', name: 'Sharing' }, 'DCCXX'));
    assert.equal(sharing.image, cover, 'a generic primary cover must not mask real same-album sharing artwork');
    const missing = await page.evaluate(async () => { try { await LastfmArtworkSource.forBlankScrobble({ artist: 'Dean Blunt', name: 'NoArt' }, 'DCCXX'); } catch (e) { return e.message; } });
    assert.match(missing, /no available cover/, 'do not use a generic cover or a Similar Albums image when the selected album has no artwork');
    const noPrimary = await page.evaluate(async () => { try { await LastfmArtworkSource.forBlankScrobble({ artist: 'Dean Blunt', name: 'NoPrimary' }, 'DCCXX'); } catch (e) { return e.message; } });
    assert.match(noPrimary, /no available cover/, 'a missing primary image must never select a Similar Albums image');
    await page.evaluate(src => document.querySelector('tbody').insertAdjacentHTML('beforeend', `<tr class="chartlist-row" data-no-art><td class="chartlist-image"><span class="cover-art"><img width="34" height="34" src="${src}"></span></td><td class="chartlist-name"><a href="/music/Dean+Blunt/_/NoArt">NoArt</a><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Dean Blunt"><input name="track_name" value="NoArt"><input name="timestamp" value="100"></form></td></tr>`), placeholder);
    await page.waitForFunction(() => LastfmArtwork.status().jobs.unavailable === 1);
    assert.equal(await page.locator('[data-no-art] img').evaluate(i => getComputedStyle(i).visibility), 'hidden', 'an unavailable album must keep the generic icon hidden');
    assert.equal(worker.data.lfmPersonalArtworkCacheV1.some(r => r.item.name === 'NoArt'), false, 'generic artwork must not be saved as a successful result');
    await worker.externalSet({ settings: { username: 'Friend', infiniteScroll: false } });
    await page.waitForFunction(src => document.querySelector('.chartlist-image img').src === src, placeholder);
    assert.equal(await page.locator('.chartlist-image a').count(), 0, 'profile changes restore the original span');
    assert.equal(await page.locator('.chartlist-image img').first().evaluate(i => getComputedStyle(i).visibility), 'hidden', 'restore the original inline style on profile change');
    assert.deepEqual(worker.data.rules, savedRules);
    console.log('PASS: generic covers are hidden/re-resolved, selected album links replace spans, aggregate errors fall back, repeated ids count correctly, missing artwork is never substituted');
  } finally { release?.(); await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
