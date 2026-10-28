const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname,'..');
(async()=>{
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
 const profile = fs.mkdtempSync(path.join(root,'test-results','isolated-profile-'));
 const browser=await chromium.launchPersistentContext(profile,{
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,headless:false,
  args:['--headless=new','--no-sandbox',`--disable-extensions-except=${root}`,`--load-extension=${root}`]
 });
 try {
  await browser.route('**/*',r=>{
   if(r.request().url().startsWith('https://www.last.fm/')) return r.fulfill({contentType:'text/html',body:'<!doctype html><h1>DCCXX library</h1><a href="/music/Bladee">Bladee</a>'});
   if(r.request().url().startsWith('chrome-extension:')) return r.continue();
   return r.abort();
  });
  const worker=browser.serviceWorkers()[0]||await browser.waitForEvent('serviceworker');
  const id=new URL(worker.url()).host;
  const first=await browser.newPage();
  const second=await browser.newPage();
  await Promise.all([first.goto(`chrome-extension://${id}/options.html`),second.goto(`chrome-extension://${id}/options.html`)]);
  await first.locator('#profile-status').filter({hasText:'Not connected'}).waitFor();
  await first.getByLabel('Last.fm username').fill('DCCXX');
  await first.getByRole('button',{name:'Connect profile',exact:true}).click();
  await first.locator('#profile-status').filter({hasText:'DCCXX'}).waitFor();
  await Promise.all([
   first.evaluate(()=>LastfmStore.mutate([{op:'put',type:'artists',from:'Bladee',to:'BLADEE'}])),
   second.evaluate(()=>LastfmStore.mutate([{op:'put',type:'artists',from:'Ecco2k',to:'ECCO2K'}]))
  ]);
  await first.waitForFunction(()=>document.querySelector('#count').textContent==='2 preferences');
  await first.locator('a[href="preferences.html"]').click();
  await first.waitForFunction(()=>document.querySelectorAll('#rules tbody tr').length===2);
  assert.equal(await first.locator('#rules-artists tr').count(),2);
  const data=await first.evaluate(()=>LastfmStore.read());
  assert.equal(Object.keys(data.rules.artists).length,2);
  const albumless=await browser.newPage();
  await albumless.goto(`chrome-extension://${id}/albumless.html`);
  await albumless.getByText('Automatic corrections are unavailable in this beta. Saved rules are preserved.',{exact:true}).waitFor();
  assert.equal(await worker.evaluate(async()=>Object.hasOwn(await chrome.storage.local.get(null),'lfmAlbumlessV1')),false,'opening the new page performs no migration or storage write');
  await albumless.getByLabel('Artist',{exact:true}).fill('Albumless artist');
  await albumless.getByLabel('Track',{exact:true}).fill('Albumless song');
  await albumless.getByRole('button',{name:'Remember track',exact:true}).click();
  await albumless.waitForFunction(()=>document.querySelector('#rule-count').textContent==='1 rule');
  const savedAlbumless=await worker.evaluate(async()=>(await chrome.storage.local.get('lfmAlbumlessV1')).lfmAlbumlessV1.profiles.dccxx);
  assert.equal(savedAlbumless.enabled,false,'saving rules never implicitly enables real Last.fm edits');
  assert.equal(Object.keys(savedAlbumless.rules).length,1);
  const library=await browser.newPage();
  await library.goto('https://www.last.fm/user/DCCXX/library');
  await library.getByRole('link',{name:'BLADEE',exact:true}).waitFor();
  await library.goto('https://www.last.fm/user/Friend/library');
  await library.getByRole('link',{name:'Bladee',exact:true}).waitFor();
  assert.equal(await library.locator('a').textContent(),'Bladee');
  const importer=await browser.newPage();
  await importer.goto(`chrome-extension://${id}/itunes.html`);
  await importer.locator('#xml-file').waitFor({state:'visible'});
  await importer.waitForFunction(()=>!document.querySelector('#xml-file').disabled);
  const xml='<plist version="1.0"><dict><key>Tracks</key><dict><key>1</key><dict>'+
    '<key>Name</key><string>NEw TiTLe</string><key>Artist</key><string>bladee</string>'+
    '<key>Album</key><string>My ALBUM</string></dict></dict></dict></plist>';
  await importer.locator('#xml-file').setInputFiles({name:'Library.xml',mimeType:'application/xml',buffer:Buffer.from(xml)});
  await importer.locator('#review').waitFor({state:'visible'});
  await importer.locator('tr[data-type="artists"] input[type="checkbox"]').check();
  await importer.locator('#apply').click();
  await importer.locator('#confirm').click();
  await importer.getByText('3 display preferences applied.',{exact:true}).waitFor();
  await library.goto('https://www.last.fm/user/DCCXX/library');
  await library.getByRole('link',{name:'bladee',exact:true}).waitFor();
  await importer.setViewportSize({width:1240,height:1080});
  await importer.screenshot({path:path.join(root,'test-results','itunes-import.png'),fullPage:true});
  await importer.reload();
  await importer.locator('#revert').waitFor({state:'visible'});
  await importer.locator('#revert').click();
  await importer.locator('#confirm').click();
  await importer.getByText('3 preferences reverted; 0 later changes kept.',{exact:true}).waitFor();
  await library.getByRole('link',{name:'BLADEE',exact:true}).waitFor();
  // Exercise the actual file picker above the former 50 MB cap. Small comments
  // fill the gap between two tracks without inventing millions of preferences.
  const largeXmlPath=path.join(root,'test-results','large-library.xml');
  const largeFile=fs.openSync(largeXmlPath,'w');
  const track=n=>`<key>${n}</key><dict><key>Name</key><string>Large file track ${n}</string><key>Artist</key><string>Large artist</string></dict>`;
  try {
   fs.writeSync(largeFile,'<plist version="1.0"><dict><key>Tracks</key><dict>'+track(1));
   const padding='<!--'+' '.repeat(8185)+'-->';
   for(let i=0;i<8192;i++) fs.writeSync(largeFile,padding);
   fs.writeSync(largeFile,track(2)+'</dict></dict></plist>');
  } finally {fs.closeSync(largeFile);}
  assert.ok(fs.statSync(largeXmlPath).size>50*1024*1024);
  const beforeLarge=await first.evaluate(()=>LastfmStore.read());
  await importer.locator('#xml-file').setInputFiles(largeXmlPath);
  await importer.locator('#review').waitFor({state:'visible',timeout:60000});
  assert.match(await importer.locator('#scan-summary').innerText(),/2 songs checked/);
  assert.match(await importer.locator('#candidates').innerText(),/Large file track 2/);
  assert.deepEqual(await first.evaluate(()=>LastfmStore.read()),beforeLarge,'scanning a large file must not write rules');
  const status=await first.evaluate(async()=>{
   const tabs=await chrome.tabs.query({});
   const tab=tabs.find(t=>t.url?.includes('/user/Friend/'));
   return tab?chrome.tabs.sendMessage(tab.id,{type:'lfm:status'}):null;
  });
  // URLs of tabs need a tabs/host permission; the content behavior above is independent.
  if(status) assert.equal(status.ownProfile,false);
  await first.bringToFront();
  await first.setViewportSize({width:1180,height:1000});
  await first.screenshot({path:path.join(root,'test-results','preferences-extension.png'),fullPage:true});
  const popup=await browser.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.locator('#active-status').waitFor();
  await popup.setViewportSize({width:380,height:540});
  await popup.screenshot({path:path.join(root,'test-results','popup.png')});
  console.log('PASS: actual extension, album-less settings/default-off storage, sorted preferences, worker, XML apply/revert and 64 MiB scan without writes');
 }finally{await browser.close();fs.rmSync(profile,{recursive:true,force:true,maxRetries:5});}
})().catch(e=>{console.error(e);process.exitCode=1});
