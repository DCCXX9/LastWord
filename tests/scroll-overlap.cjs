const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const scripts = ['rules.js','store.js','adapter.js','pages.js','content.js'];
const section = (day, stamps) => `<section class="tracklist-section"><h2 class="date-heading">${day}</h2><table class="chartlist"><tbody>${stamps.map(stamp => `<tr class="chartlist-row" data-stamp="${stamp}"><td style="height:36px"><a href="/music/Artist/_/Repeated+song">Repeated song</a><form data-edit-scrobble><input name="artist_name" value="Artist"><input name="track_name" value="Repeated song"><input name="timestamp" value="${stamp}"></form></td></tr>`).join('')}</tbody></table></section>`;
const html = (groups, next) => `<main>${groups.map(([day,stamps])=>section(day,stamps)).join('')}<nav class="pagination">${next ? `<a class="pagination-next" href="?page=${next}">Next</a>`:''}</nav></main>`;
(async()=>{
 const browser = await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const page = await browser.newPage(); let attempts=0;
  await page.route('https://www.last.fm/**',route=>{
   const n=Number(new URL(route.request().url()).searchParams.get('page')||1);
   const body=n===1 ? html([['Today',[50,40,30]],['Yesterday',[20,19]]],2)
    : n===2 && ++attempts===1 ? '<h1>You’re requesting too many pages</h1>'
    : n===2 ? html([['Today',[30]],['Yesterday',[20,19,18]],['Older',[10,9]]],3)
    : html([['Older',[18,8]]],null);
   return route.fulfill({contentType:'text/html',body});
  });
  await page.goto('https://www.last.fm/user/DCCXX/library');
  await page.evaluate(()=>{window.IntersectionObserver=class{observe(){} disconnect(){}};let t=Date.now();Date.now=()=>t+=10000;});
  const worker=await mockExtension(page,{settings:{username:'DCCXX',infiniteScroll:true},legacyScan:{page:93}});
  await loadScripts(page,scripts);
  const clickNext=async()=>{
   const yes=page.getByRole('button',{name:'Yes',exact:true});
   await (await yes.count() && await yes.isVisible() ? yes : page.getByRole('button',{name:/^(Load next page|Resume loading|Try again)$/})).click();
  };
  await clickNext();
  await page.getByText(/Last.fm asked for a break/).waitFor();
  await clickNext();
  await page.waitForFunction(()=>document.querySelectorAll('[data-stamp]').length>=8);
  assert.deepEqual(await page.locator('[data-stamp]').evaluateAll(rows=>rows.map(r=>Number(r.dataset.stamp))),[50,40,30,20,19,18,10,9],
   'resuming an offset page must omit already loaded scrobbles and preserve chronological order');
  assert.deepEqual(await page.locator('.date-heading').allTextContents(),['Today','Yesterday','Older'],'overlap must not create repeated or empty date headings');
  await clickNext();
  await page.waitForFunction(()=>!document.querySelector('.lfm-scroll-status'));
  assert.deepEqual(await page.locator('[data-stamp]').evaluateAll(rows=>rows.map(r=>Number(r.dataset.stamp))),[50,40,30,20,19,18,10,9,8]);
  assert.deepEqual(worker.data.legacyScan,{page:93});
  await page.close();
  const reordered=await browser.newPage();
  await reordered.route('https://www.last.fm/**',route=>route.fulfill({contentType:'text/html',body:new URL(route.request().url()).search
   ? html([['Yesterday',[25,18]]],null) : html([['Today',[50]],['Yesterday',[20,19]]],2)}));
  await reordered.goto('https://www.last.fm/user/DCCXX/library');
  await reordered.evaluate(()=>{window.IntersectionObserver=class{observe(){}disconnect(){}};});
  await mockExtension(reordered,{settings:{username:'DCCXX',infiniteScroll:true}});await loadScripts(reordered,scripts);
  await reordered.getByRole('button',{name:'Yes',exact:true}).click();
  await reordered.getByText(/returned reordered history/).waitFor();
  assert.deepEqual(await reordered.locator('[data-stamp]').evaluateAll(rows=>rows.map(r=>Number(r.dataset.stamp))),[50,20,19],
   'unseen newer rows cannot be appended beneath older history');
  await reordered.close();
  console.log('PASS: warning/resume and overlapping history pages retain each timestamp once, real repeated plays and chronological day sections');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
