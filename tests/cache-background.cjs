const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),origin='https://www.last.fm';
let repaired=false;
const row=(type,name,broken=false)=>`<tr class="chartlist-row"><td class="chartlist-name"><a href="/music/${type==='artists'?name:'Artist/'+(type==='tracks'?'_/':'')+(broken&&!repaired?'Wrong':name)}">${name}</a></td>${type!=='artists'?'<td class="chartlist-artist"><a href="/music/Artist">Artist</a></td>':''}</tr>`;
const html=(type,page)=>`<main class="col-main"><table class="chartlist">${type==='tracks'?row(type,'Song '+page)+(page===1?row(type,'Broken',true):''):row(type,type==='artists'?'Artist':'Album')}</table><nav class="pagination">${type==='tracks'&&page===1?'<a class="pagination-next" href="?date_preset=ALL&page=2">Next</a>':''}</nav></main>`;
(async()=>{fs.mkdirSync(path.join(root,'test-results'),{recursive:true});const profile=fs.mkdtempSync(path.join(root,'test-results','background-cache-'));let b;try{
 b=await chromium.launchPersistentContext(profile,{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,headless:false,acceptDownloads:true,args:['--headless=new','--no-sandbox',`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 const requests=[],errors=[];b.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await b.route('**/*',r=>{const u=new URL(r.request().url());if(u.protocol==='chrome-extension:')return r.continue();requests.push({url:u.href,method:r.request().method()});if(u.origin===origin)return r.fulfill({contentType:'text/html',body:html(u.pathname.split('/').pop(),Number(u.searchParams.get('page')||1))});return r.abort()});
 const w=b.serviceWorkers()[0]||await b.waitForEvent('serviceworker'),id=new URL(w.url()).host,base=`chrome-extension://${id}/`;
 let setup;for(let n=0;n<100&&!setup;n++){setup=b.pages().find(p=>p.url()===base+'options.html');if(!setup)await new Promise(r=>setTimeout(r,25))}assert.ok(setup,'installation opens setup');await setup.locator('#profile-status').filter({hasText:'Not connected'}).waitFor();
 const own=await b.newPage();await own.goto(origin+'/user/DCCXX/library/tracks');
 await setup.evaluate(()=>LastfmStore.saveSettings({username:'DCCXX'}));await setup.close();
 const read=()=>w.evaluate(()=>chrome.storage.local.get(null));
 const until=async fn=>{for(let n=0;n<900;n++){const s=await read();if(fn(s))return s;await new Promise(r=>setTimeout(r,50))}throw Error('Background cache did not progress: '+JSON.stringify({jobs:(await read()).lfmLibraryJobsV1,requests,errors}))};
 let state=await until(s=>s.lfmLibraryCacheV1?.profiles.dccxx?.groups.artists.done);
 assert.equal(state.lfmLibraryJobsV1.dccxx.running,false);assert.equal(state.lfmLibraryCacheV1.profiles.dccxx.groups.tracks.skipped[0].name,'Broken','bad row does not stop later pages or groups');
 const p=await b.newPage();await p.goto(base+'itunes.html');await p.locator('#cache-status').filter({hasText:'Complete'}).waitFor();
 await p.locator('#cache-skipped').evaluate(e=>e.open=true);assert.match(await p.locator('#cache-skipped-list').innerText(),/Broken/);
 await p.locator('.cache-advanced').evaluate(e=>e.open=true);const old=state.lfmLibraryCacheV1.profiles.dccxx.id;
 await p.locator('#cache-rebuild').click();assert.match(await p.locator('#cache-confirm-detail').innerText(),/hour or more/);assert.equal(await p.evaluate(()=>document.activeElement.id),'cache-cancel');await p.locator('#cache-cancel').click();assert.equal((await read()).lfmLibraryCacheV1.profiles.dccxx.id,old);
 // Capture the generated Blob: intercepted headless Supermium cancels blob
 // downloads. The real installed-browser download is verified separately.
 await p.evaluate(()=>{const create=URL.createObjectURL;URL.createObjectURL=blob=>{window.exportedBlob=blob;return create(blob)};const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download.startsWith('lastfm-cache-'))window.exportName=this.download;else click.call(this)}});
 await p.locator('#cache-export').click();await p.waitForFunction(()=>!!window.exportedBlob);const payload=JSON.parse(await p.evaluate(()=>window.exportedBlob.text()));assert.equal(payload.cache.id,old);assert.match(await p.evaluate(()=>window.exportName),/^lastfm-cache-DCCXX-/);const file=path.join(profile,'cache.json');fs.writeFileSync(file,JSON.stringify(payload));
 await p.locator('#cache-import').setInputFiles(file);await p.locator('#cache-confirm-dialog[open]').waitFor();await p.locator('#cache-cancel').click();assert.equal((await read()).lfmLibraryCacheV1.profiles.dccxx.id,old);
 await p.locator('#cache-import').setInputFiles({name:'wrong.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...payload,cache:{...payload.cache,username:'Friend'}}))});await p.locator('#cache-message').filter({hasText:'Could not import'}).waitFor();assert.equal((await read()).lfmLibraryCacheV1.profiles.dccxx.id,old);
 await p.locator('#cache-import').setInputFiles(file);await p.locator('#cache-confirm-dialog[open]').waitFor();await p.locator('#cache-confirm').click();await p.waitForFunction(old=>document.querySelector('#cache-status').textContent==='Complete'&&LastfmStore.cacheLibrary('read').then(c=>c.id!==old),old);
 await p.locator('#cache-rebuild').click();await p.locator('#cache-confirm').click();state=await until(s=>!!s.lfmLibraryCacheV1.drafts?.dccxx);const retained=state.lfmLibraryCacheV1.profiles.dccxx.id;
 await p.locator('#cache-pause').click();assert.equal((await read()).lfmLibraryCacheV1.profiles.dccxx.id,retained);await p.reload();await p.locator('#cache-resume:visible').waitFor();await p.locator('#cache-resume').click();await p.close();
 state=await until(s=>s.lfmLibraryCacheV1.profiles.dccxx.id!==retained);assert.equal(state.lfmLibraryCacheV1.drafts.dccxx,undefined);
 const next=await b.newPage();await next.goto(base+'itunes.html');await next.locator('#cache-status').filter({hasText:'Complete'}).waitFor();repaired=true;await next.locator('#cache-skipped').evaluate(e=>e.open=true);const beforeRetry=requests.length;await next.locator('#cache-retry').click();state=await until(s=>!s.lfmLibraryJobsV1.dccxx.running&&!s.lfmLibraryCacheV1.profiles.dccxx.groups.tracks.skipped.length);
 assert.equal(requests.length-beforeRetry,1,'retry downloads only the missed page');assert.equal(state.lfmLibraryCacheV1.profiles.dccxx.groups.tracks.page,3);
 assert.ok(requests.every(x=>x.method==='GET'));assert.deepEqual(errors,[]);
 console.log('PASS: first-connect background caching with UI closed, bad-row continuation, skipped report/retry, export/import UI validation and cancel, confirmed retained rebuild, pause/reopen/resume, atomic completion and GET-only traffic');
 }finally{if(b)await b.close();const actual=fs.realpathSync(profile);assert.equal(path.dirname(actual),fs.realpathSync(path.join(root,'test-results')));fs.rmSync(actual,{recursive:true,force:true,maxRetries:5})}})().catch(e=>{console.error(e);process.exitCode=1});
