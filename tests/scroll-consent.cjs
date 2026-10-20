const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const scripts=['rules.js','store.js','adapter.js','pages.js','content.js'];
const html=n=>`<main><table class="chartlist"><tbody>${Array.from({length:50},(_,i)=>`<tr class="chartlist-row"><td style="height:32px">Artist ${(n-1)*50+i+1}</td></tr>`).join('')}</tbody></table><nav class="pagination">${n<22?`<a class="pagination-next" href="?page=${n+1}">Next</a>`:''}</nav></main>`;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const page=await browser.newPage(),calls=[];
  await page.route('https://www.last.fm/**',route=>{
   const n=Number(new URL(route.request().url()).searchParams.get('page')||1);calls.push(n);
   return route.fulfill({contentType:'text/html',body:html(n)});
  });
  await page.goto('https://www.last.fm/user/DCCXX/library/artists');
  await page.evaluate(()=>{
   window.IntersectionObserver=class{constructor(callback){window.bottom=()=>callback([{isIntersecting:true}]);}observe(){}disconnect(){}};
   let t=Date.now();Date.now=()=>t+=10000;
  });
  const worker=await mockExtension(page,{settings:{username:'DCCXX',infiniteScroll:true},legacyScan:{page:93}});
  await loadScripts(page,scripts);
  const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const yes=page.getByRole('button',{name:'Yes',exact:true});
  const always=page.getByRole('button',{name:'Always',exact:true});
  await yes.waitFor();await page.evaluate(()=>bottom());await settle();
  assert.deepEqual(calls,[1],'reaching the bottom must not fetch without a choice');
  await page.getByRole('button',{name:'No',exact:true}).click();
  await page.evaluate(()=>bottom());await settle();
  assert.deepEqual(calls,[1]);assert.equal(await page.locator('nav.pagination').evaluate(n=>n.hidden),false);
  await page.getByRole('button',{name:'Load next page?',exact:true}).click();await yes.click();
  await page.waitForFunction(()=>document.querySelectorAll('tr.chartlist-row').length===100&&document.querySelector('.lfm-scroll-status').dataset.state==='prompt');
  await page.evaluate(()=>bottom());await settle();
  assert.deepEqual(calls,[1,2],'Yes fetches exactly one page');
  await always.click();
  for(let n=3;n<=10;n++) {
   await page.waitForFunction(n=>document.querySelectorAll('tr.chartlist-row').length===n*50&&document.querySelector('.lfm-scroll-status').dataset.state!=='loading',n);
   if(n<10)await page.evaluate(()=>bottom());
  }
  assert.equal(await page.locator('.lfm-scroll-status').getAttribute('data-state'),'prompt');
  await page.evaluate(()=>bottom());await settle();
  assert.deepEqual(calls,Array.from({length:10},(_,i)=>i+1),'Always stops at ten total pages / 500 rows');
  await always.click();
  for(let n=11;n<=20;n++) {
   await page.waitForFunction(n=>document.querySelectorAll('tr.chartlist-row').length===n*50&&document.querySelector('.lfm-scroll-status').dataset.state!=='loading',n);
   if(n<20)await page.evaluate(()=>bottom());
  }
  await page.evaluate(()=>bottom());await settle();
  assert.equal(await page.locator('tr.chartlist-row').count(),1000,'the next consent batch stops at 20 total pages');
  assert.equal(await page.locator('.lfm-scroll-status').getAttribute('data-state'),'prompt');
  await page.getByRole('button',{name:'No',exact:true}).click();
  await page.evaluate(()=>bottom());await settle();assert.equal(calls.length,20);
  assert.deepEqual(worker.data.settings,{username:'DCCXX',infiniteScroll:true},'choices do not change global settings');
  assert.deepEqual(worker.data.legacyScan,{page:93});
  await page.reload();await page.evaluate(()=>{window.IntersectionObserver=class{observe(){}disconnect(){}};});
  await mockExtension(page,{settings:{username:'DCCXX',infiniteScroll:true}});await loadScripts(page,scripts);
  await yes.waitFor();assert.equal(await page.locator('tr.chartlist-row').count(),50,'a fresh view asks again');
  await page.close();
  const ahead=await browser.newPage({viewport:{width:1000,height:800}}),aheadCalls=[];
  await ahead.route('https://www.last.fm/**',r=>{
   const n=Number(new URL(r.request().url()).searchParams.get('page')||1);aheadCalls.push(n);
   return r.fulfill({contentType:'text/html',body:html(n)});
  });
  await ahead.goto('https://www.last.fm/user/DCCXX/library/artists');
  await ahead.evaluate(()=>{let t=Date.now();Date.now=()=>t+=10000;});
  await mockExtension(ahead,{settings:{username:'DCCXX',infiniteScroll:true}});await loadScripts(ahead,scripts);
  await ahead.locator('.lfm-scroll-status').scrollIntoViewIfNeeded();
  await ahead.waitForTimeout(100);assert.deepEqual(aheadCalls,[1],'look-ahead must still require consent');
  await ahead.getByRole('button',{name:'Always',exact:true}).click();
  await ahead.waitForFunction(()=>document.querySelectorAll('tr.chartlist-row').length===100&&document.querySelector('.lfm-scroll-status').dataset.state==='ready');
  await ahead.evaluate(()=>{const b=document.querySelector('.lfm-scroll-status').getBoundingClientRect();scrollBy(0,b.top-innerHeight-800);});
  await ahead.waitForFunction(()=>document.querySelectorAll('tr.chartlist-row').length===150,null,{timeout:1500});
  assert.deepEqual(aheadCalls,[1,2,3],'Always prepares one next page before its boundary enters view');
  await ahead.close();
  console.log('PASS: no automatic default, Yes loads once, No preserves native pagination, Always stops at 500/1000 rows and fresh views ask again');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
