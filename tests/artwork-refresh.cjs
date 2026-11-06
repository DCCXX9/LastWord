const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const { createMockWorker } = require('./harness.cjs');
const origin='https://www.last.fm', root=path.resolve(__dirname,'..');
const record=(name='HeliMAn',username='DCCXX',albumless=false)=>({
 key:JSON.stringify([username.toLowerCase(),'yeat',name.toLowerCase(),...(albumless?['albumless']:[])]),
 username,item:{artist:'Yeat',name,...(albumless?{albumless:true}:{})},checkedAt:Date.now(),
 cover:{artist:'Yeat',album:'HeliMAn',image:'https://lastfm-img.freetls.fastly.net/i/u/64s/single.jpg',
 url:origin+'/music/Yeat/HeliMAn',fallback:true,total:1,scanned:1,sourceVersion:3}});
const seed=()=>({settings:{username:'DCCXX',infiniteScroll:false},rules:{artists:{},albums:{},tracks:{},albumArtists:{}},
 itunesImportUndo:null,albumlessScanDraft:{nextPage:94},lfmNetworkPause:{at:Date.now(),until:Date.now()+3600000},
 lfmPersonalArtworkCacheV1:[record(),record('HeliMAn','DCCXX',true),record('Unrelated'),record('HeliMAn','Friend')]});
