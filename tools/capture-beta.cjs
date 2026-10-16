/* Local original artwork and screenshots of the actual extension UI with demo
   metadata. Uses an isolated profile; never reads a signed-in browser profile. */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),assets=path.join(root,'release','assets');
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect x="16" y="16" width="96" height="96" rx="23" fill="#233b43"/><path d="M31 39v50m10-50v50" stroke="#fbf8f3" stroke-width="5" stroke-linecap="round"/><circle cx="77" cy="64" r="25" fill="#fbf8f3"/><circle cx="77" cy="64" r="18" fill="#233b43"/><circle cx="77" cy="64" r="8" fill="#f29476"/><circle cx="77" cy="64" r="2.5" fill="#233b43"/></svg>`;
async function icons(browser) {
 fs.mkdirSync(path.join(root,'icons'),{recursive:true});fs.mkdirSync(assets,{recursive:true});
 fs.writeFileSync(path.join(root,'icons','source.svg'),svg+'\n');
 const page=await browser.newPage();
 for(const size of [16,32,48,128]) {
  await page.setViewportSize({width:size,height:size});
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
  await page.screenshot({path:path.join(root,'icons',`icon${size}.png`),omitBackground:true});
 }
 fs.copyFileSync(path.join(root,'icons','icon128.png'),path.join(assets,'icon128.png'));
 await page.setViewportSize({width:440,height:280});
 await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#233b43;color:#fbf8f3;font-family:system-ui}main{height:280px;display:flex;align-items:center;padding:26px;gap:16px}svg{width:122px;flex-shrink:0}h1{font-size:29px;line-height:1.12;letter-spacing:-1px;margin:0}p{color:#f29476;font-size:12px;margin:13px 0 0}</style><main>${svg}<div><h1>Your library.<br>Your casing.</h1><p>Last.fm Personal Library</p></div></main>`);
 await page.screenshot({path:path.join(assets,'promo440.png')});await page.close();
}
(async()=>{
 const graphics=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
 try{await icons(graphics);}finally{await graphics.close();}
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
 const profile=fs.mkdtempSync(path.join(root,'test-results','beta-assets-profile-'));
 const context=await chromium.launchPersistentContext(profile,{headless:false,executablePath,
  args:['--headless=new','--no-sandbox',`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 try {
  await context.route('https://**/*',r=>r.abort());
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  const id=new URL(worker.url()).host,page=await context.newPage();
  await page.setViewportSize({width:1280,height:800});
  await page.goto(`chrome-extension://${id}/options.html`);
  await page.getByRole('button',{name:'Connect profile',exact:true}).waitFor();
  await page.screenshot({path:path.join(assets,'setup.png')});
  await page.getByLabel('Last.fm username').fill('DemoListener');
  await page.getByRole('button',{name:'Connect profile',exact:true}).click();
  await page.locator('#profile-status').filter({hasText:'DemoListener'}).waitFor();
  await page.evaluate(()=>LastfmStore.mutate([
   {op:'put',type:'artists',from:'Glass Gardens',to:'GLASS GARDENS'},
   {op:'put',type:'artists',from:'Moon Cassette',to:'moon cassette'},
   {op:'put',type:'albums',artist:'Glass Gardens',from:'After Hours',to:'after hours'},
   {op:'put',type:'albums',artist:'Moon Cassette',from:'Slow Signals',to:'SLOW SIGNALS'},
   {op:'put',type:'tracks',artist:'Glass Gardens',from:'Small Hours',to:'small hours'},
   {op:'put',type:'tracks',artist:'Moon Cassette',from:'New Light',to:'NEW LIGHT'}]));
  await page.goto(`chrome-extension://${id}/preferences.html`);
  await page.waitForFunction(()=>document.querySelectorAll('#rules tbody tr').length===6);
  await page.screenshot({path:path.join(assets,'preferences.png')});
  await page.goto(`chrome-extension://${id}/itunes.html`);
  await page.waitForFunction(()=>!document.querySelector('#xml-file').disabled);
  const xml='<plist version="1.0"><dict><key>Tracks</key><dict>'+[
   ['Glass Gardens','after hours','small hours'],['Glass Gardens','after hours','city glass'],
   ['moon cassette','SLOW SIGNALS','NEW LIGHT'],['moon cassette','SLOW SIGNALS','SOFT STATIC']
  ].map(([artist,album,track],n)=>`<key>${n+1}</key><dict><key>Name</key><string>${track}</string><key>Artist</key><string>${artist}</string><key>Album</key><string>${album}</string></dict>`).join('')+'</dict></dict></plist>';
  await page.locator('#xml-file').setInputFiles({name:'Example library.xml',mimeType:'application/xml',buffer:Buffer.from(xml)});
  await page.locator('#review').waitFor({state:'visible'});
  await page.locator('#review').scrollIntoViewIfNeeded();
  await page.evaluate(()=>document.querySelector('#review').scrollIntoView({block:'start'}));
  await page.screenshot({path:path.join(assets,'xml-review.png')});
  console.log('PASS: original icons/promo and three actual extension screenshots (fictional example metadata, network blocked)');
 }finally{await context.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
