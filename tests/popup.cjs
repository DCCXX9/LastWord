const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const profile=fs.mkdtempSync(path.join(root,'test-results/popup-profile-'));
 const context=await chromium.launchPersistentContext(profile,{headless:false,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args:['--headless=new','--no-sandbox',`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 try {
  const requests=[],errors=[];
  const image='https://lastfm-img.freetls.fastly.net/i/u/avatar170s/profile.png';
  await context.route('https://**/*',r=>{
   requests.push({url:r.request().url(),method:r.request().method()});
   if(r.request().url().startsWith('https://lastfm-img.'))return r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64')});
   return r.fulfill({contentType:'text/html',body:`<!doctype html><header><a class="avatar"><img src="${image}"></a></header><main>Library</main>`});
  });
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker'),id=new URL(worker.url()).host;
  const seed={settings:{username:'DCCXX',infiniteScroll:true,redirectProtection:true},rules:{artists:{},albums:{},tracks:{},albumArtists:{}},
   lfmAlbumlessV1:{profiles:{dccxx:{enabled:true,rules:{legacy:'preserve'}}}},lfmLibraryCacheV1:{sentinel:'cache'},
   lfmItunesUndoV1:{sentinel:'undo'},albumlessScanDraft:{page:94},lfmNetworkPause:{at:Date.now(),until:Date.now()+3600000}};
  await worker.evaluate(data=>chrome.storage.local.set(data),seed);
  const own=await context.newPage();await own.goto('https://www.last.fm/user/DCCXX/library');
  const popup=await context.newPage();popup.on('pageerror',e=>errors.push(e.message));await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForFunction(()=>!document.querySelector('#profile-avatar').hidden);
  assert.equal(await popup.locator('h1').innerText(),"Jay's Last.fm tool");
  assert.equal(await popup.locator('#profile').innerText(),'DCCXX');
  assert.equal(await popup.locator('#profile-avatar').getAttribute('src'),image);
  assert.equal(await popup.locator('#infinite-scroll').inputValue(),'true');
  assert.equal(await popup.locator('#refresh-artwork, #count, #active-status').count(),0);
  assert.equal(await popup.getByRole('link',{name:'iTunes XML matching',exact:true}).getAttribute('href'),'itunes.html');
  await popup.locator('#infinite-scroll').selectOption('false');
  await popup.getByText('Infinite scroll disabled.',{exact:true}).waitFor();
  await popup.reload();assert.equal(await popup.locator('#infinite-scroll').inputValue(),'false');
  const options=await context.newPage();options.on('pageerror',e=>errors.push(e.message));await options.goto(`chrome-extension://${id}/options.html`);
  await options.waitForFunction(()=>document.querySelector('#profile-status').textContent==='Profile: DCCXX');
  assert.equal(await options.locator('#infinite').isChecked(),false);
  assert.equal(await options.locator('#count').innerText(),'0 preferences');
  assert.equal(await options.locator('#refresh-artwork').isVisible(),true);
  assert.equal(await options.locator('a[href="albumless.html"]').count(),0);
  await options.locator('#infinite').check();await options.getByRole('button',{name:'Save settings',exact:true}).click();
  await popup.waitForFunction(()=>document.querySelector('#infinite-scroll').value==='true');
  await options.waitForFunction(()=>document.querySelector('#active-status').textContent==='Requests paused');
  await own.goto('https://www.last.fm/user/Friend/library');await popup.reload();
  await popup.waitForFunction(()=>document.querySelector('#profile').textContent==='DCCXX');
  assert.equal(await popup.locator('#profile-avatar').isHidden(),true,'other profiles never supply the avatar');
  await options.reload();await options.getByText('Waiting for your library',{exact:true}).waitFor();
  assert.equal(await options.locator('#refresh-artwork').isDisabled(),true);
  const result=await options.evaluate(()=>chrome.runtime.sendMessage({channel:'lastfm-store-v1',action:'albumless',op:'learn',username:'DCCXX',tracks:[{artist:'A',track:'B'}]}));
  assert.equal(result.ok,false);assert.match(result.error,/Unknown preference/);
  const saved=await worker.evaluate(()=>chrome.storage.local.get(null));
  assert.deepEqual(saved,seed,'UI round-trip leaves all existing storage intact');
  assert.equal(requests.filter(x=>x.method!=='GET').length,0);
  assert.deepEqual(errors,[]);
  await popup.setViewportSize({width:380,height:500});await popup.screenshot({path:'test-results/v21-popup-fixture.png'});
  console.log('PASS: redesigned popup, safe avatar fallback/isolation, two-way persistent scroll setting, relocated controls, removed action rejection and preserved storage');
 } finally {await context.close();fs.rmSync(profile,{recursive:true,force:true,maxRetries:5});}
})().catch(e=>{console.error(e);process.exitCode=1});
