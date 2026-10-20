const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const image = 'https://lastfm-img.freetls.fastly.net/i/u/64s/personal.jpg';
const wrong = 'https://lastfm-img.freetls.fastly.net/i/u/64s/compilation.jpg';
const url = 'https://www.last.fm/user/DCCXX/library/tracks';
const item = { artist: 'Different Artist', name: 'Song' };
const row = `<tr class="chartlist-row"><td class="chartlist-image"><a href="/music/Various/Compilation"><img width="34" height="34" src="${wrong}"></a></td><td class="chartlist-name"><a href="/music/Different+Artist/_/Song">Song</a></td></tr>`;
(async () => {
  const browser = await chromium.launch({ headless:true, executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args:['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    let requests = 0;
    await page.route('https://www.last.fm/**', route => {
      const u = new URL(route.request().url());
      if (u.pathname === '/user/DCCXX/library/tracks') return route.fulfill({ body:`<table class="chartlist">${row}</table>` });
      requests++;
      if (u.pathname.includes('/_/Song')) return route.fulfill({ body:`<main class="col-main"><p class="metadata-display">1</p><table class="chartlist"><tr class="chartlist-row" data-edit-scrobble-id="${'a'.repeat(32)}"><td class="chartlist-name"><a href="/music/Different+Artist/_/Song">Song</a></td><td class="chartlist-album"><a href="/music/Different+Artist/Canonical">Canonical</a></td><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Different Artist"><input name="track_name" value="Song"><input name="album_name" value="Personal Album"><input name="album_artist_name" value="Different Artist"><input name="timestamp" value="1"></form></td></tr></table></main>` });
      return route.fulfill({ body:`<div class="cover-art"><img src="${image}"></div>` });
    });
    await page.goto(url);
    await mockExtension(page, {settings:{username:'DCCXX',infiniteScroll:true}});
    await page.evaluate(() => { let t=Date.now(); Date.now=()=>t+=2000; });
    await loadScripts(page,['rules.js','store.js','adapter.js','pages.js','artwork-source.js']);
    const selected = await page.evaluate(item=>LastfmArtworkSource.resolve(item,'DCCXX'),item);
    assert.equal(selected.album,'Personal Album','raw scrobble fields take precedence over a redirected/canonical album column');
    await page.close();

    const cached = await browser.newPage();
    await cached.route('https://www.last.fm/**', r=>r.fulfill({ body:`<table class="chartlist">${row}</table>` }));
    await cached.goto(url);
    const worker = await mockExtension(cached,{settings:{username:'DCCXX',infiniteScroll:false},lfmPersonalArtworkCacheV1:[{key:JSON.stringify(['dccxx','different artist','song']),username:'DCCXX',item,cover:{artist:item.artist,album:'Personal Album',url:'https://www.last.fm/music/Different+Artist/Personal+Album',image,fallback:false,scanned:1,total:1,sourceVersion:3},checkedAt:Date.now()}]});
    await loadScripts(cached,['rules.js','store.js','adapter.js','artwork.js']);
    await cached.waitForFunction(src=>document.querySelector('img').src===src,image);
    assert.equal(requests,2,'cached display has no dependency on a live artwork resolver or network queue');
    await cached.evaluate(src=>{const img=document.querySelector('img'); img.src=src;img.srcset=src+' 2x';img.style.visibility='hidden';document.querySelector('.chartlist-image a').href='/music/Various/Compilation';},wrong);
    await cached.waitForFunction(src=>{const i=document.querySelector('img');return i.src===src&&!i.srcset&&i.style.visibility==='visible'&&i.closest('a').pathname.endsWith('/Personal+Album');},image,{timeout:1200});
    await worker.externalSet({settings:{username:'Friend',infiniteScroll:false}});
    await cached.waitForFunction(src=>document.querySelector('img').src===src,wrong);
    assert.equal(await cached.locator('.chartlist-image a').getAttribute('href'),'/music/Various/Compilation');
    console.log('PASS: native album authority, immediate cached covers, lazy-loader image/link repair and profile restoration');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
