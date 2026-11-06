const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {mockExtension,loadScripts}=require('./harness.cjs');
const origin='https://www.last.fm',image='https://lastfm-img.freetls.fastly.net/i/u/64s/Winner.jpg';
const row=(n,hidden=false)=>`<tr class="chartlist-row chartlist-row--with-artist${hidden?' theme-hidden':''}"><td class="chartlist-image"><a href="/music/Artist/Native"><img width="32" height="32" src="${image}"></a></td><td class="chartlist-name"><a href="/music/Artist/_/Song+${n}">Song ${n}</a></td><td class="chartlist-artist"><a href="/music/Artist">Artist</a></td></tr>`;
const html=next=>`<style id="theme">body{background:rgb(20,30,40);color:rgb(220,230,240)}.chartlist-name{font-weight:400!important}.chartlist-image img{border-radius:0!important;visibility:hidden}.theme-hidden{display:none!important}td{height:40px}</style><main id="content"><table class="chartlist"><tbody>${next?row(2,true)+row(3):row(1)}</tbody></table><nav class="pagination">${next?'':'<a class="pagination-next" href="?page=2">Next</a>'}</nav></main>`;
// Debloater's desktop artist-first transformation, preserving its CSS/classes.
const artistFirst=()=>{for(const r of document.querySelectorAll('tr:not(.debloat-artist-first)')){const a=r.querySelector('.chartlist-artist'),s=r.querySelector('.chartlist-name');if(a&&s){s.innerHTML=a.innerHTML+' – '+s.innerHTML;a.remove();r.classList.add('debloat-artist-first')}}};
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});try{
 const page=await browser.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{requests.push(r.request().method());return r.request().url().startsWith(origin)?r.fulfill({contentType:'text/html',body:html(new URL(r.request().url()).searchParams.has('page'))}):r.abort()});
 await page.goto(origin+'/user/DCCXX/library/tracks');
 const rules={artists:{},albums:{},tracks:{'["artist","song 1"]':{from:'Song 1',to:'SONG 1',artist:'Artist'},'["artist","song 3"]':{from:'Song 3',to:'SONG 3',artist:'Artist'}},albumArtists:{}};
 const winner={key:JSON.stringify(['dccxx','artist','song 1']),username:'DCCXX',item:{artist:'Artist',name:'Song 1'},checkedAt:Date.now(),cover:{artist:'Artist',album:'Winner',image,url:origin+'/music/Artist/Winner',total:7,scanned:7,fallback:false,sourceVersion:3}};
 const worker=await mockExtension(page,{settings:{username:'DCCXX',infiniteScroll:true},rules,lfmPersonalArtworkCacheV1:[winner]},{artworkLookups:false});
 await page.evaluate(artistFirst);
 await loadScripts(page,['rules.js','store.js','adapter.js','pages.js','content.js','artwork.js']);
 await page.waitForFunction(()=>document.querySelector('a[href$="Song+1"]').textContent==='SONG 1');
 await page.waitForFunction(()=>LastfmArtwork.status().cacheReady&&LastfmArtwork.status().held===0);
 assert.equal(await page.locator('img').getAttribute('src'),image);
 assert.equal(await page.locator('.chartlist-image a').getAttribute('href'),origin+'/music/Artist/Winner');
 assert.equal(await page.locator('img').evaluate(i=>getComputedStyle(i).visibility),'hidden','theme CSS must retain control of cover visibility even with a saved winner');
 assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(20, 30, 40)');
 assert.equal(await page.locator('.chartlist-name').evaluate(e=>getComputedStyle(e).fontWeight),'400');
 assert.equal(await page.locator('.debloat-artist-first').count(),1);
 await page.getByRole('button',{name:'Yes',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('tr').length===3);
 await page.waitForFunction(()=>!document.querySelector('.lfm-scroll-status'));
 await page.evaluate(artistFirst);
 assert.equal(await page.locator('tr.theme-hidden').count(),1,'a deliberately hidden row does not discard the whole batch');
 await page.waitForFunction(()=>document.querySelector('a[href$="Song+3"]').textContent==='SONG 3');
 // A theme can replace nested title markup without LastWord flattening it.
 await page.locator('a[href$="Song+1"]').evaluate(a=>{a.innerHTML='<span class="smart-title">Song</span><span class="smart-tag"> (Live)</span>';});
 await page.waitForTimeout(150);
 assert.equal(await page.locator('.smart-title').textContent(),'Song');
 assert.equal(await page.locator('.smart-tag').textContent(),' (Live)');
 // Renderer reuses a text node for a different title. Navigation/undo must not clobber it.
 await page.locator('a[href$="Song+3"]').evaluate(a=>{a.firstChild.nodeValue='Another song';history.pushState({},'', '/user/Friend/library/tracks');dispatchEvent(new PopStateEvent('popstate'));});
 await page.waitForTimeout(150);
 assert.equal(await page.locator('a[href$="Song+3"]').textContent(),'Another song');
 assert.equal(await page.locator('.smart-tag').textContent(),' (Live)');
 assert.equal(await page.locator('img').first().evaluate(i=>getComputedStyle(i).visibility),'hidden');
 assert.deepEqual(worker.data.rules,rules,'compatibility must not rewrite stored preferences');
 assert.ok(requests.every(m=>m==='GET'));assert.deepEqual(errors,[]);
 // Inline important visibility is also owned by the external styling tool.
 await page.goto(origin+'/user/DCCXX/library/tracks');
 await page.locator('img').evaluate(i=>i.style.setProperty('visibility','hidden','important'));
 await mockExtension(page,{settings:{username:'DCCXX'}},{artworkLookups:false});
 await loadScripts(page,['rules.js','store.js','adapter.js','artwork.js']);
 await page.waitForFunction(()=>LastfmArtwork.status().cacheReady&&LastfmArtwork.status().held===0);
 assert.equal(await page.locator('img').evaluate(i=>i.style.getPropertyPriority('visibility')),'important');
 assert.equal(await page.locator('img').evaluate(i=>getComputedStyle(i).visibility),'hidden');
 console.log('PASS: theme CSS, Debloater-style artist-first rows, hidden appended rows, nested title markup, external text ownership, profile isolation and GET-only transport');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
