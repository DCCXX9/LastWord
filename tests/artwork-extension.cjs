const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const image = 'https://lastfm-img.freetls.fastly.net/i/u/64s/9741753a613314214accd15a28eb91da.jpg';
const row = `<tr class="chartlist-row"><td class="chartlist-image"><a href="/music/Wrong/Compilation"><img width="34" height="34" src="https://lastfm-img.freetls.fastly.net/i/u/64s/wrong.jpg"></a></td><td class="chartlist-name"><a href="/music/Test+Artist/_/Track">Track</a></td></tr>`;
const blankRow = row.replace('/music/Test+Artist/_/Track', '/music/Silent%C3%B3/_/Watch+Me+(Whip+%2F+Nae+Nae)').replace('>Track</a>', '>Watch Me (Whip / Nae Nae)</a>').replace('</td></tr>', '<form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Silentó"><input name="track_name" value="Watch Me (Whip / Nae Nae)"><input name="timestamp" value="3"></form></td></tr>');
const blankHistory = '/user/DCCXX/library/music/+noredirect/Silent%C3%B3/_/Watch+Me+(Whip+%2F+Nae+Nae)';
const singleAlbum = '/music/Silent%C3%B3/Watch+Me+(Whip+%2F+Nae+Nae)';
const artistLibrary = '/user/DCCXX/library/music/Playboi+Carti';
const ownedMusic = '/user/DCCXX/library/music/+noredirect/Playboi+Carti/Music';
const musicImage = 'https://lastfm-img.freetls.fastly.net/i/u/64s/2fcb1df976faa7f06b07553484d4cd6d.jpg';
const albumView = '/user/DCCXX/library/music/Playboi+Carti/Another+Album';
const albumViewImage = 'https://lastfm-img.freetls.fastly.net/i/u/64s/another-album.jpg';
const cartiRow = row.replace('/music/Test+Artist/_/Track','/music/Playboi+Carti/_/2024').replace('>Track</a>','>2024</a>').replace('</td></tr>','</td><td class="chartlist-bar"><span data-stat-value="63"></span></td></tr>');
const musicRow = row.replace('/music/Test+Artist/_/Track','/music/Playboi+Carti/Music').replace('>Track</a>','>Music</a>').replace('https://lastfm-img.freetls.fastly.net/i/u/64s/wrong.jpg',musicImage).replace('</td></tr>','</td><td class="chartlist-bar"><span data-stat-value="63"></span></td></tr>');
(async()=>{
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
 const profile=fs.mkdtempSync(path.join(root,'test-results','artwork-profile-'));
 const browser=await chromium.launchPersistentContext(profile,{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,headless:false,
  args:['--headless=new','--no-sandbox',`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 try{
  const requests=[];
  let stagedScrobble = false;
  let blockMusic = false;
  await browser.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.protocol==='chrome-extension:') return route.continue();
   if(url.hostname==='lastfm-img.freetls.fastly.net') return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64')});
   if(url.hostname!=='www.last.fm') return route.abort();
   if(url.pathname.endsWith('/library/tracks')) return route.fulfill({contentType:'text/html',body:`<!doctype html><h1>Tracks</h1><table class="chartlist"><tbody>${row}</tbody></table>`});
   if(url.pathname===artistLibrary) return route.fulfill({contentType:'text/html',body:`<!doctype html><main class="col-main"><table class="chartlist"><tbody>${musicRow}</tbody></table><table class="chartlist"><tbody>${cartiRow}</tbody></table></main>`});
   if(url.pathname===albumView) return route.fulfill({contentType:'text/html',body:`<!doctype html><main class="col-main"><header class="library-header"><span class="library-header-image"><img src="${albumViewImage.replace('/64s/','/avatar70s/')}"></span><h2>Another Album</h2><a href="/music/Playboi+Carti/Another+Album">Go to album page</a></header><table class="chartlist"><tbody>${cartiRow}</tbody></table></main>`});
   if(url.pathname==='/user/DCCXX/library') {
    const fields = blankRow.match(/<form[\s\S]*?<\/form>/)[0];
    const initial = stagedScrobble ? blankRow.replace(fields,'') : blankRow;
    const later = stagedScrobble ? `<script>setTimeout(()=>{document.querySelector('.chartlist-name').insertAdjacentHTML('beforeend',${JSON.stringify(fields)});requestAnimationFrame(()=>document.documentElement.dataset.coverAtFirstFrame=document.querySelector('.chartlist-image img').src)},300)</script>` : '';
    return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><section class="tracklist-section"><h2 class="date-heading">Today</h2><table class="chartlist"><tbody>${initial}</tbody></table></section>${later}`});
   }
   requests.push(url.pathname);
   if(url.pathname===ownedMusic) {
    if(blockMusic) return;
    return route.fulfill({contentType:'text/html',body:`<!doctype html><main class="col-main"><p class="metadata-display">63</p><table class="chartlist"><tbody>${cartiRow}</tbody></table></main>`});
   }
   if(stagedScrobble && url.pathname===blankHistory) return; // A known cover must not depend on this response.
   if(url.pathname==='/user/DCCXX/library/music/+noredirect/Test+Artist/_/Track') return route.fulfill({contentType:'text/html',body:`<!doctype html><main class="col-main"><p class="metadata-display">1</p><table class="chartlist"><tbody><tr class="chartlist-row"><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Test Artist"><input name="track_name" value="Track"><input name="album_name" value="Album"><input name="album_artist_name" value=""><input name="timestamp" value="1234"></form></td></tr></tbody></table></main>`});
   if(url.pathname==='/music/Test+Artist/Album') return route.fulfill({contentType:'text/html',body:'<!doctype html><meta property="og:image" content="https://lastfm-img.freetls.fastly.net/i/u/ar0/9741753a613314214accd15a28eb91da.jpg">'});
   if(url.pathname===blankHistory) return route.fulfill({contentType:'text/html',body:'<!doctype html><main class="col-main"><p class="metadata-display">1</p><table class="chartlist"><tbody><tr class="chartlist-row"><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Silentó"><input name="track_name" value="Watch Me (Whip / Nae Nae)"><input name="timestamp" value="3"></form></td></tr></tbody></table></main>'});
   if(url.pathname===singleAlbum) return route.fulfill({contentType:'text/html',body:'<!doctype html><div class="cover-art"><img src="https://lastfm-img.freetls.fastly.net/i/u/500x500/9741753a613314214accd15a28eb91da.jpg"></div>'});
   if(url.pathname==='/user/DCCXX/library/music/+noredirect/Test+Artist/Album') return route.fulfill({contentType:'text/html',body:`<!doctype html><main class="col-main"><header class="library-header"><h2 class="library-header-title">Album</h2><span class="library-header-image"><img src="${image}"></span><a href="/music/Test+Artist/Album">Album</a></header><p class="metadata-display">1</p><table class="chartlist"><tr class="chartlist-row"><td class="chartlist-name"><a href="/music/Test+Artist/_/Track">Track</a></td><td><span data-stat-value="1"></span></td></tr></table></main>`});
   return route.fulfill({status:404,body:'Unexpected request'});
  });
  const worker=browser.serviceWorkers()[0]||await browser.waitForEvent('serviceworker');
  await worker.evaluate(()=>chrome.storage.local.set({settings:{username:'DCCXX',infiniteScroll:true},lfmArtworkLookups:true}));
  const before=await worker.evaluate(()=>chrome.storage.local.get(['rules','settings']));
  const page=await browser.newPage();
  await page.goto('https://www.last.fm/user/DCCXX/library/tracks');
  await page.waitForFunction(image=>document.querySelector('.chartlist-image img').src===image,image);
  assert.equal(await page.locator('.chartlist-image a').getAttribute('href'),'https://www.last.fm/music/Test+Artist/Album');
  assert.deepEqual(requests,['/user/DCCXX/library/music/+noredirect/Test+Artist/_/Track','/user/DCCXX/library/music/+noredirect/Test+Artist/Album']);
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
  assert.deepEqual(requests.slice(2),[singleAlbum],'an explicitly album-less scrobble must fetch only its title-album page, without counting track history');
  for(let n=0;n<20;n++) {
   if((await worker.evaluate(()=>chrome.storage.local.get('lfmPersonalArtworkCacheV1'))).lfmPersonalArtworkCacheV1?.length===2) break;
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  stagedScrobble = true;
  await page.reload();
  await page.waitForFunction(image=>document.querySelector('.chartlist-image img').src===image,image,{timeout:1200});
  await page.waitForFunction(()=>document.documentElement.dataset.coverAtFirstFrame);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.coverAtFirstFrame),image,'the known cover must be set by the first rendering frame after the native row fields arrive');
  assert.equal(requests.length,3,'rows whose native metadata arrives later must use the known cover without starting another lookup');
  await worker.evaluate(async()=>{
   const key='lfmPersonalArtworkCacheV1', saved=await chrome.storage.local.get(key);
   const old={key:JSON.stringify(['dccxx','playboi carti','2024']),username:'DCCXX',item:{artist:'Playboi Carti',name:'2024'},checkedAt:Date.now(),cover:{artist:'Playboi Carti',album:'2024',image:'https://lastfm-img.freetls.fastly.net/i/u/64s/video.jpg',url:'https://www.last.fm/music/Playboi+Carti/2024',fallback:true,scanned:50,total:63}};
   await chrome.storage.local.set({[key]:[...(saved[key]||[]),old]});
  });
  await page.goto('https://www.last.fm'+artistLibrary);
  await page.waitForFunction(image=>document.querySelector('.chartlist-name a[href$="_/2024"]').closest('tr').querySelector('img').src===image,musicImage);
  assert.deepEqual(requests.slice(3),[ownedMusic],'2024 must be corrected from the owned MUSIC totals without fetching track history or a global cover');
  for(let n=0;n<20;n++) {
   const cache=await worker.evaluate(()=>chrome.storage.local.get('lfmPersonalArtworkCacheV1'));
   if(cache.lfmPersonalArtworkCacheV1?.find(r=>r.item.name==='2024')?.cover.sourceVersion===2) break;
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  blockMusic=true;
  await page.reload();
  await page.waitForFunction(image=>document.querySelector('.chartlist-name a[href$="_/2024"]').closest('tr').querySelector('img').src===image,musicImage,{timeout:2000});
  assert.equal(requests.length,4,'verified artist-track covers must reload without another album-list request');
  const cachedWinners=await worker.evaluate(()=>chrome.storage.local.get('lfmPersonalArtworkCacheV1'));
  await page.goto('https://www.last.fm'+albumView);
  await page.waitForFunction(image=>document.querySelector('.chartlist-image img').src===image,albumViewImage,{timeout:2000});
  assert.equal(await page.locator('.chartlist-image a').getAttribute('href'),'https://www.last.fm/music/Playboi+Carti/Another+Album');
  assert.equal(requests.length,4,'a selected album uses its own header without lookup requests');
  assert.deepEqual(await worker.evaluate(()=>chrome.storage.local.get('lfmPersonalArtworkCacheV1')),cachedWinners,'view-specific covers must not overwrite global track winners');
  await page.goto('https://www.last.fm'+artistLibrary);
  await page.waitForFunction(image=>document.querySelector('.chartlist-name a[href$="_/2024"]').closest('tr').querySelector('img').src===image,musicImage,{timeout:2000});
  assert.equal(requests.length,4,'leaving the selected album restores the cached most-used album');
  assert.deepEqual(await worker.evaluate(()=>chrome.storage.local.get(['rules','settings'])),before,'the real extension must not write display preferences/settings during artwork lookup');
  await page.goto('https://www.last.fm/user/Friend/library/tracks');
  assert.equal(await page.locator('.chartlist-image img').getAttribute('src'),'https://lastfm-img.freetls.fastly.net/i/u/64s/wrong.jpg');
  assert.equal(requests.length,4);
  console.log('PASS: actual unpacked extension injects personal covers, respects selected albums without changing global winners, uses shared requests, preserves preferences and excludes friends');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
