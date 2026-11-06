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
  const library=await browser.newPage();
  await library.goto('https://www.last.fm/user/DCCXX/library');
  await library.getByRole('link',{name:'BLADEE',exact:true}).waitFor();
  await library.goto('https://www.last.fm/user/Friend/library');
  await library.getByRole('link',{name:'Bladee',exact:true}).waitFor();
  assert.equal(await library.locator('a').textContent(),'Bladee');
  const {libraryCache}=require('./harness.cjs');
  const entries=[['artists','Bladee','bladee'],['tracks','New Title','NEw TiTLe','Bladee'],['albums','My Album','My ALBUM','Bladee'],['tracks','Large file track 1','large FILE track 1','Large artist'],['tracks','Large file track 2','large FILE track 2','Large artist']].map(([type,from,to,artist])=>({type,id:JSON.stringify(type==='artists'?[from.toLowerCase()]:[artist.toLowerCase(),from.toLowerCase()]),rule:{from,to,...(artist?{artist}:{}),exact:true}}));
  await worker.evaluate(cache=>chrome.storage.local.set({lfmLibraryCacheV1:cache}),libraryCache('DCCXX',entries));
  const importer=await browser.newPage();
  await importer.goto(`chrome-extension://${id}/itunes.html`);
  await importer.locator('#xml-file').waitFor({state:'visible'});
  await importer.waitForFunction(()=>!document.querySelector('#xml-file').disabled);
  const xml='<plist version="1.0"><dict><key>Tracks</key><dict><key>1</key><dict>'+
    '<key>Name</key><string>NEw TiTLe</string><key>Artist</key><string>bladee</string>'+
    '<key>Album</key><string>My ALBUM</string></dict></dict></dict></plist>';
  await importer.locator('#xml-file').setInputFiles({name:'Library.xml',mimeType:'application/xml',buffer:Buffer.from(xml)});
  await importer.locator('#compare').click();
  await importer.locator('#review').waitFor({state:'visible'});
  await importer.locator('tr[data-type="artists"] input[type="checkbox"]').check();
  await importer.locator('#apply').click();
  await importer.locator('#confirm').click();
  await importer.getByText('Complete — 3 display preferences saved.',{exact:true}).waitFor();
  await library.goto('https://www.last.fm/user/DCCXX/library');
  await library.getByRole('link',{name:'bladee',exact:true}).waitFor();
  await importer.setViewportSize({width:1240,height:1080});
  await importer.screenshot({path:path.join(root,'test-results','itunes-import.png'),fullPage:true});
  await importer.reload();
  await importer.locator('.backup-details summary').click();
  await importer.locator('#revert').waitFor({state:'visible'});
  await importer.locator('#revert').click();
  await importer.locator('#confirm').click();
  await importer.getByText('Complete — 3 changes undone.',{exact:true}).waitFor();
  await library.getByRole('link',{name:'BLADEE',exact:true}).waitFor();
  // Exercise the actual file picker above the former 50 MB cap. Small comments
  // fill the gap between two tracks without inventing millions of preferences.
  const largeXmlPath=path.join(root,'test-results','large-library.xml');
  const largeFile=fs.openSync(largeXmlPath,'w');
  const track=n=>`<key>${n}</key><dict><key>Name</key><string>large FILE track ${n}</string><key>Artist</key><string>Large artist</string></dict>`;
  try {
   fs.writeSync(largeFile,'<plist version="1.0"><dict><key>Tracks</key><dict>'+track(1));
   const padding='<!--'+' '.repeat(8185)+'-->';
   for(let i=0;i<8192;i++) fs.writeSync(largeFile,padding);
   fs.writeSync(largeFile,track(2)+'</dict></dict></plist>');
  } finally {fs.closeSync(largeFile);}
  assert.ok(fs.statSync(largeXmlPath).size>50*1024*1024);
  const beforeLarge=await first.evaluate(()=>LastfmStore.read());
  await importer.locator('#xml-file').setInputFiles(largeXmlPath);
  await importer.locator('#compare').click();
  await importer.locator('#review').waitFor({state:'visible',timeout:60000});
  assert.match(await importer.locator('#scan-summary').innerText(),/2 changes/);
  assert.match(await importer.locator('#candidates').innerText(),/large FILE track 2/);
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
  await popup.locator('#profile').waitFor();
  await popup.setViewportSize({width:380,height:540});
  await popup.screenshot({path:path.join(root,'test-results','popup.png')});
  console.log('PASS: actual extension, sorted preferences, worker, XML apply/revert and 64 MiB scan without writes');
 }finally{await browser.close();fs.rmSync(profile,{recursive:true,force:true,maxRetries:5});}
})().catch(e=>{console.error(e);process.exitCode=1});
