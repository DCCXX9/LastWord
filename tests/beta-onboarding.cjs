const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),extension=process.env.LFM_TEST_EXTENSION_DIR||root;
(async()=>{
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
 const profile=fs.mkdtempSync(path.join(root,'test-results','beta-install-profile-'));
 const context=await chromium.launchPersistentContext(profile,{headless:false,
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args:['--headless=new','--no-sandbox',`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 try {
  const network=[],errors=[];
  await context.route('https://**/*',r=>{
   network.push({url:r.request().url(),method:r.request().method()});
   if(r.request().url().startsWith('https://www.last.fm/'))return r.fulfill({contentType:'text/html',body:'<!doctype html><main><a href="/music/Glass+Gardens">Glass Gardens</a></main>'});
   return r.abort();
  });
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  const id=new URL(worker.url()).host,page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`chrome-extension://${id}/options.html`);
  await page.locator('#profile-status').filter({hasText:'Not connected'}).waitFor();
  assert.equal(await page.locator('#setup-notice').isVisible(),true);
  assert.deepEqual(await worker.evaluate(()=>chrome.storage.local.get(null)),{},'fresh install opens setup without writing data');
  const importer=await context.newPage();await importer.goto(`chrome-extension://${id}/itunes.html`);
  await importer.getByText('Connect your Last.fm profile in Settings before importing XML.',{exact:true}).waitFor();
  assert.equal(await importer.locator('#xml-file').isDisabled(),true);
  const popup=await context.newPage();await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.locator('#profile').filter({hasText:'Not connected'}).waitFor();
  assert.equal(await popup.locator('#options').textContent(),'Connect your profile');
  const rules={artists:{'["glass gardens"]':{from:'Glass Gardens',to:'GLASS GARDENS'}},albums:{},tracks:{},albumArtists:{}};
  await worker.evaluate(rules=>chrome.storage.local.set({rules}),rules);
  const library=await context.newPage();await library.goto('https://www.last.fm/user/DemoListener/library');
  assert.equal(await library.locator('a').innerText(),'Glass Gardens');
  const jay=await context.newPage();await jay.goto('https://www.last.fm/user/DCCXX/library');
  assert.equal(await jay.locator('a').innerText(),'Glass Gardens','disconnected defaults do not personalise Jay');
  await page.getByLabel('Last.fm username').fill('DemoListener');
  await page.getByRole('button',{name:'Connect profile',exact:true}).click();
  await page.locator('#profile-status').filter({hasText:'DemoListener'}).waitFor();
  assert.equal(await page.locator('#setup-notice').isVisible(),false);
  await library.reload();await library.getByRole('link',{name:'GLASS GARDENS',exact:true}).waitFor();
  await library.goto('https://www.last.fm/user/Friend/library');
  assert.equal(await library.locator('a').innerText(),'Glass Gardens');
  await importer.waitForFunction(()=>!document.querySelector('#xml-file').disabled);
  const preview=await context.newPage();await preview.goto(`chrome-extension://${id}/albumless.html`);
  await preview.getByText('Automatic corrections are unavailable in this beta. Saved rules are preserved.',{exact:true}).waitFor();
  await preview.getByLabel('Artist',{exact:true}).fill('Glass Gardens');
  await preview.getByLabel('Track',{exact:true}).fill('Small Hours');
  await preview.getByRole('button',{name:'Remember track',exact:true}).click();
  await preview.waitForFunction(()=>document.querySelector('#rule-count').textContent==='1 rule');
  await worker.evaluate(async()=>{
   const data=await chrome.storage.local.get('lfmAlbumlessV1');
   data.lfmAlbumlessV1.profiles.demolistener.enabled=true;
   await chrome.storage.local.set({...data,itunesImportUndo:null,legacyScan:{nextPage:94},privateFuture:{value:'retain'}});
  });
  // First connection now starts a read-only library job. Pause that independent
  // feature before proving legacy correction records never run themselves.
  await importer.evaluate(()=>LastfmStore.cacheLibrary('pause'));
  await library.waitForTimeout(100);
  const before=await worker.evaluate(()=>chrome.storage.local.get(null));
  await library.goto('https://www.last.fm/user/DemoListener/library');
  await library.getByRole('link',{name:'GLASS GARDENS',exact:true}).waitFor();
  await library.waitForTimeout(5500); // past the old automatic checker startup
  assert.deepEqual(await worker.evaluate(()=>chrome.storage.local.get(null)),before,'previously enabled records do not start writes or migrate on navigation');
  assert.equal(network.filter(r=>r.method==='POST').length,0,'no automatic scrobble edits');
  assert.equal(network.filter(r=>r.url.includes('/_/')).length,0,'no hidden track history or correction lookup');
  await page.reload();await page.locator('#profile-status').filter({hasText:'DemoListener'}).waitFor();
  assert.deepEqual(await worker.evaluate(()=>chrome.storage.local.get(null)),before);
  for(const name of ['help','privacy']){await page.goto(`chrome-extension://${id}/${name}.html`);assert.equal(await page.locator('h1').count(),1);}
  assert.deepEqual(errors,[]);
  console.log('PASS: actual beta install, profile setup/isolation, import gating, help/privacy, preserved legacy records and no automatic requests/POSTs');
 }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true,maxRetries:5});}
})().catch(error=>{console.error(error);process.exitCode=1;});
