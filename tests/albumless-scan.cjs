const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {mockExtension,loadScripts}=require('./harness.cjs');
const base='https://www.last.fm/user/DCCXX/library';
const html=(n,blank=true)=>`<main class="col-main"><table class="chartlist"><tr class="chartlist-row"><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Artist"><input name="track_name" value="Song ${n}"><input name="timestamp" value="${1700000000-n}">${blank?'':'<input name="album_name" value="Album"><input name="album_artist_name" value="Artist">'}</form></td></tr></table><nav class="pagination"><a href="?page=3">3</a>${n<3?`<a rel="next" href="?page=${n+1}">Next</a>`:''}</nav></main>`;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const p=await browser.newPage();await p.route('https://www.last.fm/**',r=>r.fulfill({contentType:'text/html',body:html(1,false)}));await p.goto(base+'#lfm-albumless');
  const worker=await mockExtension(p,{settings:{username:'DCCXX',infiniteScroll:false},albumlessScan:{nextPage:94}});
  await loadScripts(p,['rules.js','store.js','adapter.js','albumless-reader.js']);
  await p.evaluate(()=>{window.calls=[];window.failPage=2;window.paused=true;window.LastfmPages={get:async(url,options)=>{const n=Number(new URL(url).searchParams.get('page')||1);calls.push({n,interval:options.minInterval});const body=n===window.failPage?'<main>Temporary empty response</main>':window.fixture(n);return{doc:new DOMParser().parseFromString(body,'text/html'),url};},status:()=>({rateLimited:window.paused}),resume:async()=>{window.paused=false;}};});
  await p.exposeFunction('fixture',html);
  // Keep parsing in the browser while only the fixture generator crosses out.
  await p.evaluate(()=>{const get=LastfmPages.get;LastfmPages.get=async(u,o)=>{const n=Number(new URL(u).searchParams.get('page')||1);if(n!==failPage){calls.push({n,interval:o.minInterval});return{doc:new DOMParser().parseFromString(await fixture(n),'text/html'),url:u};}return get(u,o);};});
  await loadScripts(p,['albumless-scan.js']);
  await p.getByRole('button',{name:'Resume requests after a break',exact:true}).click();
  assert.deepEqual(await p.evaluate(()=>calls),[],'resuming requests must not start discovery automatically');
  await p.getByRole('button',{name:'Find album-less tracks',exact:true}).click();
  await p.waitForFunction(()=>document.querySelector('[data-lfm-albumless-message]')?.textContent.includes('Page 2 returned no editable'));
  let state=worker.data.lfmAlbumlessV1.profiles.dccxx;
  assert.equal(state.scan.next,2);assert.equal(state.scan.complete,false);assert.equal(Object.keys(state.scan.candidates).length,1);
  assert.equal(Object.keys(state.rules).length,0,'scanning prepares review without applying preferences or editing plays');
  assert.deepEqual(await p.evaluate(()=>calls.map(c=>c.n)),[1,2],'no automatic empty-page retries');
  assert.ok((await p.evaluate(()=>calls)).every(c=>c.interval>=12000),'a scan never requests faster pacing');
  await p.evaluate(()=>{document.querySelector('.col-main').replaceWith(document.createElement('main'));window.failPage=0;});
  assert.equal(await p.locator('[data-lfm-albumless-panel]').count(),1,'Last.fm redraws do not remove the controls');
  await p.getByRole('button',{name:'Resume scan',exact:true}).click();
  await p.waitForFunction(()=>document.querySelector('[data-lfm-albumless-message]')?.textContent.includes('Discovery complete'));
  state=worker.data.lfmAlbumlessV1.profiles.dccxx;
  assert.equal(state.scan.complete,true);assert.equal(state.scan.next,4);assert.equal(Object.keys(state.scan.candidates).length,3);
  assert.equal(await p.getByRole('button',{name:'Resume scan',exact:true}).count(),0);
  assert.deepEqual(worker.data.albumlessScan,{nextPage:94});
  console.log('PASS: read-only resumable discovery, omitted blank fields, conservative pacing, empty-response stop, stable panel and completed controls');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
