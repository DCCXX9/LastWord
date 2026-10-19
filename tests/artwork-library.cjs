const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'), origin = 'https://www.last.fm';
const library = '/user/DCCXX/library/tracks';
const scrobbles = '/user/DCCXX/library';
const encode = s => encodeURIComponent(s).replace(/%20/g, '+');
const placeholder = 'https://lastfm-img.freetls.fastly.net/i/u/64s/4128a6eb29f94943c9d206c08e625904.jpg';
// Deliberately identical titles across artists must never share album counts/art.
const items = [
  { artist: 'Playboi Carti', name: '2024', album: 'MUSIC', plays: 63, id: 'carti' },
  { artist: 'Homixide Gang', name: 'FiGure5 [INTERLUDE]', album: 'I5U5WE5', plays: 12, id: 'homixide' },
  { artist: 'Other Artist', name: '2024', album: 'MUSIC', plays: 9, id: 'other' },
  { artist: 'Uncached Artist', name: 'No saved hint', album: 'Scrobbled Album', plays: 2, id: 'cold' }
];
const laterScrobble = {...items[3],name:'New scrobble',plays:3};
const albumPath = i => '/music/' + encode(i.artist) + '/' + encode(i.album);
const trackPath = i => '/music/' + encode(i.artist) + '/_/' + encode(i.name);
const image = i => 'https://lastfm-img.freetls.fastly.net/i/u/64s/' + i.id + '.jpg';
const padding = Array.from({length:48}, (_,n) => ({artist:'Padding Artist',name:'Already verified '+n,album:'Padding Album',plays:1,id:'padding'}));
const row = (i, plays = i.plays) => `<tr class="chartlist-row"><td class="chartlist-image"><span class="cover-art"><img width="32" height="32" src="${placeholder}"></span></td><td class="chartlist-name"><a href="${trackPath(i)}">${i.name}</a></td><td><span data-stat-value="${plays}">${plays}</span></td></tr>`;
const albumPage = i => `<main class="col-main"><header class="library-header"><h2 class="library-header-title">${i.album}</h2><span class="library-header-image"><img src="${image(i)}"></span><a href="${albumPath(i)}">Go to album page</a></header><p class="metadata-display">${i.plays}</p><table class="chartlist">${row(i)}</table></main>`;
const list = second => `<main class="col-main"><table class="chartlist"><tbody>${(second ? items.slice(2) : [...items.slice(0,2),...padding]).map(i => row(i)).join('')}</tbody></table>${second ? '' : '<nav class="pagination"><a class="pagination-next" href="?page=2">Next</a></nav>'}</main>`;
const history = i => `<main class="col-main"><p class="metadata-display">${i.plays}</p><table class="chartlist">${Array.from({length:i.plays}, (_,n) => `<tr class="chartlist-row"><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="${i.artist}"><input name="track_name" value="${i.name}"><input name="album_name" value="${i.album}"><input name="album_artist_name" value="${i.artist}"><input name="timestamp" value="${1000+n}"></form></td></tr>`).join('')}</table></main>`;
const scrobbleList = second => `<main class="col-main"><table class="chartlist"><tbody>${(second ? [laterScrobble] : items.slice(0,2)).map(i => row(i).replace('</tr>',`<td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="${i.artist}"><input name="track_name" value="${i.name}"><input name="album_name" value="Recent Single"><input name="album_artist_name" value="${i.artist}"><input name="timestamp" value="1000"></form></td></tr>`)).join('')}</tbody></table>${second ? '' : '<nav class="pagination"><a class="pagination-next" href="?page=2">Next</a></nav>'}</main>`;
(async () => {
  const profile = fs.mkdtempSync(path.join(root, 'test-results', 'library-artwork-profile-'));
  const browser = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, headless: false,
    args: ['--headless=new', '--no-sandbox', `--disable-extensions-except=${root}`, `--load-extension=${root}`]
  });
  try {
    const calls = [], errors = [];
    await browser.route('https://lastfm-img.freetls.fastly.net/**', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=', 'base64') }));
    await browser.route(origin + '/**', r => {
      const u = new URL(r.request().url());
      if (u.pathname === library) return r.fulfill({ contentType: 'text/html', body: list(u.searchParams.has('page')) });
      if (u.pathname === scrobbles) return r.fulfill({contentType:'text/html',body:scrobbleList(u.searchParams.has('page'))});
      calls.push(u.pathname);
      const album = items.find(i => u.pathname === '/user/DCCXX/library/music/+noredirect/' + encode(i.artist) + '/' + encode(i.album));
      if (album) return r.fulfill({ contentType: 'text/html', body: albumPage(album) });
      const cold = items[3], track = [cold,laterScrobble].find(i => u.pathname === '/user/DCCXX/library/music/+noredirect/' + encode(i.artist) + '/_/' + encode(i.name));
      if (track) return r.fulfill({ contentType: 'text/html', body: track === laterScrobble ? history(track).replace(`name="album_name" value="${track.album}"`,'name="album_name" value="Recent Single"') : history(track) });
      if (u.pathname === albumPath(cold)) return r.fulfill({ contentType: 'text/html', body: `<div class="cover-art"><img src="${image(cold)}"></div>` });
      return r.fulfill({ status: 600, body: 'Last.fm - Temporarily Unavailable' });
    });
    const worker = browser.serviceWorkers()[0] || await browser.waitForEvent('serviceworker');
    const setupUrl = new URL('options.html', worker.url()).href, deadline = Date.now() + 10000;
    let setup;
    while (!(setup = browser.pages().find(p => p.url() === setupUrl)) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve,25));
    assert.ok(setup); await setup.locator('#profile-status').filter({hasText:'Not connected'}).waitFor();
    const settings = { username: 'DCCXX', infiniteScroll: true }, rules = { artists:{}, albums:{}, tracks:{}, albumArtists:{} };
    const decoys = Array.from({length:6},(_,n) => ({...items[0],artist:'Unrelated Artist '+n}));
    const cache = [...decoys,...items.slice(0,3)].map(i => ({ key:JSON.stringify(['dccxx',i.artist.toLowerCase(),'off-page seed']), username:'DCCXX',
      item:{artist:i.artist,name:'Off-page seed'}, checkedAt:Date.now()-14*86400000,
      cover:{artist:i.artist,album:i.album,image:placeholder.replace('4128a6eb29f94943c9d206c08e625904','old-'+i.id),url:origin+albumPath(i),fallback:false,scanned:1,total:1} }));
    cache.push(...padding.map(i => ({key:JSON.stringify(['dccxx',i.artist.toLowerCase(),i.name.toLowerCase()]),username:'DCCXX',
      item:{artist:i.artist,name:i.name},checkedAt:Date.now(),
      cover:{artist:i.artist,album:i.album,image:image(i),url:origin+albumPath(i),fallback:false,scanned:1,total:1,sourceVersion:3}})));
    await worker.evaluate(data => chrome.storage.local.set(data), {settings,rules,lfmPersonalArtworkCacheV1:cache});
    const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message));
    const painted = async i => {
      const target = page.locator(`.chartlist-name a[href="${trackPath(i)}"]`).locator('..').locator('..');
      await target.scrollIntoViewIfNeeded();
      await page.waitForFunction(({href,src}) => {
        const a = [...document.querySelectorAll('.chartlist-name a')].find(a => a.getAttribute('href') === href);
        const img = a?.closest('tr').querySelector('img');
        return img?.src === src && img.naturalWidth > 0 && getComputedStyle(img).visibility === 'visible';
      }, {href:trackPath(i),src:image(i)}, {timeout:10000});
      assert.equal(await target.locator('.chartlist-image a').getAttribute('href'), origin+albumPath(i));
    };
    await page.goto(origin+library);
    for (const i of items.slice(0,2)) await painted(i);
    await page.getByRole('button',{name:'Yes',exact:true}).click();
    await page.waitForFunction(() => document.querySelectorAll('tr.chartlist-row').length === 52);
    for (const i of items.slice(2)) await painted(i);
    assert.equal(calls.filter(p => p.includes('/_/')).length, 1, 'only the genuinely uncached artist needs an individual history');
    for (const i of items.slice(0,3)) assert.equal(calls.filter(p => p.endsWith('/'+encode(i.artist)+'/'+encode(i.album))).length,1);
    await page.waitForFunction(() => !document.querySelector('.lfm-scroll-status'));
    const before = calls.length;
    await page.reload();
    for (const i of items.slice(0,2)) await painted(i);
    assert.equal(calls.length,before,'verified winners paint on revisit without new discovery');
    assert.equal(calls.some(p => p.includes('Unrelated+Artist')),false,'other artists cannot consume the per-artist album bound');
    await page.goto(origin+scrobbles);
    for (const i of items.slice(0,2)) await painted(i);
    await page.getByRole('button',{name:'Yes',exact:true}).click();
    await page.waitForFunction(() => document.querySelectorAll('tr.chartlist-row').length === 3);
    await painted(laterScrobble);
    assert.equal(calls.filter(p => p.endsWith('/_/New+scrobble')).length,1,'an uncached scroll-added scrobble uses its own history');
    assert.deepEqual(await worker.evaluate(() => chrome.storage.local.get(['settings','rules'])),{settings,rules});
    assert.deepEqual(errors,[]);
    console.log('PASS: mixed-artist Tracks past 50, off-page legacy hints, same-title isolation, bounded artist candidates, cold history fallback, cached revisit and scroll-added native scrobbles');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
