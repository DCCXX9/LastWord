const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const scripts = ['rules.js','store.js','adapter.js','pages.js','content.js'];
const views = ['/library','/library/scrobbles','/library/artists','/library/albums','/library/tracks',
  '/library/music/Ken+Carson','/library/music/Ken+Carson/+tracks','/library/music/Ken+Carson/+albums',
  '/library/music/+noredirect/Ken+Carson/+tracks','/library/music/+noredirect/Ken+Carson/+albums'];
const html = (n, next = true) => `<!doctype html><main><table class="chartlist"><tbody>
  <tr class="chartlist-row"><td style="height:32px">Row ${n}</td></tr></tbody></table>
  <nav class="pagination">${next ? '<a class="pagination-next" href="?page=2">Next</a>' : ''}</nav></main>`;
(async () => {
 const browser = await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  for(const view of views) {
   const page = await browser.newPage();
   let calls = 0;
   await page.route('https://www.last.fm/**', route => {
    const next = route.request().url().includes('page=2');
    if(next) calls++;
    return route.fulfill({contentType:'text/html',body:html(next?2:1,!next)});
   });
   await page.goto('https://www.last.fm/user/DCCXX'+view);
   const worker = await mockExtension(page, {settings:{username:'DCCXX',infiniteScroll:true}});
   await loadScripts(page,scripts);
   await page.waitForFunction(()=>document.querySelectorAll('tr.chartlist-row').length===2)
     .catch(async error => { console.error(view, await page.locator('body').innerText()); throw error; });
   assert.equal(calls,1);
   await page.waitForFunction(()=>document.querySelector('nav.pagination').hidden);
   assert.equal(await page.locator('.lfm-scroll-status').count(),0,'finished loading must remove the entire panel');
   await page.evaluate(()=>document.querySelector('main').append(document.createElement('div')));
   await page.waitForTimeout(150);
   assert.equal(await page.locator('.lfm-scroll-status').count(),0,'later page changes must not recreate finished controls');
   assert.equal(calls,1,'a completed view must not fetch the original next-page link again');
   await worker.externalSet({settings:{username:'DCCXX',infiniteScroll:false}});
   await page.waitForFunction(()=>!document.querySelector('nav.pagination').hidden);
   await page.close();
  }
  const redraw = await browser.newPage();
  await redraw.route('https://www.last.fm/**',route=>route.fulfill({contentType:'text/html',body:html(1)}));
  await redraw.goto('https://www.last.fm/user/DCCXX/library/albums');
  await redraw.evaluate(()=>{window.IntersectionObserver=class {observe(){} disconnect(){}};});
  await mockExtension(redraw, {settings:{username:'DCCXX',infiniteScroll:true}});
  await loadScripts(redraw,scripts);
  await redraw.getByRole('button',{name:'Load next page',exact:true}).waitFor();
  await redraw.evaluate(()=>{
   const main=document.querySelector('main');
   main.replaceWith(main.cloneNode(true));
  });
  await redraw.waitForTimeout(150);
  assert.equal(await redraw.locator('.lfm-scroll-status').count(),1,'a replacement library must discard copied stale panels');
  await redraw.close();
  const page = await browser.newPage();
  let requests = 0;
  await page.route('https://www.last.fm/**', route => {
   if(route.request().url().includes('page=2')) {
    requests++;
    return route.fulfill({status:200,contentType:'text/html',body:"<h1>You’re requesting too many pages</h1>"});
   }
   return route.fulfill({contentType:'text/html',body:html(1)});
  });
  await page.goto('https://www.last.fm/user/DCCXX/library');
  const worker = await mockExtension(page, {settings:{username:'DCCXX',infiniteScroll:true}});
  await loadScripts(page,scripts);
  await page.getByText(/Last.fm asked for a break/).waitFor();
  assert.equal(requests,1);
  assert.ok(worker.data.lfmNetworkPause);
  await page.evaluate(()=>LastfmPages.get(location.href+'?page=3').catch(e=>e.message));
  assert.equal(requests,1,'rate warning must prevent further requests');
  assert.equal(await page.locator('nav.pagination').evaluate(n=>n.hidden),false);
  await page.close();
  console.log('PASS: all supported views append once, completed panels disappear, redraws retain one control, disable restores pagination, rate limits stop requests');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
