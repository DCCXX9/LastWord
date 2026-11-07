const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),origin='https://www.last.fm';
// Browsing to a non-profile page in the caching tab (Last.fm navigates in-page)
// must leave the job waiting, then continue automatically back on the profile.
const row=(type,name)=>`<tr class="chartlist-row"><td class="chartlist-name"><a href="/music/${type==='artists'?name:'Artist/'+(type==='tracks'?'_/':'')+name}">${name}</a></td>${type!=='artists'?'<td class="chartlist-artist"><a href="/music/Artist">Artist</a></td>':''}</tr>`;
const html=(type,page)=>`<main class="col-main"><table class="chartlist">${row(type,type==='tracks'?'Song '+page:type==='artists'?'Artist':'Album')}</table><nav class="pagination">${type==='tracks'&&page===1?'<a class="pagination-next" href="?date_preset=ALL&page=2">Next</a>':''}</nav></main>`;
(async()=>{fs.mkdirSync(path.join(root,'test-results'),{recursive:true});const profile=fs.mkdtempSync(path.join(root,'test-results','browse-away-'));let b;try{
 b=await chromium.launchPersistentContext(profile,{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,headless:false,args:['--headless=new','--no-sandbox',`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 const requests=[],errors=[];let release,held=false;b.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await b.route('**/*',async r=>{const u=new URL(r.request().url());if(u.protocol==='chrome-extension:')return r.continue();requests.push({url:u.href,method:r.request().method()});
  if(u.origin===origin&&r.request().resourceType()==='fetch'&&u.pathname.endsWith('/tracks')&&u.searchParams.get('page')==='2'&&!held){held=true;await new Promise(r=>{release=r})}
  if(u.origin===origin)return r.fulfill({contentType:'text/html',body:u.pathname.includes('/library/')?html(u.pathname.split('/').pop(),Number(u.searchParams.get('page')||1)):'<main class="col-main"><h1>Artist</h1></main>'});return r.abort()});
 const w=b.serviceWorkers()[0]||await b.waitForEvent('serviceworker'),id=new URL(w.url()).host,base=`chrome-extension://${id}/`;
 let setup;for(let n=0;n<100&&!setup;n++){setup=b.pages().find(p=>p.url()===base+'options.html');if(!setup)await new Promise(r=>setTimeout(r,25))}assert.ok(setup,'installation opens setup');await setup.locator('#profile-status').filter({hasText:'Not connected'}).waitFor();
 const own=await b.newPage();await own.goto(origin+'/user/DCCXX/library/tracks');
 await setup.evaluate(()=>LastfmStore.saveSettings({username:'DCCXX'}));await setup.close();
 const read=()=>w.evaluate(()=>chrome.storage.local.get(null));
 const until=async(fn,what)=>{for(let n=0;n<1400;n++){const s=await read();if(fn(s))return s;await new Promise(r=>setTimeout(r,50))}throw Error(what+': '+JSON.stringify({jobs:(await read()).lfmLibraryJobsV1,requests,errors}))};
 for(let n=0;n<400&&!held;n++)await new Promise(r=>setTimeout(r,25));assert.ok(held,'page 2 request reached the network');
 // Leave the profile in-page while page 2 is loading, as clicking an artist link does.
 await own.evaluate(()=>history.pushState({},'','/music/Artist'));release();
 let state=await until(s=>/continues when/i.test(s.lfmLibraryJobsV1?.dccxx?.waiting||''),'job did not wait after browsing away');
 assert.equal(state.lfmLibraryJobsV1.dccxx.running,true,'browsing away must not stop caching');assert.equal(state.lfmLibraryJobsV1.dccxx.error,'');
 assert.equal(state.lfmLibraryCacheV1.profiles.dccxx.groups.tracks.page,2,'the unfinished page is kept for later');
 await own.evaluate(()=>history.pushState({},'','/user/DCCXX/library/tracks'));
 state=await until(s=>s.lfmLibraryCacheV1?.profiles.dccxx?.groups.artists.done,'job did not continue after returning to the profile');
 assert.equal(state.lfmLibraryJobsV1.dccxx.running,false);assert.equal(state.lfmLibraryJobsV1.dccxx.error,'');assert.ok(Object.values(state.lfmLibraryCacheV1.profiles.dccxx.groups.tracks.items).some(x=>x.name==='Song 2'),'page 2 cached after return');
 assert.ok(requests.every(x=>x.method==='GET'));assert.deepEqual(errors,[]);
 console.log('PASS: browsing away in the caching tab waits without stopping, keeps the unfinished page and continues automatically on return to the profile');
 }finally{if(b)await b.close();const actual=fs.realpathSync(profile);assert.equal(path.dirname(actual),fs.realpathSync(path.join(root,'test-results')));fs.rmSync(actual,{recursive:true,force:true,maxRetries:5})}})().catch(e=>{console.error(e);process.exitCode=1});
