const assert=require('node:assert/strict');const {chromium}=require('playwright');const {mockExtension,loadScripts}=require('./harness.cjs');
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});try{
 const p=await b.newPage(),calls=[];await p.route('https://www.last.fm/**',r=>{calls.push(r.request().method());return r.fulfill({contentType:'text/html',body:'<main>Read only</main>'})});
 await p.goto('https://www.last.fm/user/DCCXX/library');calls.length=0;const w=await mockExtension(p,{settings:{username:'DCCXX'}});await loadScripts(p,['rules.js','store.js','adapter.js','pages.js']);
 await assert.rejects(p.evaluate(()=>LastfmPages.edit(document.createElement('form'))),/read-only/);
 await assert.rejects(p.evaluate(()=>LastfmPages.get('/user/DCCXX/library/edit-track',{form:document.createElement('form')})),/read-only/);
 await assert.rejects(p.evaluate(()=>LastfmPages.get('/user/DCCXX/library/edit-track')),/configured/);
 assert.equal(calls.length,0,'retained experimental callers cannot submit or open edit endpoints');
 await p.evaluate(()=>LastfmPages.get('/user/DCCXX/library/tracks'));assert.deepEqual(calls,['GET']);
 await w.externalSet({lfmNetworkPause:{at:Date.now(),until:Date.now()+120000}});
 await assert.rejects(p.evaluate(()=>LastfmPages.get('/user/DCCXX/library/albums')),/paused/);assert.equal(calls.length,1);
 console.log('PASS: edit transport permanently blocked, form-injection blocked, edit endpoints excluded, GET-only reads and existing pause preserved');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
