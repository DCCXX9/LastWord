const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {mockExtension,loadScripts}=require('./harness.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const p=await browser.newPage(),calls=[];
  let warning=false,json=false;
  await p.route('https://www.last.fm/**',r=>{calls.push({method:r.request().method(),body:r.request().postData(),headers:r.request().headers()});r.fulfill({status:warning?429:200,contentType:json?'application/json':'text/html',body:json?JSON.stringify({html:'<main>Fixture</main>',errors:warning?['Slow down']:[]}):'<main>Fixture</main>'});});
  await p.goto('https://www.last.fm/user/DCCXX/library');calls.length=0;
  const w=await mockExtension(p,{settings:{username:'DCCXX',infiniteScroll:false}});
  await loadScripts(p,['rules.js','store.js','adapter.js','pages.js']);
  await p.evaluate(()=>{let t=Date.now();Date.now=()=>t+=20000;});
  const form=()=>{const f=document.createElement('form');f.method='post';f.action='/user/DCCXX/library/edit-track';for(const [n,v]of Object.entries({artist_name:'Artist',track_name:'Song',timestamp:'1',csrfmiddlewaretoken:'test-only'})){const i=document.createElement('input');i.name=n;i.value=v;f.append(i);}return f;};
  await p.evaluate(async code=>{const f=(new Function('return ('+code+')()'))();await LastfmPages.edit(f,{minInterval:12000});},form.toString());
  assert.equal(calls[0].method,'POST');assert.equal(calls[0].headers['x-requested-with'],'XMLHttpRequest');
  assert.equal(new URLSearchParams(calls[0].body).get('track_name'),'Song');
  const before=calls.length;
  await assert.rejects(p.evaluate(code=>{const f=(new Function('return ('+code+')()'))();f.action='/user/Friend/library/edit-track';return LastfmPages.edit(f);},form.toString()),/connected|configured/);
  await assert.rejects(p.evaluate(code=>{const f=(new Function('return ('+code+')()'))();f.querySelector('[name="csrfmiddlewaretoken"]').remove();return LastfmPages.edit(f);},form.toString()),/security/);
  assert.equal(calls.length,before);
  json=true;
  await p.evaluate(code=>LastfmPages.edit((new Function('return ('+code+')()'))()),form.toString());
  json=false;
  warning=true;json=true;
  await assert.rejects(p.evaluate(code=>LastfmPages.edit((new Function('return ('+code+')()'))()),form.toString()),/break/);
  assert.ok(w.data.lfmNetworkPause);
  const limited=calls.length;
  await assert.rejects(p.evaluate(code=>LastfmPages.edit((new Function('return ('+code+')()'))()),form.toString()),/paused/);
  assert.equal(calls.length,limited);
  console.log('PASS: native-form POST transport, exact own-profile action, security field checks and shared persistent rate stop');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
