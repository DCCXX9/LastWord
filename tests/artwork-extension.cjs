const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const image = 'https://lastfm-img.freetls.fastly.net/i/u/64s/9741753a613314214accd15a28eb91da.jpg';
const row = `<tr class="chartlist-row"><td class="chartlist-image"><a href="/music/Wrong/Compilation"><img width="34" height="34" src="https://lastfm-img.freetls.fastly.net/i/u/64s/wrong.jpg"></a></td><td class="chartlist-name"><a href="/music/Test+Artist/_/Track">Track</a></td></tr>`;
const blankRow = row.replace('/music/Test+Artist/_/Track', '/music/Silent%C3%B3/_/Watch+Me+(Whip+%2F+Nae+Nae)').replace('>Track</a>', '>Watch Me (Whip / Nae Nae)</a>');
const blankHistory = '/user/DCCXX/library/music/+noredirect/Silent%C3%B3/_/Watch+Me+(Whip+%2F+Nae+Nae)';
const singleAlbum = '/music/Silent%C3%B3/Watch+Me+(Whip+%2F+Nae+Nae)';
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
   if(url.pathname==='/user/DCCXX/library') return route.fulfill({contentType:'text/html',body:`<!doctype html><section class="tracklist-section"><h2 class="date-heading">Today</h2><table class="chartlist"><tbody>${blankRow}</tbody></table></section>`});
   requests.push(url.pathname);
   if(url.pathname==='/user/DCCXX/library/music/+noredirect/Test+Artist/_/Track') return route.fulfill({contentType:'text/html',body:`<!doctype html><main class="col-main"><p class="metadata-display">1</p><table class="chartlist"><tbody><tr class="chartlist-row"><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Test Artist"><input name="track_name" value="Track"><input name="album_name" value="Album"><input name="album_artist_name" value=""><input name="timestamp" value="1234"></form></td></tr></tbody></table></main>`});
   if(url.pathname==='/music/Test+Artist/Album') return route.fulfill({contentType:'text/html',body:'<!doctype html><meta property="og:image" content="https://lastfm-img.freetls.fastly.net/i/u/ar0/9741753a613314214accd15a28eb91da.jpg">'});
   if(url.pathname===blankHistory) return route.fulfill({contentType:'text/html',body:'<!doctype html><main class="col-main"><p class="metadata-display">1</p><table class="chartlist"><tbody><tr class="chartlist-row"><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Silentó"><input name="track_name" value="Watch Me (Whip / Nae Nae)"><input name="timestamp" value="3"></form></td></tr></tbody></table></main>'});
   if(url.pathname===singleAlbum) return route.fulfill({contentType:'text/html',body:'<!doctype html><div class="cover-art"><img src="https://lastfm-img.freetls.fastly.net/i/u/500x500/9741753a613314214accd15a28eb91da.jpg"></div>'});
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
  await page.goto('https://www.last.fm/user/DCCXX/library');
  await page.waitForFunction(image=>document.querySelector('.chartlist-image img').src===image,image);
  assert.equal(await page.locator('.chartlist-image a').getAttribute('href'),'https://www.last.fm'+singleAlbum,'Watch Me must use its title-album cover and link with both album fields omitted');
  assert.deepEqual(requests.slice(2),[blankHistory,singleAlbum]);
  for(let n=0;n<20;n++) {
   if((await worker.evaluate(()=>chrome.storage.local.get('lfmPersonalArtworkCacheV1'))).lfmPersonalArtworkCacheV1?.length===2) break;
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  await page.reload();
  await page.waitForFunction(image=>document.querySelector('.chartlist-image img').src===image,image,{timeout:2000});
  assert.equal(requests.length,4,'Watch Me repeat visits must not wait for another server lookup');
  assert.deepEqual(await worker.evaluate(()=>chrome.storage.local.get(['rules','settings'])),before,'the real extension must not write display preferences/settings during artwork lookup');
  await page.goto('https://www.last.fm/user/Friend/library/tracks');
  assert.equal(await page.locator('.chartlist-image img').getAttribute('src'),'https://lastfm-img.freetls.fastly.net/i/u/64s/wrong.jpg');
  assert.equal(requests.length,4);
  console.log('PASS: actual unpacked extension injects personal covers, uses shared requests, preserves preferences and excludes friends');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
