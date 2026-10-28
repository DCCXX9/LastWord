// Regression for the 20 Oct 2026 "blank covers forever" failure on ranked
// Tracks pages. Root causes covered here:
//  1. lfmNetworkPause never expired, so a stored pause blocked artwork forever;
//  2. a lookup interrupted by the pause became 'unavailable' and never re-ran;
//  3. held (hidden) native images had no end condition, so a blocked lookup
//     looked exactly like an empty slot;
//  4. answering 'Yes' to the next-page prompt silently cleared the pause;
//  5. covers older than 24 hours were hidden again until re-proved.
// Run with LFM_RATE_BASELINE=1 to load the pre-fix modules from git HEAD~ (if
// available) and watch this suite fail.
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const {mockExtension,loadScripts}=require('./harness.cjs');
const origin='https://www.last.fm',image=n=>`https://lastfm-img.freetls.fastly.net/i/u/64s/${n}.jpg`;
const row=name=>`<tr class="chartlist-row"><td class="chartlist-image"><a href="/music/Artist/Native"><img width="32" height="32" alt="Native" src="${image('native')}"></a></td><td class="chartlist-name"><a href="/music/Artist/_/${name}">${name}</a></td><td data-stat-value="4"></td></tr>`;
const albumPage=name=>`<main class="col-main"><header class="library-header"><h2 class="library-header-title">${name}</h2><span class="library-header-image"><img src="${image(name)}"></span><a href="/music/Artist/${name}">Album</a></header><p class="metadata-display">8</p><table class="chartlist">${['First','Second'].map(n=>`<tr class="chartlist-row"><td class="chartlist-name"><a href="/music/Artist/_/${n}">${n}</a></td><td data-stat-value="4"></td></tr>`).join('')}</table></main>`;
const history=name=>`<main class="col-main"><p class="metadata-display">4</p><table class="chartlist">${Array.from({length:4},(_,n)=>`<tr class="chartlist-row"><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Artist"><input name="track_name" value="${name}"><input name="album_name" value="Preferred"><input name="album_artist_name" value="Artist"><input name="timestamp" value="${n}"></form></td></tr>`).join('')}</table></main>`;
const warning='<main><h1>You’re requesting too many pages</h1></main>';
const modules=['rules.js','store.js','adapter.js','pages.js','artwork-albums.js','artwork-source.js','artwork.js'];
async function scripts(page,files){
 for(const file of files){
  if(process.env.LFM_RATE_BASELINE==='1'&&['pages.js','artwork.js','artwork-albums.js'].includes(file))
   await page.addScriptTag({content:execFileSync('git',['show',(process.env.LFM_RATE_BASELINE_REF||'HEAD')+':'+file],{encoding:'utf8'})});
  else await loadScripts(page,[file]);
 }
}
const state=page=>page.evaluate(()=>[...document.querySelectorAll('.chartlist-image img')].map(i=>({src:i.src,visible:getComputedStyle(i).visibility,
 href:i.closest('a')?.getAttribute('href')??null,unverified:i.dataset.lfmArtwork==='unverified'})));
