const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const placeholder='https://lastfm-img.freetls.fastly.net/i/u/64s/4128a6eb29f94943c9d206c08e625904.jpg';
const cover={artist:'Artist',album:'Tagged album',image:'https://lastfm-img.freetls.fastly.net/i/u/64s/preferred.jpg',url:'https://www.last.fm/music/Artist/Tagged+album',fallback:false,scanned:12,total:12,sourceVersion:3};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try{
  for(const mode of ['recover','persistent','invalid','rate','profile','hidden']){
   const page=await browser.newPage();
   await page.route('https://www.last.fm/**',r=>r.fulfill({contentType:'text/html',body:`<table class="chartlist"><tr class="chartlist-row"><td class="chartlist-image"><img width="32" height="32" src="${placeholder}"></td><td class="chartlist-name"><a href="/music/Artist/_/Track">Track</a></td></tr></table>`}));
   await page.route('https://lastfm-img.freetls.fastly.net/**',r=>r.abort());
   await page.goto('https://www.last.fm/user/DCCXX/library/tracks');
   await page.clock.install();
   const worker=await mockExtension(page,{settings:{username:'DCCXX',infiniteScroll:true}});
   await page.evaluate(({mode,cover})=>{
    window.attempts=0;window.paused=false;
    globalThis.LastfmPages={status:()=>({rateLimited:paused})};
    globalThis.LastfmArtworkSource={clear(){},resolve:async()=>{
     attempts++;
     if(attempts===2&&['recover','hidden'].includes(mode))return cover;
     if(mode==='rate')paused=true;
     const error=new Error(mode==='invalid'?'Unverified album fields':'Temporary response');
     error.retryable=mode!=='invalid';throw error;
    }};
   },{mode,cover});
   await loadScripts(page,['rules.js','store.js','adapter.js','artwork.js']);
   await page.waitForFunction(()=>LastfmArtwork.status().lastError);
   assert.equal(await page.evaluate(()=>attempts),1);
   if(mode==='profile'){
    await worker.externalSet({settings:{username:'Friend',infiniteScroll:true}});
    await page.waitForFunction(()=>LastfmArtwork.status().jobs.waiting===0);
   }
   if(mode==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange',{bubbles:true}));});
   await page.clock.fastForward(11000);
   await page.waitForTimeout(50);
   if(['profile','hidden','invalid','rate'].includes(mode))assert.equal(await page.evaluate(()=>attempts),1,mode+' must not start an automatic retry');
   if(mode==='hidden'){
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange',{bubbles:true}));});
   }
   if(['recover','hidden'].includes(mode)){
    await page.waitForFunction(()=>LastfmArtwork.status().jobs.complete===1);
    assert.equal(await page.locator('img').getAttribute('src'),cover.image);
   }
   if(mode==='persistent')await page.waitForFunction(()=>LastfmArtwork.status().jobs.unavailable===1);
   await page.clock.fastForward(120000);
   assert.equal(await page.evaluate(()=>attempts),['recover','persistent','hidden'].includes(mode)?2:1,mode+' must obey the single-retry bound');
   if(!['recover','hidden'].includes(mode))assert.equal(worker.data.lfmPersonalArtworkCacheV1?.length||0,0,'failed lookups must never become saved album facts');
   await page.close();
  }
  console.log('PASS: one delayed visible retry, persistent failure bound, metadata/rate refusals, hidden-tab suspension and profile-change cancellation');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
