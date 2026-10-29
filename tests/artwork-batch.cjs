const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {mockExtension, loadScripts, createMockWorker} = require('./harness.cjs');
const cover = {artist:'Artist',album:'Preferred',image:'https://lastfm-img.freetls.fastly.net/i/u/64s/preferred.jpg',
  url:'https://www.last.fm/music/Artist/Preferred',fallback:false,scanned:1,total:1,sourceVersion:3};
const row = name => `<tr class="chartlist-row"><td class="chartlist-image"><a href="/music/Wrong/Compilation"><img width="32" height="32" src="https://lastfm-img.freetls.fastly.net/i/u/64s/wrong.jpg"></a></td><td class="chartlist-name"><a href="/music/Artist/_/${name}">${name}</a></td><td data-stat-value="1"></td></tr>`;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const page=await browser.newPage();
  await page.route('https://www.last.fm/**',r=>r.fulfill({contentType:'text/html',body:`<main class="col-main"><table class="chartlist"><tbody>${row('First')}</tbody></table></main>`}));
  await page.route('https://lastfm-img.freetls.fastly.net/**',r=>r.abort());
  await page.goto('https://www.last.fm/user/DCCXX/library/music/Artist/+tracks');
  await mockExtension(page,{settings:{username:'DCCXX'}});
  await loadScripts(page,['rules.js','store.js','adapter.js']);
  await page.evaluate(cover=>{
   window.LastfmPages={status:()=>({rateLimited:false})};
   window.releaseCover=null;
   window.LastfmArtworkSource={resolve:()=>new Promise(r=>window.releaseCover=()=>r(cover)),clear(){}};
  },cover);
  await loadScripts(page,['artwork.js']);
  await page.waitForFunction(()=>window.releaseCover);
  assert.equal(await page.locator('img').evaluate(i=>getComputedStyle(i).visibility),'hidden','unverified compilation artwork must never remain visible while finding a winner');
  assert.equal(await page.locator('.chartlist-image a').getAttribute('href'),null,'unverified compilation link must be disabled with its image');
  await page.evaluate(()=>releaseCover());
  await page.waitForFunction(()=>LastfmArtwork.status().jobs.complete===1);
  const prepared=await page.evaluate(async html=>{
   const body=document.createElement('tbody');body.innerHTML=html;
   await LastfmArtwork.prepareRows([...body.children]);
   const image=body.querySelector('img'),link=body.querySelector('a');
   const before={src:image.src,href:link.href,visible:image.style.visibility};
   document.querySelector('tbody').append(...body.children);
   return before;
  },row('First'));
  assert.deepEqual(prepared,{src:cover.image,href:cover.url,visible:'visible'},'cache must prepare both image and album link while the row is still detached');
  await page.waitForFunction(()=>document.querySelectorAll('tr').length===2);
  const work=await page.evaluate(async html=>{
   const adapter=LastfmAdapter;window.rowParses=0;
   window.LastfmAdapter={...adapter,musicItem(...args){window.rowParses++;return adapter.musicItem(...args)}};
   // The resolver captures the adapter, so count actual whole-document row scans too.
   const query=document.querySelectorAll.bind(document);window.fullRowScans=0;
   document.querySelectorAll=s=>{if(s==='tr.chartlist-row')window.fullRowScans++;return query(s)};
   document.querySelector('tbody').insertAdjacentHTML('beforeend',html);
   await new Promise(r=>setTimeout(r,100));
   return {full:window.fullRowScans,count:query('tr').length};
  },Array.from({length:300},(_,n)=>row('Extra'+n)).join(''));
  assert.equal(work.count,302);
  assert.equal(work.full,0,'appending rows and adding cover wrappers must not trigger another full-table scan');
  const cancelled=await page.evaluate(async html=>{
   const body=document.createElement('tbody');body.innerHTML=html;
   const controller=new AbortController(),start=performance.now();
   controller.abort();
   const pending=LastfmArtwork.prepareRows([...body.children],{signal:controller.signal}).then(()=>'',e=>e.name);
   return {error:await pending,elapsed:performance.now()-start,connected:body.querySelector('img').isConnected};
  },row('Cancelled'));
  assert.equal(cancelled.error,'AbortError');assert.equal(cancelled.connected,false);
  assert.ok(cancelled.elapsed<1000,'cancelled page preparation must settle immediately');
  await page.close();

  const publicPage=await browser.newPage();
  await publicPage.route('https://www.last.fm/**',r=>r.fulfill({contentType:'text/html',body:`<main class="col-main"><table class="chartlist">${row('First')}</table></main>`}));
  await publicPage.route('https://lastfm-img.freetls.fastly.net/**',r=>r.abort());
  await publicPage.goto('https://www.last.fm/music/Artist');
  const worker=await mockExtension(publicPage,{settings:{username:'DCCXX'}});
  await loadScripts(publicPage,['rules.js','store.js','adapter.js']);
  await publicPage.evaluate(cover=>{
   window.LastfmPages={status:()=>({rateLimited:false})};
   window.LastfmArtworkSource={resolve:async()=>cover,clear(){}};
  },cover);
  await loadScripts(publicPage,['artwork.js']);
  await publicPage.waitForFunction(()=>LastfmArtwork.status().jobs.complete===1);
  assert.equal(await publicPage.locator('img').getAttribute('src'),cover.image,'public artist rows must use the personal winner too');
  const sender={id:'test',url:'https://www.last.fm/music/Artist'};
  assert.equal((await worker.request('artwork-read',{},sender)).length,1,'public artist pages can share verified personal winners');
  await assert.rejects(worker.request('mutate',{operations:[]},sender),/connected/,'public read scope must not grant preference writes');
  await assert.rejects(worker.request('artwork-read',{}, {id:'test',url:'https://www.last.fm/user/Friend/library/tracks'}),/connected/);
  await publicPage.close();

  const source=await browser.newPage();
  await source.route('https://www.last.fm/**',r=>r.fulfill({body:'<main></main>',contentType:'text/html'}));
  await source.goto('https://www.last.fm/music/Artist');
  await loadScripts(source,['rules.js','adapter.js']);
  await source.evaluate(()=>{
   window.calls=[];
   window.LastfmPages={status:()=>({rateLimited:false}),get:async url=>{
    calls.push(url);return {url,doc:new DOMParser().parseFromString('<main class="col-main"><p>DCCXX hasn\'t listened to this track yet.</p></main>','text/html')};
   },getTrack:async url=>({url,doc:new DOMParser().parseFromString('<h1>First</h1><div class="source-album"><h4 class="source-album-name"><a href="/music/Artist/Official">Official</a></h4><img src="https://lastfm-img.freetls.fastly.net/i/u/300x300/official.jpg"></div><aside><a href="/music/Artist/Unrelated">Unrelated</a></aside>','text/html')})};
  });
  await loadScripts(source,['artwork-source.js']);
  const publicCover=await source.evaluate(()=>LastfmArtworkSource.resolve({type:'tracks',artist:'Artist',name:'First'},'DCCXX'));
  assert.equal(publicCover.album,'Official');assert.equal(publicCover.public,true,'catalogue-only results must not enter the personal winner cache');
  await source.evaluate(()=>LastfmPages.getTrack=async url=>({url,doc:new DOMParser().parseFromString('<h1>First</h1><aside><a href="/music/Artist/Unrelated">Unrelated</a><img src="https://lastfm-img.freetls.fastly.net/i/u/64s/unrelated.jpg"></aside>','text/html')}));
  assert.match(await source.evaluate(()=>LastfmArtworkSource.resolve({type:'tracks',artist:'Artist',name:'First'},'DCCXX').then(()=>'',e=>e.message)),/associated album/);
  await source.evaluate(()=>LastfmPages.get=async url=>({url,doc:new DOMParser().parseFromString('<main class="col-main">Unexpected markup</main>','text/html')}));
  assert.match(await source.evaluate(()=>LastfmArtworkSource.resolve({type:'tracks',artist:'Artist',name:'First'},'DCCXX').then(()=>'',e=>e.message)),/total could not be verified/,'unknown history markup must never be treated as no scrobbles');
  await source.evaluate(()=>{window.historyReads=0;LastfmPages.get=async()=>{historyReads++;throw Error('Must not guess an own album history')};LastfmPages.getAlbum=async()=>{throw Error('Last.fm returned HTTP 404')};});
  assert.match(await source.evaluate(()=>LastfmArtworkSource.forBlankScrobble({artist:'Artist',name:'Unreleased'},'DCCXX').then(()=>'',e=>e.message)),/HTTP 404/);
  assert.equal(await source.evaluate(()=>historyReads),0,'a missing title-album fallback must not trigger a useless own-album lookup');
  await source.close();
  const transport=await browser.newPage(),requests=[];
  await transport.route('https://www.last.fm/**',r=>{requests.push(r.request().url());return r.fulfill({contentType:'text/html',body:'<main>Verified route</main>'})});
  await transport.goto('https://www.last.fm/music/Artist');requests.length=0;
  await mockExtension(transport,{settings:{username:'DCCXX'}});
  await loadScripts(transport,['rules.js','store.js','adapter.js','pages.js']);
  await transport.evaluate(()=>{let t=Date.now();Date.now=()=>t+=2000});
  await transport.evaluate(()=>LastfmPages.getTrack('/music/Artist/_/First'));
  await transport.evaluate(()=>LastfmPages.getAlbum('/music/Artist/Official'));
  assert.equal(requests.length,2);
  await assert.rejects(transport.evaluate(()=>LastfmPages.getTrack('/user/Friend/library/music/Artist/_/First')),/supported Last.fm view/);
  await assert.rejects(transport.evaluate(()=>LastfmPages.getTrack('/music/Artist/Official')),/supported Last.fm view/);
  await assert.rejects(transport.evaluate(()=>{const f=document.createElement('form');f.method='post';f.action='/user/DCCXX/library/edit-track';return LastfmPages.edit(f)}),/read-only/);
  assert.equal(requests.length,2,'public catalogue reads must not enable friend reads or native writes');
  await transport.close();
  console.log('PASS: no wrong compilation flash/link, detached cache preparation, incremental 300-row append, public personal covers and verified catalogue-only fallback');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
