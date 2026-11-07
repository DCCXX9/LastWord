const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const html = n => `<main><table class="chartlist"><tbody><tr class="chartlist-row"><td style="height:32px"><a href="/music/Yeat">Yeat</a> Row ${n}</td></tr></tbody></table><nav class="pagination">${n===1?'<a class="pagination-next" href="?page=2">Next</a>':''}</nav></main>`;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  for(const path of ['/user/Friend/library','/user/Friend/library/artists','/user/Friend/library/albums','/user/Friend/library/tracks','/user/Friend/library/music/Yeat/+albums','/music/Yeat/+tracks','/tag/rap/tracks','/charts']) {
   const page=await browser.newPage(),calls=[];
   await page.route('https://www.last.fm/**',r=>{calls.push(r.request().method());return r.fulfill({contentType:'text/html',body:html(Number(new URL(r.request().url()).searchParams.get('page')||1))});});
   await page.goto('https://www.last.fm'+path);
   const worker=await mockExtension(page,{settings:{username:path.startsWith('/tag/')?'':'DCCXX',infiniteScroll:true},rules:{artists:{'["yeat"]':{from:'Yeat',to:'YEAT'}},albums:{},tracks:{},albumArtists:{}}});
   await loadScripts(page,['rules.js','store.js','adapter.js','pages.js','content.js']);
   await page.getByRole('button',{name:'Yes',exact:true}).click();
   await page.waitForFunction(()=>document.querySelectorAll('tr.chartlist-row').length===2);
   // Public music pages show the connected profile's casing, including appended rows; others stay native.
   assert.deepEqual(await page.locator('td a').allTextContents(),path.startsWith('/music/')?['YEAT','YEAT']:['Yeat','Yeat'],'foreign/tag/chart names stay native; public music names use display casing');
   assert.deepEqual(calls,['GET','GET']);
   const denied=await page.evaluate(async()=>{try{await LastfmPages.get('https://www.last.fm/user/Other/library?page=2');return false;}catch{return true;}});
   assert.equal(denied,true,'cannot load an unrelated foreign profile');
   await worker.externalSet({settings:{username:'Other',infiniteScroll:true}});
   assert.equal(await page.locator('tr.chartlist-row').count(),2,'connection changes retain universal rows');
   await worker.externalSet({settings:{username:'Other',infiniteScroll:false}});
   await page.waitForFunction(()=>!document.querySelector('nav.pagination').hidden);
   assert.deepEqual(calls,['GET','GET'],'disabled means no further requests');
   await page.close();
  }
  console.log('PASS: foreign libraries and public charts scroll with GET only, native names, safe targets, connection independence and opt-out');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
