const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {mockExtension,loadScripts}=require('./harness.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});try{
 const p=await browser.newPage(),calls=[];let held;
 await p.route('https://www.last.fm/**',r=>{const url=r.request().url();calls.push(url);if(url.includes('First')){held=r;return}return r.fulfill({contentType:'text/html',body:'<main>Fixture</main>'})});
 await p.goto('https://www.last.fm/user/DCCXX/library');calls.length=0;
 const worker=await mockExtension(p,{settings:{username:'DCCXX'}});
 await loadScripts(p,['rules.js','store.js','adapter.js','pages.js']);
 await p.evaluate(()=>{let now=Date.now();Date.now=()=>now+=2000;window.results=[];window.cancel=new AbortController();window.requests=[LastfmPages.get('/user/DCCXX/library/music/Artist/_/First'),LastfmPages.get('/user/DCCXX/library/music/Artist/_/Second'),LastfmPages.get('/user/DCCXX/library/music/Artist/_/Cancelled',{signal:cancel.signal}).catch(e=>results.push(e.name)),LastfmPages.get('/user/DCCXX/library?page=2',{priority:'navigation'})];cancel.abort()});
 for(let n=0;n<50&&!held;n++)await new Promise(r=>setTimeout(r,10));assert.ok(held);await held.fulfill({contentType:'text/html',body:'<main>First</main>'});
 await p.evaluate(()=>Promise.all(requests));
 assert.ok(calls[1].endsWith('?page=2'),'next page must run before queued artwork: '+JSON.stringify(calls));
 assert.ok(calls[2].endsWith('/Second'));assert.equal(calls.length,3);assert.deepEqual(await p.evaluate(()=>results),['AbortError']);
 await worker.externalSet({lfmNetworkPause:{at:Date.now()}});
 await assert.rejects(p.evaluate(()=>LastfmPages.get('/user/DCCXX/library?page=3',{priority:'navigation'})),/paused/);
 assert.equal(calls.length,3,'priority never bypasses the shared rate pause');
 console.log('PASS: pagination precedes queued artwork, cancelled queued reads stop, rate pause stays authoritative');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
