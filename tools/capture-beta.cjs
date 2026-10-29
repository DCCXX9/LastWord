/* Actual extension UI, isolated synthetic data, no signed-in profile or network. */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {libraryCache}=require('../tests/harness.cjs');
const root=path.resolve(__dirname,'..'),assets=path.join(root,'release','assets');
(async()=>{
 const profile=fs.mkdtempSync(path.join(root,'test-results','store-assets-profile-'));
 const context=await chromium.launchPersistentContext(profile,{headless:false,
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args:['--headless=new','--no-sandbox',`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 try {
  await context.route('https://**/*',r=>r.abort());
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  const id=new URL(worker.url()).host,page=await context.newPage();
  await page.setViewportSize({width:1280,height:800});
  await page.goto(`chrome-extension://${id}/options.html`);
  await page.locator('#profile-status').filter({hasText:'Not connected'}).waitFor();
  const songs=[['Glass Gardens','After Hours','Small Hours'],['Glass Gardens','After Hours','City Glass'],['Moon Cassette','Slow Signals','New Light'],['Moon Cassette','Slow Signals','Soft Static']];
  const entries=songs.map(([artist,album,track])=>({type:'tracks',id:JSON.stringify([artist.toLowerCase(),track.toLowerCase()]),rule:{from:track.toUpperCase(),to:track,artist,exact:true}}));
  const data={settings:{username:'DemoListener',infiniteScroll:true,redirectProtection:true},rules:{artists:{'glass gardens':{from:'Glass Gardens',to:'GLASS GARDENS'}},albums:{},tracks:{},albumArtists:{}},lfmLibraryCacheV1:libraryCache('DemoListener',entries)};
  await worker.evaluate(data=>chrome.storage.local.set(data),data);
  await page.reload();await page.locator('#profile-status').filter({hasText:'DemoListener'}).waitFor();
  await page.screenshot({path:path.join(assets,'setup.png')});
  await page.goto(`chrome-extension://${id}/preferences.html`);
  await page.waitForFunction(()=>document.querySelectorAll('#rules tbody tr').length===1);
  await page.screenshot({path:path.join(assets,'preferences.png')});
  await page.goto(`chrome-extension://${id}/itunes.html`);
  await page.locator('#cache-step-status').filter({hasText:'Complete'}).waitFor();
  await page.locator('#xml-file:enabled').waitFor();
  const xml='<plist><dict><key>Tracks</key><dict>'+songs.map(([artist,album,track],n)=>`<key>${n+1}</key><dict><key>Name</key><string>${track}</string><key>Artist</key><string>${artist}</string><key>Album</key><string>${album}</string></dict>`).join('')+'</dict></dict></plist>';
  await page.locator('#xml-file').setInputFiles({name:'Example library.xml',mimeType:'application/xml',buffer:Buffer.from(xml)});
  await page.locator('#compare').click();await page.locator('#review').waitFor();
  await page.locator('#step-xml').evaluate(e=>e.open=false);
  await page.locator('#step-review').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(assets,'xml-review.png')});
  console.log('PASS: three current extension screenshots; fictional metadata, network blocked, original icons retained.');
 }finally{await context.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