async function advanceUntil(page,predicate,arg,{step=1000,limit=600}={}){
 for(let n=0;n<limit;n++){
  if(await page.evaluate(predicate,arg))return;
  await page.clock.runFor(step);
 }
 throw new Error('Condition not reached: '+predicate+' '+JSON.stringify(await state(page)));
}
async function open(browser,{pause,warnFirst=false,cache=[]}){
 const page=await browser.newPage(),calls=[];let warned=false;
 await page.route('https://lastfm-img.freetls.fastly.net/**',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64')}));
 await page.route(origin+'/**',r=>{
  const path=new URL(r.request().url()).pathname;
  if(path.endsWith('/+tracks'))return r.fulfill({contentType:'text/html',body:`<main class="col-main"><table class="chartlist"><tbody>${row('First')}${row('Second')}</tbody></table></main>`});
  calls.push(path);
  if(path.includes('/_/')&&warnFirst&&!warned){warned=true;return r.fulfill({contentType:'text/html',body:warning});}
  if(path.includes('/_/'))return r.fulfill({contentType:'text/html',body:history(decodeURIComponent(path.split('/_/')[1]))});
  if(path.endsWith('/Preferred'))return r.fulfill({contentType:'text/html',body:albumPage('Preferred')});
  return r.fulfill({status:404,body:'Unexpected'});
 });
 await page.goto(origin+'/user/DCCXX/library/music/Artist/+tracks');
 await page.clock.install();
 const saved={settings:{username:'DCCXX'},rules:{artists:{Keep:'Keep'},albums:{},tracks:{},albumArtists:{}},xmlUndo:{sentinel:true},
  ...(pause?{lfmNetworkPause:pause}:{}),...(cache.length?{lfmPersonalArtworkCacheV1:cache}:{})};
 const worker=await mockExtension(page,saved);
 await page.evaluate(()=>{window.pauseEvents=0;});
 await scripts(page,modules);
 return {page,calls,worker,saved};
}
const won=()=>[...document.querySelectorAll('.chartlist-image img')].every(i=>i.src.endsWith('/Preferred.jpg')&&getComputedStyle(i).visibility==='visible'&&i.closest('a')?.href.endsWith('/music/Artist/Preferred'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try{
  // 1. The user's actual state: a pause stored hours ago with no expiry.
  {
   const {page,calls,worker,saved}=await open(browser,{pause:{at:Date.now()-20*60*1000}});
   await advanceUntil(page,won);
   assert.ok(calls.some(u=>u.includes('/_/')),'an old stored pause must not block artwork forever');
   for(const key of ['settings','rules','xmlUndo'])assert.deepEqual(worker.data[key],saved[key],'preferences are preserved');
   await page.close();
  }
  // 2. A live warning during the first lookup: rows must show Last.fm's image
  //    (never blank) during the cooldown, then finish with no user action.
  {
   const {page,calls,worker}=await open(browser,{warnFirst:true});
   await advanceUntil(page,()=>LastfmPages.status().rateLimited);
   const firstHistoryCalls=calls.filter(u=>u.includes('/_/')).length;
   await page.clock.runFor(3000);
   const during=await state(page);
   assert.ok(during.every(i=>i.visible==='visible'&&i.src.endsWith('/native.jpg')&&i.unverified&&i.href==='/music/Artist/Native'),
    'paused rows show the native cover and its own link, marked unverified: '+JSON.stringify(during));
   assert.equal(await page.evaluate(()=>LastfmArtwork.status().jobs.unavailable),0,'a rate pause must not fail the track');
   await page.clock.runFor(60000);
   assert.equal(calls.filter(u=>u.includes('/_/')).length,firstHistoryCalls,'no requests during the cooldown');
   assert.ok(worker.data.lfmNetworkPause.until>worker.data.lfmNetworkPause.at);
   await advanceUntil(page,won);
   assert.equal(await page.evaluate(()=>LastfmPages.status().rateLimited),false,'cooldown ends automatically');
   const after=await state(page);
   assert.ok(after.every(i=>!i.unverified),'the verified winner clears the unverified mark');
   await page.close();
  }
  // 3. Cold proof in flight: blank only for a short grace period, never longer.
  {
   const page=await browser.newPage();
   await page.route('https://lastfm-img.freetls.fastly.net/**',r=>r.abort());
   await page.route(origin+'/**',r=>r.fulfill({contentType:'text/html',body:`<main class="col-main"><table class="chartlist"><tbody>${row('First')}</tbody></table></main>`}));
   await page.goto(origin+'/user/DCCXX/library/music/Artist/+tracks');
   await page.clock.install();
   await mockExtension(page,{settings:{username:'DCCXX'}});
   await loadScripts(page,['rules.js','store.js','adapter.js']);
   await page.evaluate(()=>{window.LastfmPages={status:()=>({rateLimited:false})};window.LastfmArtworkSource={resolve:()=>new Promise(()=>{}),clear(){}};});
   await scripts(page,['artwork.js']);
   await page.waitForFunction(()=>LastfmArtwork.status().jobs.loading===1);
   assert.equal((await state(page))[0].visible,'hidden','a fast proof still gets a chance to avoid a wrong first frame');
   await page.clock.runFor(2000);
   const later=(await state(page))[0];
   assert.equal(later.visible,'visible','a slow proof must not leave an empty slot');
   assert.ok(later.unverified);
   await page.close();
  }
  // 4. A verified winner older than 24 hours is shown at once, then refreshed.
  {
   const old=Date.now()-3*24*60*60*1000;
   const cache=['First','Second'].map(name=>({key:JSON.stringify(['dccxx','artist',name.toLowerCase()]),username:'DCCXX',item:{artist:'Artist',name},checkedAt:old,
    cover:{artist:'Artist',album:'Preferred',image:image('Preferred'),url:origin+'/music/Artist/Preferred',total:4,scanned:4,fallback:false,sourceVersion:3}}));
   const {page}=await open(browser,{cache,pause:{at:Date.now(),until:Date.now()+60*60*1000,strikes:1}});
   await advanceUntil(page,()=>LastfmArtwork.status().cacheReady);
   await advanceUntil(page,won,undefined,{limit:5});
   await page.close();
  }
  // 5. 'Yes' on the next-page prompt must not clear Last.fm's break.
  {
   const page=await browser.newPage();
   await page.route(origin+'/**',r=>r.fulfill({contentType:'text/html',body:`<main><table class="chartlist"><tbody>${row('First')}</tbody></table><nav class="pagination"><a class="pagination-next" href="?page=2">Next</a></nav></main>`}));
   await page.goto(origin+'/user/DCCXX/library/music/Artist/+tracks');
   const until=Date.now()+60*60*1000;
   const worker=await mockExtension(page,{settings:{username:'DCCXX',infiniteScroll:true},lfmNetworkPause:{at:Date.now(),until,strikes:1}});
   await scripts(page,['rules.js','store.js','adapter.js','pages.js','content.js']);
   await page.getByRole('button',{name:'Yes',exact:true}).click();
   await page.getByText(/paused until/).waitFor();
   assert.equal(worker.data.lfmNetworkPause.until,until,'the prompt answer must not resume requests');
   await page.getByRole('button',{name:'Resume loading'}).click();
   await page.waitForFunction(()=>!LastfmPages.status().rateLimited);
   assert.ok(worker.data.lfmNetworkPause.until<=Date.now(),'the explicit resume button still ends the break early');
   assert.equal(worker.data.lfmNetworkPause.strikes,1,'explicit resume keeps the strike history');
   await page.close();
  }
  console.log('PASS: expired/legacy pauses recover, live warnings cool down and auto-resume, blocked rows show unverified native covers, stale winners display, prompt answers keep the break');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
