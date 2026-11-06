// v0.9.15 default: artwork makes no Last.fm page requests. Rows show Last.fm's
// own image and link, replaced only by covers the extension already knows.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {mockExtension,loadScripts}=require('./harness.cjs');
const origin='https://www.last.fm',image=n=>`https://lastfm-img.freetls.fastly.net/i/u/64s/${n}.jpg`;
const generic='4128a6eb29f94943c9d206c08e625904';
const ranked=(name,art)=>`<tr class="chartlist-row"><td class="chartlist-image"><a href="/music/Artist/Native"><img width="32" height="32" alt="Native" title="Native" src="${image(art)}"></a></td><td class="chartlist-name"><a href="/music/Artist/_/${name}">${name}</a></td><td data-stat-value="7"></td></tr>`;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),requests=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://lastfm-img.freetls.fastly.net/**',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64')}));
  await page.route(origin+'/**',r=>{
   const u=new URL(r.request().url());
   if(u.pathname.endsWith('/+tracks')&&!u.search)return r.fulfill({contentType:'text/html',body:`<main class="col-main"><table class="chartlist"><tbody>${ranked('Known','native')}${ranked('Cold','native')}${ranked('Old','native')}${ranked('NoArt',generic)}</tbody></table></main>`});
   requests.push(u.pathname+u.search);return r.fulfill({status:500,body:'No page requests expected'});
  });
  await page.goto(origin+'/user/DCCXX/library/music/Artist/+tracks');
  const record=(name,days)=>({key:JSON.stringify(['dccxx','artist',name.toLowerCase()]),username:'DCCXX',item:{artist:'Artist',name},checkedAt:Date.now()-days*86400000,
   cover:{artist:'Artist',album:'Winner',image:image('Winner'),url:origin+'/music/Artist/Winner',total:7,scanned:7,fallback:false,sourceVersion:3}});
  const worker=await mockExtension(page,{settings:{username:'DCCXX'},lfmPersonalArtworkCacheV1:[record('Known',1/24),record('Old',90)]},{artworkLookups:false});
  await loadScripts(page,['rules.js','store.js','adapter.js','redirects.js','image-recovery.js','artwork.js','pages.js','artwork-albums.js','artwork-source.js']);
  await page.waitForFunction(()=>LastfmArtwork.status().cacheReady&&LastfmArtwork.status().held===0);
  const rows=await page.locator('.chartlist-image img').evaluateAll(images=>images.map(i=>({src:i.src.split('/').pop(),visible:getComputedStyle(i).visibility,
   href:i.closest('a')?.getAttribute('href'),marked:i.hasAttribute('data-lfm-artwork'),title:i.getAttribute('title')})));
  assert.deepEqual(rows[0],{src:'Winner.jpg',visible:'visible',href:origin+'/music/+noredirect/Artist/Winner',marked:false,title:rows[0].title},'a saved winner replaces Last.fm’s image');
  assert.deepEqual(rows[1],{src:'native.jpg',visible:'visible',href:origin+'/music/+noredirect/Artist/Native',marked:false,title:'Native'},'an unknown track shows Last.fm’s own image and identity unchanged');
  assert.equal(rows[2].src,'Winner.jpg','an old saved winner is still used, since it cannot be refreshed without requests');
  assert.equal(rows[3].visible,'visible','Last.fm’s placeholder shows as Last.fm shows it');
  await page.waitForTimeout(4000);
  assert.deepEqual(requests,[],'artwork must not fetch any Last.fm pages');
  assert.deepEqual(errors,[],'no page errors');
  assert.equal(await page.evaluate(()=>LastfmArtwork.status().lookups),false);
  assert.equal(worker.data.lfmArtworkLookups,undefined,'the default is not written to storage');
  console.log('PASS: zero-request artwork shows Last.fm’s image, applies saved winners of any age, and fetches no pages');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
