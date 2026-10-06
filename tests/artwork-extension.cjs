const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const image = 'https://lastfm-img.freetls.fastly.net/i/u/64s/9741753a613314214accd15a28eb91da.jpg';
const row = `<tr class="chartlist-row"><td class="chartlist-image"><a href="/music/Wrong/Compilation"><img width="34" height="34" src="https://lastfm-img.freetls.fastly.net/i/u/64s/wrong.jpg"></a></td><td class="chartlist-name"><a href="/music/Test+Artist/_/Track">Track</a></td></tr>`;
(async()=>{
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
 const profile=fs.mkdtempSync(path.join(root,'test-results','artwork-profile-'));
 const browser=await chromium.launchPersistentContext(profile,{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,headless:false,
  args:['--headless=new','--no-sandbox',`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 try{
  const requests=[];
  await browser.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.protocol==='chrome-extension:') return route.continue();
   if(url.hostname==='lastfm-img.freetls.fastly.net') return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64')});
   if(url.hostname!=='www.last.fm') return route.abort();
   if(url.pathname.endsWith('/library/tracks')) return route.fulfill({contentType:'text/html',body:`<!doctype html><h1>Tracks</h1><table class="chartlist"><tbody>${row}</tbody></table>`});
   requests.push(url.pathname);
   if(url.pathname==='/user/DCCXX/library/music/+noredirect/Test+Artist/_/Track') return route.fulfill({contentType:'text/html',body:`<!doctype html><main class="col-main"><p class="metadata-display">1</p><table class="chartlist"><tbody><tr class="chartlist-row"><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Test Artist"><input name="track_name" value="Track"><input name="album_name" value="Album"><input name="album_artist_name" value=""><input name="timestamp" value="1234"></form></td></tr></tbody></table></main>`});
   if(url.pathname==='/music/Test+Artist/Album') return route.fulfill({contentType:'text/html',body:'<!doctype html><meta property="og:image" content="https://lastfm-img.freetls.fastly.net/i/u/ar0/9741753a613314214accd15a28eb91da.jpg">'});
   return route.fulfill({status:404,body:'Unexpected request'});
  });
  const worker=browser.serviceWorkers()[0]||await browser.waitForEvent('serviceworker');
  const before=await worker.evaluate(()=>chrome.storage.local.get(['rules','settings']));
  const page=await browser.newPage();
  await page.goto('https://www.last.fm/user/DCCXX/library/tracks');
  await page.waitForFunction(image=>document.querySelector('.chartlist-image img').src===image,image);
  assert.equal(await page.locator('.chartlist-image a').getAttribute('href'),'https://www.last.fm/music/Test+Artist/Album');
  assert.deepEqual(requests,['/user/DCCXX/library/music/+noredirect/Test+Artist/_/Track','/music/Test+Artist/Album']);
  for(let n=0;n<20;n++) {
   if((await worker.evaluate(()=>chrome.storage.local.get('lfmPersonalArtworkCacheV1'))).lfmPersonalArtworkCacheV1?.length) break;
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  assert.equal((await worker.evaluate(()=>chrome.storage.local.get('lfmPersonalArtworkCacheV1'))).lfmPersonalArtworkCacheV1.length,1);
  await page.reload();
  await page.waitForFunction(image=>document.querySelector('.chartlist-image img').src===image,image,{timeout:2000});
  assert.equal(requests.length,2,'fresh cached artwork must survive reload without another history/album request');
  assert.deepEqual(await worker.evaluate(()=>chrome.storage.local.get(['rules','settings'])),before,'the real extension must not write display preferences/settings during artwork lookup');
  await page.goto('https://www.last.fm/user/Friend/library/tracks');
  assert.equal(await page.locator('.chartlist-image img').getAttribute('src'),'https://lastfm-img.freetls.fastly.net/i/u/64s/wrong.jpg');
  assert.equal(requests.length,2);
  console.log('PASS: actual unpacked extension injects personal covers, uses shared requests, preserves preferences and excludes friends');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
