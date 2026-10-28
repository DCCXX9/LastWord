const assert = require('node:assert/strict');
const fs = require('node:fs');
const nodePath = require('node:path');
const { chromium } = require('playwright');
const project = nodePath.resolve(__dirname,'..');
const extension = process.env.LFM_TEST_EXTENSION_DIR || project;
const origin = 'https://www.last.fm';
const libraryPath = '/user/DCCXX/library/music/Homixide+Gang/+tracks';
const placeholder = 'https://lastfm-img.freetls.fastly.net/i/u/64s/4128a6eb29f94943c9d206c08e625904.jpg';
const cover = 'https://lastfm-img.freetls.fastly.net/i/u/64s/preferred-i5u5we5.jpg';
const names = new Map([[42,'FiGure5 [INTERLUDE]'],[53,'Versus'],[55,'PB&J'],[57,'SOBER'],[101,'Final track']]);
const encode = value => encodeURIComponent(value).replace(/%20/g,'+');
const track = name => '/music/Homixide+Gang/_/'+encode(name);
const row = rank => `<tr class="chartlist-row" style="height:50px"><td>${rank}</td><td class="chartlist-image"><span class="cover-art"><img loading="lazy" width="34" height="34" src="${names.has(rank)?placeholder:cover}"></span></td><td class="chartlist-name"><a href="${track(names.get(rank)||('Uncached song '+rank))}">${names.get(rank)||('Uncached song '+rank)}</a></td><td>12</td></tr>`;
const list = page => `<!doctype html><main class="col-main"><table class="chartlist"><tbody>${Array.from({length:page===3?1:50},(_,i)=>row((page-1)*50+i+1)).join('')}</tbody></table><nav class="pagination">${page<3?`<a class="pagination-next" href="?page=${page+1}">Next</a>`:''}</nav></main>`;
const history = name => `<main class="col-main"><p class="metadata-display">12</p><table class="chartlist"><tbody>${Array.from({length:12},(_,i)=>`<tr class="chartlist-row"><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Homixide Gang"><input name="track_name" value="${name}"><input name="album_name" value="I5U5WE5"><input name="timestamp" value="${1000+i}"></form></td></tr>`).join('')}</tbody></table></main>`;
(async()=>{
 fs.mkdirSync(nodePath.join(project,'test-results'),{recursive:true});
 const profile=fs.mkdtempSync(nodePath.join(project,'test-results','artwork-scroll-profile-'));
 const browser=await chromium.launchPersistentContext(profile,{headless:false,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--headless=new','--no-sandbox',`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],viewport:{width:1000,height:900}});
 try{
  const requests=[],errors=[];
  let historyAttempts=0;
  await browser.route('https://lastfm-img.freetls.fastly.net/**',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64')}));
  await browser.route(origin+'/**',async r=>{
   const u=new URL(r.request().url());
   if(u.pathname===libraryPath){if(u.search)requests.push('list'+u.search);return r.fulfill({contentType:'text/html',body:list(Number(u.searchParams.get('page'))||1)});}
   requests.push(u.pathname);
   await new Promise(resolve=>setTimeout(resolve,100));
   if(u.pathname.endsWith('/_/FiGure5+%5BINTERLUDE%5D')&&++historyAttempts===1)return r.fulfill({status:503,body:'Last.fm - Temporarily Unavailable'});
   if(u.pathname.includes('/_/'))return r.fulfill({contentType:'text/html',body:history(decodeURIComponent(u.pathname.split('/_/')[1].replace(/\+/g,' ')))});
   if(u.pathname==='/music/Homixide+Gang/I5U5WE5')return r.fulfill({contentType:'text/html',body:`<div class="cover-art"><img src="${cover}"></div>`});
   return r.fulfill({status:404,body:'Unexpected request'});
  });
  const settings={username:'DCCXX',infiniteScroll:true},rules={artists:{},albums:{},tracks:{},albumArtists:{}};
  const worker=browser.serviceWorkers()[0]||await browser.waitForEvent('serviceworker');
  // A fresh install opens setup asynchronously and may reuse an empty tab.
  // Wait for that owned page before creating the page used by this test.
  const setupUrl=new URL('options.html',worker.url()).href,deadline=Date.now()+10000;
  let setup;
  while(!(setup=browser.pages().find(p=>p.url()===setupUrl))&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,25));
  assert.ok(setup,'fresh extension setup must finish before fixture navigation');
  await setup.locator('#profile-status').filter({hasText:'Not connected'}).waitFor();
  // Every row is a distinct uncached track, so imported placeholders compete
  // with ordinary visible tracks in the real paced request queue.
  await worker.evaluate(data=>chrome.storage.local.set(data),{settings,rules,lfmArtworkLookups:true});
  const before=await worker.evaluate(()=>chrome.storage.local.get(['settings','rules']));
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+libraryPath);
  await page.locator('tr.chartlist-row').nth(41).scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'Always',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('tr.chartlist-row').length===100,{},{timeout:10000});
  await page.waitForFunction(()=>document.querySelectorAll('tr.chartlist-row')[41].querySelector('img').title==='Waiting to retry this cover…');
  const painted = async rank => {
   await page.locator('tr.chartlist-row').nth(rank-1).scrollIntoViewIfNeeded();
   await page.waitForFunction(({rank,cover})=>{const i=document.querySelectorAll('tr.chartlist-row')[rank-1].querySelector('img');return i.src===cover&&i.naturalWidth>0&&getComputedStyle(i).visibility==='visible';},{rank,cover},{timeout:20000}).catch(async e=>{console.error(await page.evaluate(()=>[...document.querySelectorAll('img')].map(i=>({src:i.src,title:i.title,visibility:i.style.visibility})).filter(i=>i.title.startsWith('Cover unchanged'))),requests);throw e;});
   assert.equal(await page.locator('tr.chartlist-row').nth(rank-1).locator('.chartlist-image a').getAttribute('href'),origin+'/music/Homixide+Gang/I5U5WE5');
  };
  for(const rank of [42,53,55,57])await painted(rank);
  await page.locator('tr.chartlist-row').nth(99).scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelectorAll('tr.chartlist-row').length===101);
  await painted(101);
  await page.waitForFunction(()=>!document.querySelector('.lfm-scroll-status'));
  assert.deepEqual(requests.filter(x=>x.startsWith('list')),['list?page=2','list?page=3']);
  assert.equal(historyAttempts,2,'one transient failure receives one paced recovery attempt');
  assert.ok(requests.some(x=>x.includes('/_/Uncached+song+')),'ordinary uncached tracks must exercise the competing artwork queue');
  assert.deepEqual(await worker.evaluate(()=>chrome.storage.local.get(['settings','rules'])),before);
  assert.deepEqual(errors,[]);
  console.log('PASS: actual unpacked extension handles 101 distinct uncached tracks, a temporary history failure, page-2/page-3 insertion, painted initial/imported covers and album links; completed controls disappear');
 }finally{await browser.close();fs.rmSync(profile,{recursive:true,force:true,maxRetries:5});}
})().catch(e=>{console.error(e);process.exitCode=1;});
