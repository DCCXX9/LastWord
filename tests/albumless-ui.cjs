const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {mockExtension,loadScripts}=require('./harness.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const p=await browser.newPage();await p.setContent(fs.readFileSync(path.join(__dirname,'../albumless.html'),'utf8').replace(/<script[^>]*><\/script>/g,''));
  await p.addStyleTag({path:path.join(__dirname,'../extension-ui.css')});
  const w=await mockExtension(p,{settings:{username:'DCCXX',infiniteScroll:true},albumlessScan:{nextPage:94},itunesImportUndo:null},{senderUrl:'chrome-extension://test/albumless.html'});
  await loadScripts(p,['rules.js','store.js','albumless-ui.js']);
  await p.getByText('Future corrections disabled.',{exact:true}).waitFor();assert.equal(w.writes,0);
  await p.getByLabel('Artist',{exact:true}).fill('Artist');await p.getByLabel('Track',{exact:true}).fill('Song');
  await p.getByRole('button',{name:'Remember track',exact:true}).click();
  await p.waitForFunction(()=>document.querySelector('#rule-count').textContent==='1 rule');
  assert.equal(w.data.lfmAlbumlessV1.profiles.dccxx.enabled,false);
  await p.getByRole('button',{name:'Enable future corrections',exact:true}).click();
  await p.getByText('Future corrections enabled.',{exact:true}).waitFor();
  const user={id:'test',url:'https://www.last.fm/user/DCCXX/library'};
  await w.request('albumless',{op:'discover',username:'DCCXX',candidates:[{artist:'Other Artist',track:'Other Song'}]},user);
  await p.getByLabel('Other Artist — Other Song',{exact:true}).waitFor();
  await p.getByLabel('Other Artist — Other Song',{exact:true}).check();
  await p.getByRole('button',{name:'Remember selected tracks',exact:true}).click();
  await p.waitForFunction(()=>document.querySelector('#rule-count').textContent==='2 rules');
  assert.ok(w.data.lfmAlbumlessV1.profiles.dccxx.rules['["other artist","other song"]'].since>=Math.floor(Date.now()/1000)-10);
  await p.getByLabel('Search artist or track').fill('other');
  assert.equal(await p.locator('#rules tr').count(),1);
  await p.getByRole('button',{name:'Delete Other Song by Other Artist',exact:true}).click();
  await p.waitForFunction(()=>document.querySelector('#rule-count').textContent==='1 rule');
  assert.deepEqual(w.data.albumlessScan,{nextPage:94});assert.equal(w.data.itunesImportUndo,null);
  assert.match(await p.locator('#library-link').getAttribute('href'),/DCCXX\/library#lfm-albumless$/);
  await p.screenshot({path:'test-results/albumless-rules.png',fullPage:true});
  console.log('PASS: disabled-by-default corrections, manual future-only rules, candidate review, search/delete, profile link and legacy preservation');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
