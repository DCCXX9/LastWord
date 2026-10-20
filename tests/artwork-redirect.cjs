const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {mockExtension, loadScripts} = require('./harness.cjs');
const image = 'https://lastfm-img.freetls.fastly.net/i/u/64s/abcdef0123456789abcdef0123456789.jpg';
const row = artist => `<tr class="chartlist-row"><td class="chartlist-image"><a href="/music/${artist}/Other"><img width="32" height="32" src="${image}"></a></td><td class="chartlist-name"><a href="/music/${artist}/_/Song">Song</a></td></tr>`;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const page=await browser.newPage();
  await page.route('https://www.last.fm/**',r=>r.fulfill({contentType:'text/html',body:`<table class="chartlist"><tbody>${row('Travis+Scott')}${row('Lucki')}</tbody></table>`}));
  await page.route('https://lastfm-img.freetls.fastly.net/**',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64')}));
  await page.goto('https://www.last.fm/user/DCCXX/library/tracks');
  const records=['Travis Scott','Lucki'].map(artist=>({key:JSON.stringify(['dccxx',artist.toLowerCase(),'song']),username:'DCCXX',item:{artist,name:'Song'},checkedAt:Date.now(),cover:{artist,album:'Preferred',url:`https://www.last.fm/music/${artist.replaceAll(' ','+')}/Preferred`,image,sourceVersion:3,total:1,scanned:1,fallback:false}}));
  const worker=await mockExtension(page,{settings:{username:'DCCXX'},lfmPersonalArtworkCacheV1:records});
  // Disconnect diagnostics at a bound so a broken observer cannot hang CI.
  await page.evaluate(()=>{const Native=MutationObserver,observers=[];window.deliveries=0;window.hrefs=[];window.MutationObserver=class extends Native{constructor(callback){super(records=>{window.deliveries++;for(const r of records)if(r.attributeName==='href'&&r.target.closest('.chartlist-image')&&hrefs.length<12)hrefs.push(r.target.getAttribute('href'));if(deliveries>100){for(const o of observers)o.disconnect();return}callback(records)});observers.push(this)}}});
  await loadScripts(page,['rules.js','store.js','adapter.js','redirects.js','artwork.js']);
  await page.waitForTimeout(150);
  const result=await page.evaluate(()=>({deliveries,hrefs,links:[...document.querySelectorAll('.chartlist-image a')].map(a=>a.href)}));
  assert.ok(result.deliveries<100,'artwork and redirect observers must settle: '+JSON.stringify(result));
  assert.deepEqual(result.links,records.map(r=>r.cover.url.replace('/music/','/music/+noredirect/')));
  await page.evaluate(html=>document.querySelector('tbody').insertAdjacentHTML('beforeend',html),row('Lucki'));
  await page.waitForTimeout(150);
  assert.ok(await page.evaluate(()=>deliveries)<100,'scroll-added rows must settle too');
  assert.equal(await page.locator('.chartlist-image a').last().getAttribute('href'),'https://www.last.fm/music/+noredirect/Lucki/Preferred');
  await worker.externalSet({settings:{username:'DCCXX',redirectProtection:false}});
  await page.waitForFunction(()=>[...document.querySelectorAll('.chartlist-image a')].every(a=>!a.href.includes('/+noredirect/')));
  await worker.externalSet({settings:{username:'DCCXX',redirectProtection:true}});
  await page.waitForFunction(()=>[...document.querySelectorAll('.chartlist-image a')].every(a=>a.href.includes('/+noredirect/')));
  await page.waitForTimeout(100);
  assert.ok(await page.evaluate(()=>deliveries)<100,'changing redirect preferences must also settle');
  console.log('PASS: cached and scroll-added personal covers coexist with redirect protection without a mutation loop');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
