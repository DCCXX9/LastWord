const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const root = 'https://www.last.fm';
const url = root + '/user/DCCXX/library/music/Homixide+Gang/+tracks';
const placeholder = 'https://lastfm-img.freetls.fastly.net/i/u/64s/4128a6eb29f94943c9d206c08e625904.jpg';
const cover = 'https://lastfm-img.freetls.fastly.net/i/u/64s/preferred-i5u5we5.jpg';
const encode = value => encodeURIComponent(value).replace(/%20/g, '+');
const trackPath = name => '/music/Homixide+Gang/_/' + encode(name);
const row = (name, rank, src = placeholder) => `<tr class="chartlist-row" style="height:50px"><td>${rank}</td><td class="chartlist-image"><span class="cover-art"><img width="34" height="34" src="${src}"></span></td><td class="chartlist-name"><a href="${trackPath(name)}">${name}</a></td><td>12</td></tr>`;
const form = (name, i, album = 'I5U5WE5', extra = '') => `<form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Homixide Gang"><input name="track_name" value="${name}"><input name="album_name" value="${album}"><input name="timestamp" value="${1000+i}">${extra}</form>`;
const history = name => `<main class="col-main"><p class="metadata-display">12</p><table class="chartlist">${Array.from({ length:12 }, (_,i) => `<tr class="chartlist-row" data-edit-scrobble-id="${'a'.repeat(32)}"><td class="chartlist-name"><a href="${trackPath(name)}">${name}</a></td><td class="chartlist-album"><a href="/music/Various/Compilation">Compilation</a></td><td>${form(name,i,name === 'Later song' && i < 3 ? 'Single' : 'I5U5WE5')}</td></tr>`).join('')}</table></main>`;
const scripts = ['rules.js','store.js','adapter.js','pages.js','artwork-source.js','artwork.js'];
(async () => {
  const browser = await chromium.launch({ headless:true, executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args:['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport:{ width:1000,height:500 } }), requests = [];
    await page.route('https://lastfm-img.freetls.fastly.net/**', r => r.fulfill({ contentType:'image/png', body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64') }));
    await page.route(root + '/**', r => {
      const u = new URL(r.request().url());
      if (u.href === url) return r.fulfill({ contentType:'text/html', body:`<main class="col-main"><table class="chartlist"><tbody>${Array.from({ length:41 },(_,i)=>row('Known song',i+1,cover)).join('')}${row('FiGure5 [INTERLUDE]',42)}</tbody></table></main>` });
      requests.push(u.pathname);
      if (u.pathname.includes('/_/')) return r.fulfill({ contentType:'text/html', body:history(decodeURIComponent(u.pathname.split('/_/')[1].replace(/\+/g,' '))) });
      if (u.pathname === '/music/Homixide+Gang/I5U5WE5') return r.fulfill({ contentType:'text/html', body:`<div class="cover-art"><img src="${cover}"></div>` });
      return r.fulfill({ status:404,body:'An unrelated or redirected album must never supply this cover.' });
    });
    await page.goto(url);
    const rules = { artists:{},albums:{},tracks:{},albumArtists:{} }, settings = { username:'DCCXX',infiniteScroll:true };
    const worker = await mockExtension(page, { rules,settings, lfmPersonalArtworkCacheV1:[{key:JSON.stringify(['dccxx','homixide gang','known song']),username:'DCCXX',item:{artist:'Homixide Gang',name:'Known song'},cover:{artist:'Homixide Gang',album:'I5U5WE5',image:cover,url:root+'/music/Homixide+Gang/I5U5WE5',fallback:false,scanned:12,total:12,sourceVersion:3},checkedAt:Date.now()}] });
    await page.evaluate(()=>{let t=Date.now();Date.now=()=>t+=2000;});
    await loadScripts(page,scripts);
    const target = page.locator('tr.chartlist-row').nth(41);
    await target.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>LastfmArtwork.status().jobs.unavailable || LastfmArtwork.status().jobs.complete===2);
    assert.equal(await page.evaluate(()=>LastfmArtwork.status().lastError),null,'a missing optional album-artist tag must not reject a verified track album');
    await page.waitForFunction(src=>{const i=document.querySelectorAll('tr.chartlist-row')[41].querySelector('img');return i.src===src&&i.naturalWidth>0&&getComputedStyle(i).visibility==='visible';},cover,{timeout:5000});
    assert.equal(await target.locator('.chartlist-image a').getAttribute('href'),root+'/music/Homixide+Gang/I5U5WE5');
    assert.equal(requests.length,2,'rank 42 resolves from its own history and album, without visiting the earlier cached tracks');
    assert.equal(await page.evaluate(html=>{const f=new DOMParser().parseFromString(html,'text/html').querySelector('form');return LastfmAdapter.editRow(f,location.href,'DCCXX',true);},form('FiGure5 [INTERLUDE]',1)),null,'native edit validation remains strict about a missing album-artist field');
    // A later infinite-scroll page has a different track and mixed album tags.
    await page.evaluate(html=>document.querySelector('tbody').insertAdjacentHTML('beforeend',html),row('Later song',51));
    const later = page.locator('tr.chartlist-row').last();
    await later.scrollIntoViewIfNeeded();
    await page.waitForFunction(src=>{const i=[...document.querySelectorAll('tr.chartlist-row')].at(-1).querySelector('img');return i.src===src&&i.naturalWidth>0;},cover,{timeout:5000});
    assert.equal(await later.locator('.chartlist-image a').getAttribute('href'),root+'/music/Homixide+Gang/I5U5WE5','a later row uses the nine-play album rather than the three-play single or rendered compilation');
    assert.equal(requests.length,3,'tracks on the same album reuse its resolved artwork');
    const invalid = await page.evaluate(async html=>{
      const doc=new DOMParser().parseFromString(html,'text/html');
      const original=LastfmPages;
      globalThis.LastfmPages={...original,get:async u=>({url:u,doc})};
      try {await LastfmArtworkSource.resolve({artist:'Homixide Gang',name:'Invalid',placeholder:true},'DCCXX');return null;}
      catch(error){return error.message;}
      finally{globalThis.LastfmPages=original;}
    },history('Invalid').replaceAll('<input name="timestamp"','<input name="album_name" value="Wrong"><input name="timestamp"'));
    assert.match(invalid,/could not be verified/,'duplicate native album tags cannot fall through to a canonical rendered column');
    await page.waitForFunction(()=>LastfmArtwork.status().jobs.complete===3);
    assert.deepEqual(worker.data.rules,rules); assert.deepEqual(worker.data.settings,settings);
    // Revisit after the normal cache write has completed: no history queue delay.
    const deadline=Date.now()+3000;
    while (Date.now()<deadline && !(worker.data.lfmPersonalArtworkCacheV1 || []).some(x=>x.item.name==='FiGure5 [INTERLUDE]')) await new Promise(resolve=>setTimeout(resolve,10));
    assert.ok(worker.data.lfmPersonalArtworkCacheV1.some(x=>x.item.name==='FiGure5 [INTERLUDE]'));
    const before=requests.length;
    await page.reload();
    await mockExtension(page,{}, {worker}); await loadScripts(page,scripts);
    await page.waitForFunction(src=>document.querySelectorAll('tr.chartlist-row')[41].querySelector('img').src===src,cover,{timeout:1200});
    assert.equal(requests.length,before,'saved winners apply to offscreen rows immediately without repeating discovery');
    console.log('PASS: full artist Tracks list, rank-42 partial native tags, correct album/link, later mixed-album row, strict edit/duplicate guards, painted covers and immediate cached revisit');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