(async()=>{
 const initial=seed(),mock=createMockWorker(initial), own={id:'test',url:origin+'/user/DCCXX/library'};
 const args={username:'dccxx',items:[{artist:'YEAT',name:'heliman'}]};
 await assert.rejects(mock.request('artwork-refresh',args,{...own,url:origin+'/user/Friend/library'}),/connected/);
 await assert.rejects(mock.request('artwork-refresh',{...args,username:'Friend'},own),/profile changed/);
 await assert.rejects(mock.request('artwork-refresh',{...args,items:[{artist:'Yeat'}]},own),/valid tracks/);
 assert.deepEqual(mock.data,initial,'rejected requests change nothing');
 assert.deepEqual(await mock.request('artwork-refresh',args,own),{removed:2});
 assert.deepEqual(mock.data.lfmPersonalArtworkCacheV1,initial.lfmPersonalArtworkCacheV1.slice(2),
  'only selected own-profile tracks, including albumless variants, are discarded');
 for(const key of Object.keys(initial).filter(k=>k!=='lfmPersonalArtworkCacheV1'))assert.deepEqual(mock.data[key],initial[key]);

 const profile=fs.mkdtempSync(path.join(root,'test-results','artwork-refresh-profile-'));
 const context=await chromium.launchPersistentContext(profile,{headless:false,
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args:['--headless=new','--no-sandbox',`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 try{
  const requests=[],errors=[];
  const html=`<!doctype html><main class="col-main"><table class="chartlist"><tr class="chartlist-row">
   <td class="chartlist-image"><a href="/music/Yeat/LUH+LEAKYZ+Vol.+1"><img width="32" height="32" alt="LUH LEAKYZ Vol. 1" src="https://lastfm-img.freetls.fastly.net/i/u/64s/album.jpg"></a></td>
   <td class="chartlist-name"><a href="/music/Yeat/_/HeliMAn">HeliMAn</a></td><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track">
   <input name="artist_name" value="Yeat"><input name="track_name" value="HeliMAn"><input name="album_name" value="LUH LEAKYZ Vol. 1"><input name="album_artist_name" value="Yeat"><input name="timestamp" value="1700000000">
   </form></td></tr></table></main>`;
  await context.route('https://**/*',r=>{
   const request=r.request();requests.push({url:request.url(),method:request.method(),navigation:request.isNavigationRequest()});
   if(request.url().startsWith('https://lastfm-img.'))return r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64')});
   if(request.url().startsWith(origin))return r.fulfill({contentType:'text/html',body:html});
   return r.abort();
  });
  const w=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  const id=new URL(w.url()).host, saved=seed();await w.evaluate(data=>chrome.storage.local.set(data),saved);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/user/DCCXX/library');await page.bringToFront();
  await page.waitForFunction(()=>document.querySelector('.chartlist-image img')?.src.endsWith('/single.jpg'));
  const [target]=await w.evaluate(()=>chrome.tabs.query({active:true,currentWindow:true}));
  const popup=await context.newPage();popup.on('pageerror',e=>errors.push(e.message));
  // A popup document opened as a test tab needs its target-tab query pinned.
  // Runtime messages, content scripts and the storage worker remain real.
  await popup.addInitScript(tabId=>{chrome.tabs.query=async()=>[{id:tabId}]},target.id);
  await popup.goto(`chrome-extension://${id}/options.html`);
  await popup.locator('#troubleshooting').evaluate(e=>e.open=true);
  const button=popup.getByRole('button',{name:'Refresh artwork',exact:true});
  await button.waitFor();await popup.waitForFunction(()=>!document.querySelector('#refresh-artwork').disabled);
  const confirm=popup.getByRole('button',{name:'Remove saved covers',exact:true});
  await button.click();await popup.getByText('Saved covers for tracks on this page will be removed and Last.fm’s own images shown instead. Click again to confirm.',{exact:true}).waitFor();
  assert.deepEqual((await w.evaluate(()=>chrome.storage.local.get(null))).lfmPersonalArtworkCacheV1,saved.lfmPersonalArtworkCacheV1,'the first click only asks');
  await confirm.click();await popup.getByText('Saved artwork refreshed for this page. Reloading…',{exact:true}).waitFor();
  await page.waitForEvent('domcontentloaded');await page.bringToFront();
  await page.waitForFunction(()=>document.querySelector('.chartlist-image img')?.src.endsWith('/album.jpg'));
  assert.match(await page.locator('.chartlist-image a').getAttribute('href'),/LUH\+LEAKYZ\+Vol\.\+1/);
  await page.reload();await page.waitForFunction(()=>document.querySelector('.chartlist-image img')?.src.endsWith('/album.jpg'));
  const after=await w.evaluate(()=>chrome.storage.local.get(null));
  assert.deepEqual(after.lfmPersonalArtworkCacheV1,saved.lfmPersonalArtworkCacheV1.slice(2));
  for(const key of Object.keys(saved).filter(k=>k!=='lfmPersonalArtworkCacheV1'))assert.deepEqual(after[key],saved[key],key+' preserved');
  assert.equal(requests.filter(r=>r.method!=='GET').length,0,'no scrobble edits');
  assert.equal(requests.filter(r=>r.url.startsWith(origin)&&!r.navigation).length,0,'no scans or background lookups');
  await page.goto(origin+'/user/Friend/library');
  await popup.reload();await popup.waitForFunction(()=>document.querySelector('#artwork-guidance').textContent.startsWith('Open your connected'));
  assert.equal(await popup.locator('#refresh-artwork').isDisabled(),true,'refresh is disabled on other profiles');
  await page.goto(origin+'/user/DCCXX/library');await popup.reload();
  await popup.waitForFunction(()=>!document.querySelector('#refresh-artwork').disabled);
  await popup.evaluate(()=>{chrome.tabs.sendMessage=async()=>{throw Error('No content script')}});
  await popup.locator('#troubleshooting').evaluate(e=>e.open=true);await button.click();await confirm.click();await popup.getByText('Could not refresh artwork: No content script',{exact:true}).waitFor();
  assert.deepEqual(await w.evaluate(()=>chrome.storage.local.get(null)),after,'a disconnected tab cannot change stored data');
  assert.deepEqual(errors,[]);
  console.log('PASS: scoped artwork invalidation, storage/profile safety, confirmed settings-to-content refresh, native cover and link after reload, persistence and zero background requests');
 }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true,maxRetries:5});}
})().catch(error=>{console.error(error);process.exitCode=1});
