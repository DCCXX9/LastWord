const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const origin = 'https://www.last.fm', artist = 'Artist';
const image = name => `https://lastfm-img.freetls.fastly.net/i/u/64s/${name}.jpg`;
const row = name => `<tr class="chartlist-row"><td class="chartlist-image"><img width="32" height="32" src="${image('4128a6eb29f94943c9d206c08e625904')}"></td><td class="chartlist-name"><a href="/music/Artist/_/${name}">${name}</a></td><td><span data-stat-value="1"></span></td></tr>`;
const album = (name, tracks) => `<main class="col-main"><header class="library-header"><h2 class="library-header-title">${name}</h2><span class="library-header-image"><img src="${image(name)}"></span><a href="/music/Artist/${name}">Album</a></header><p class="metadata-display">${tracks.length}</p><table class="chartlist">${tracks.map(row).join('')}</table></main>`;
(async () => {
 const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
 try {
  const page = await browser.newPage(), calls = [];
  let corrupt = false;
  await page.route('https://lastfm-img.freetls.fastly.net/**', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=', 'base64') }));
  await page.route(origin + '/**', r => {
   const u = new URL(r.request().url()), path = u.pathname;
   if (path.endsWith('/+tracks')) return r.fulfill({ contentType: 'text/html', body: `<main class="col-main"><table class="chartlist"><tbody>${row('First')}${row('Second')}</tbody></table></main>` });
   calls.push(path);
   if (path.includes('/_/')) {
    const name = path.split('/_/')[1];
    return r.fulfill({ contentType: 'text/html', body: `<main class="col-main"><p class="metadata-display">1</p><table class="chartlist"><tr class="chartlist-row"><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Artist"><input name="track_name" value="${name}"><input name="album_name" value="Preferred"><input name="album_artist_name" value="Artist"><input name="timestamp" value="123"></form></td></tr></table></main>` });
   }
   if (path.startsWith('/user/DCCXX/library/music/+noredirect/Artist/')) {
    const name = path.split('/').at(-1);
    const body = album(name, name === 'Preferred' ? ['First', 'Second', 'Appended'] : ['Unrelated']);
    return r.fulfill({ contentType: 'text/html', body: corrupt ? body.replace('>3</p>', '>4</p>') : body });
   }
   return r.fulfill({ status: 503, body: 'The public album endpoint is unavailable.' });
  });
  await page.goto(origin + '/user/DCCXX/library/music/Artist/+tracks');
  const cache = Array.from({ length: 5 }, (_, n) => ({ key: JSON.stringify(['dccxx', 'artist', 'known' + n]),
   username: 'DCCXX', item: { artist, name: 'Known' + n }, checkedAt: Date.now(), cover: {
    artist, album: 'Other' + n, image: image('Other' + n), url: origin + '/music/Artist/Other' + n,
    total: 1, scanned: 1, sourceVersion: 3, fallback: false
   } }));
  cache.push({ key: JSON.stringify(['dccxx', 'artist', 'previous']), username: 'DCCXX',
   item: { artist, name: 'Previous' }, checkedAt: Date.now(), cover: {
    artist, album: 'Preferred', image: image('Preferred'), url: origin + '/music/Artist/Preferred',
    total: 1, scanned: 1, sourceVersion: 3, fallback: false
   } });
  const worker = await mockExtension(page, { settings: { username: 'DCCXX', infiniteScroll: true }, lfmPersonalArtworkCacheV1: cache });
  await page.evaluate(() => { let t = Date.now(); Date.now = () => t += 2000; });
  await loadScripts(page, ['rules.js', 'store.js', 'adapter.js', 'pages.js', 'artwork-albums.js']);
  await loadScripts(page, ['artwork-source.js', 'artwork.js']);
  await page.waitForFunction(() => LastfmArtwork.status().jobs.complete === 2);
  assert.equal(calls.filter(p => /\/Other\d$/.test(p)).length, 0,
   'one-play loose tracks must go directly to their authoritative history without speculative album guesses');
  assert.equal(calls.filter(p => p.includes('/_/')).length, 1,
   'reuse the newly proved album counts for the next row instead of fetching another history');
  assert.equal(calls.some(p => p.startsWith('/music/')), false,
   'use the signed-in album cover and totals together before trying the public album endpoint');
  const before = calls.length;
  const detached = await page.evaluate(async html => {
   const body=document.createElement('tbody');body.innerHTML=html;
   await LastfmArtwork.prepareRows([...body.children]);
   const image=body.querySelector('img');
   const before={src:image.src,visible:image.style.visibility !== 'hidden'};
   document.querySelector('tbody').append(...body.children);return before;
  },row('Appended'));
  assert.deepEqual(detached,{src:image('Preferred'),visible:true},'shared exact album counts must prepare a new track before it joins the document');
  await page.waitForFunction(() => LastfmArtwork.status().jobs.complete === 3);
  assert.equal(calls.length, before, 'scroll-added rows reuse the same verified counts without another request');
  assert.equal(await page.locator('tr').last().locator('img').getAttribute('src'), image('Preferred'));
  assert.equal(await page.locator('tr').last().locator('img').evaluate(i => i.naturalWidth > 0 && getComputedStyle(i).visibility === 'visible'), true);
  corrupt = true;
  const invalidCounts = await page.evaluate(async () => {
   LastfmArtworkSource.clear();
   const cover = await LastfmArtworkSource.resolve({ artist: 'Artist', name: 'First' }, 'DCCXX');
   LastfmArtworkAlbums.remember({ artist: 'Artist', name: 'First' }, cover, 'DCCXX');
   return { album: cover.album, others: LastfmArtworkAlbums.peekMany([{ artist: 'Artist', name: 'Second' }], 'DCCXX').size };
  });
  assert.deepEqual(invalidCounts, { album: 'Preferred', others: 0 },
   'a verified header can serve the proven individual, but incomplete counts cannot supply another track');
  assert.equal(worker.data.rules, undefined, 'no display preferences are created by artwork discovery');
  console.log('PASS: one history and the exact own-album response supply initial and appended covers beyond five prior album hints');
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
