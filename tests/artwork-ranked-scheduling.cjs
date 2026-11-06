const assert=require('node:assert/strict'),fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const {mockExtension,loadScripts}=require('./harness.cjs');
const origin='https://www.last.fm',image=n=>`https://lastfm-img.freetls.fastly.net/i/u/64s/${n}.jpg`;
const generic='4128a6eb29f94943c9d206c08e625904';
const row=(name,album)=>`<tr class="chartlist-row"><td class="chartlist-image">${album?`<a href="/music/Artist/${album}">`:'<span class="cover-art">'}<img width="32" height="32" src="${image(album||generic)}">${album?'</a>':'</span>'}</td><td class="chartlist-name"><a href="/music/Artist/_/${name}">${name}</a></td><td data-stat-value="4"></td></tr>`;
const albumPage=name=>`<main class="col-main"><header class="library-header"><h2 class="library-header-title">${name}</h2><span class="library-header-image"><img src="${image(name)}"></span><a href="/music/Artist/${name}">Album</a></header><p class="metadata-display">12</p><table class="chartlist">${['First','Second','Appended'].map(n=>row(n)).join('')}</table></main>`;
async function scripts(page,files){
 for(const file of files){
  if(process.env.LFM_RANKED_BASELINE==='1'&&['artwork.js','artwork-albums.js'].includes(file))await page.addScriptTag({content:execFileSync('git',['show','6af06f7:'+file],{encoding:'utf8'})});
  else await loadScripts(page,[file]);
 }
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try{
  const probe=await browser.newPage();
  await probe.route(origin+'/**',r=>r.fulfill({body:'<main></main>',contentType:'text/html'}));
  await probe.goto(origin+'/user/DCCXX/library/music/Artist/+tracks');
  await loadScripts(probe,['rules.js','adapter.js']);
  await probe.evaluate(()=>{window.requests=[];window.LastfmPages={status:()=>({rateLimited:false}),get:async url=>{requests.push(url);throw Error('Unrelated album')}}});
  await scripts(probe,['artwork-albums.js']);
  const arbitrary=await probe.evaluate(async()=>{
   for(const album of ['Other','Preferred'])LastfmArtworkAlbums.remember({artist:'Artist',name:'Seed'+album},{artist:'Artist',album,image:'https://lastfm-img.freetls.fastly.net/i/u/64s/'+album+'.jpg',total:1,sourceVersion:3},'DCCXX');
   await LastfmArtworkAlbums.resolve({artist:'Artist',name:'Cold',libraryTotal:4},'DCCXX').catch(()=>null);return requests;
  });
  assert.deepEqual(arbitrary,[],'ambiguous ranked hints must yield immediately to authoritative track history');
  await probe.close();
  for(const hint of [null,'Preferred','Wrong']){
   const p=await browser.newPage(),calls=[];
   await p.route('https://lastfm-img.freetls.fastly.net/**',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64')}));
   await p.route(origin+'/**',r=>{
    const path=new URL(r.request().url()).pathname;
    if(path.endsWith('/+tracks'))return r.fulfill({contentType:'text/html',body:`<main class="col-main"><table class="chartlist"><tbody>${row('First',hint)}${row('Second',hint)}</tbody></table></main>`});
    calls.push(path);
    if(path.endsWith('/Preferred'))return r.fulfill({contentType:'text/html',body:albumPage('Preferred')});
    if(path.endsWith('/Wrong'))return r.fulfill({contentType:'text/html',body:albumPage('Wrong').replaceAll('/_/','/_/Unrelated')});
    if(path.includes('/_/'))return r.fulfill({contentType:'text/html',body:`<main class="col-main"><p class="metadata-display">4</p><table class="chartlist">${Array.from({length:4},(_,n)=>`<tr class="chartlist-row"><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Artist"><input name="track_name" value="First"><input name="album_name" value="Preferred"><input name="album_artist_name" value="Artist"><input name="timestamp" value="${n}"></form></td></tr>`).join('')}</table></main>`});
    return r.fulfill({status:503,body:'Unrelated album'});
   });
   await p.goto(origin+'/user/DCCXX/library/music/Artist/+tracks');
   const cache=['Other0','Other1','Other2','Other3','Other4','Preferred'].map(album=>({key:JSON.stringify(['dccxx','artist','seed'+album]),username:'DCCXX',item:{artist:'Artist',name:'Seed'+album},checkedAt:Date.now(),cover:{artist:'Artist',album,image:image(album),url:origin+'/music/Artist/'+album,total:1,scanned:1,sourceVersion:3}}));
   const saved={settings:{username:'DCCXX'},rules:{artists:{Keep:'Keep'},albums:{},tracks:{},albumArtists:{}},xmlUndo:{sentinel:true},scanRecords:{sentinel:true},lfmPersonalArtworkCacheV1:cache};
   const worker=await mockExtension(p,saved);
   await p.evaluate(()=>{let t=Date.now();Date.now=()=>t+=2000});
   await scripts(p,['rules.js','store.js','adapter.js','pages.js','artwork-albums.js','artwork-source.js','artwork.js']);
   await p.waitForFunction(()=>LastfmArtwork.status().jobs.complete===2).catch(async error=>{
    console.error(JSON.stringify({hint,calls,status:await p.evaluate(()=>LastfmArtwork.status())}));throw error;
   });
   assert.equal(calls.some(u=>/Other\d$/.test(u)),false,'ambiguous saved albums must not delay this track with an arbitrary read');
   assert.equal(calls.filter(u=>u.includes('/_/')).length,hint==='Preferred'?0:1,'only a personally proved native hint may avoid individual history');
   assert.equal(calls.filter(u=>u.endsWith('/Preferred')).length,1,'read personal album counts once even when the native and saved hints duplicate it');
   assert.equal(await p.locator('img').first().getAttribute('src'),image('Preferred'),'wrong native compilation cannot win');
   assert.equal(await p.locator('.chartlist-image a').first().getAttribute('href'),origin+'/music/Artist/Preferred');
   const before=calls.length;
   const detached=await p.evaluate(async html=>{const b=document.createElement('tbody');b.innerHTML=html;await LastfmArtwork.prepareRows([...b.children]);const i=b.querySelector('img'),v={src:i.src,href:i.closest('a')?.href,visible:i.style.visibility !== 'hidden'};document.querySelector('tbody').append(...b.children);return v},row('Appended','Preferred'));
   assert.deepEqual(detached,{src:image('Preferred'),href:origin+'/music/Artist/Preferred',visible:true},'proved shared counts prepare both cover and link before scroll insertion');
   assert.equal(calls.length,before);
   for(const key of ['settings','rules','xmlUndo','scanRecords'])assert.deepEqual(worker.data[key],saved[key]);
   await p.close();
  }
  console.log('PASS: ranked discovery skips arbitrary hints, proves native hints, rejects wrong winners, deduplicates counts, prepares appended pairs and preserves storage');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});


