const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const page=await browser.newPage();
  await page.route('https://www.last.fm/**',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><h1 class="library-header-title">Bladee &amp; Ecco2k</h1><table><tr class="chartlist-row"><td><a href="/music/+noredirect/Bladee+%26+Ecco2k">Bladee &amp; Ecco2k</a></td></tr></table>`}));
  await page.goto('https://www.last.fm/user/DCCXX/library/music/+noredirect/Bladee+%26+Ecco2k/+tracks');
  const rules={artists:{'["bladee & ecco2k"]':{from:'Bladee & Ecco2k',to:'BLADEE & ECCO2K'}},albums:{},tracks:{},albumArtists:{}};
  const worker=await mockExtension(page,{rules,settings:{username:'Friend',infiniteScroll:true}});
  await loadScripts(page,['rules.js','store.js','adapter.js','pages.js','content.js']);
  assert.equal(await page.locator('h1').textContent(),'Bladee & Ecco2k');
  await worker.externalSet({settings:{username:'DCCXX',infiniteScroll:true}});
  await page.waitForFunction(()=>document.querySelector('h1').textContent==='BLADEE & ECCO2K');
  assert.equal(await page.locator('a').textContent(),'BLADEE & ECCO2K');
  await worker.externalSet({settings:{username:'Friend',infiniteScroll:true}});
  await page.waitForFunction(()=>document.querySelector('h1').textContent==='Bladee & Ecco2k');
  assert.equal(await page.locator('a').textContent(),'Bladee & Ecco2k');
  await worker.externalSet({settings:{username:'DCCXX',infiniteScroll:true}});
  await page.waitForFunction(()=>document.querySelector('a').textContent==='BLADEE & ECCO2K');
  await worker.externalSet({rules:{artists:{},albums:{},tracks:{},albumArtists:{}}});
  await page.waitForFunction(()=>document.querySelector('a').textContent==='Bladee & Ecco2k');
  console.log('PASS: redirects, own-profile activation after settings change, preference removal and profile switch restore original text');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
