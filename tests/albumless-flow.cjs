const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {mockExtension,loadScripts,createMockWorker}=require('./harness.cjs');
const user='DCCXX', base='https://www.last.fm/user/DCCXX/library';
const now=Math.floor(Date.now()/1000), future=String(now-60), old=String(now-600);
const row=(stamp,blank=false)=>`<tr class="chartlist-row"><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="csrfmiddlewaretoken" value="test-only"><input name="artist_name" value="Artist"><input name="track_name" value="Song"><input name="timestamp" value="${stamp}">${blank?'':'<input name="album_name" value="Single"><input name="album_artist_name" value="Artist">'}</form></td></tr>`;
const table=rows=>`<main class="col-main"><table class="chartlist">${rows}</table></main>`;
const dialog=(stamp,wrong=false)=>`<div class="popup_content"><form method="post" action="/user/DCCXX/library/edit-track"><input name="csrfmiddlewaretoken" value="dialog-only"><input name="timestamp" value="${stamp}">${Object.entries({artist_name:'Artist',track_name:wrong?'Other':'Song',album_name:'Single',album_artist_name:'Artist'}).map(([n,v])=>['_original',''].map(s=>`<input name="${n+s}" value="${v}">`).join('')).join('')}<input type="checkbox" checked name="edit_all"><input type="checkbox" checked name="create_automatic_edit_rule"><button name="submit" type="submit" value="Save Edit">Save Edit</button></form></div>`;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const context=await browser.newContext(), pages=[await context.newPage(),await context.newPage()];
  let cleared=false, mismatch=false, rejectSave=false;
  const posts=[];
  await context.route('https://www.last.fm/**',async r=>{
   const u=new URL(r.request().url());
   if(r.request().method()==='POST') {
    const data=new URLSearchParams(r.request().postData());posts.push(data);
    if(!data.has('track_name_original')) return r.fulfill({body:dialog(data.get('timestamp'),mismatch)});
    if(!rejectSave) cleared=true;
    return r.fulfill({body:rejectSave?'<p class="errorlist">Rejected</p>':'Saved'});
   }
   return r.fulfill({body:table(u.pathname.includes('/_/')?row(future,cleared):row(future,cleared)+row(old))});
  });
  const rule={artist:'Artist',track:'Song',since:now-300};
  const initial={revision:0,enabled:true,rules:{'["artist","song"]':rule},attempts:{},lastError:'',scan:{next:1,total:null,candidates:{},complete:false},check:{next:1,watermark:now-300,target:0}};
  const worker=createMockWorker({settings:{username:user,infiniteScroll:false},albumlessScan:{nextPage:94},lfmAlbumlessV1:{version:1,profiles:{dccxx:initial}}});
  for(const p of pages){
   await p.goto(base);await mockExtension(p,{}, {worker});
   await loadScripts(p,['rules.js','store.js','adapter.js','albumless-reader.js']);
   // Network pacing itself is checked separately by albumless-transport. Keep
   // the actual DOM contracts, FormData payloads, fetch and worker in this test.
   await p.evaluate(()=>{
    const request=async(url,body)=>{const r=await fetch(url,body?{method:'POST',body}:{});return{doc:new DOMParser().parseFromString(await r.text(),'text/html'),url:r.url};};
    window.LastfmPages={get:url=>request(url),edit:async(f,o)=>{await o.beforeSend?.();return request(f.action,new URLSearchParams(new FormData(f)));},status:()=>({rateLimited:false})};
   });
   await loadScripts(p,['albumless-engine.js']);
   await p.waitForFunction(()=>!!LastfmAlbumless);
  }
  await Promise.all(pages.map(p=>p.evaluate(()=>LastfmAlbumless.checkNow())));
  const saves=posts.filter(p=>p.has('track_name_original'));
  assert.equal(saves.length,1,'two tabs cannot submit the same future play twice: '+worker.data.lfmAlbumlessV1.profiles.dccxx.lastError);
  assert.equal(saves[0].get('timestamp'),future,'older scrobbles must not be edited');
  assert.equal(saves[0].get('album_name'),'');assert.equal(saves[0].get('album_artist_name'),'');
  assert.equal(saves[0].get('track_name'),'Song');assert.equal(saves[0].get('artist_name'),'Artist');
  assert.equal(saves[0].has('edit_all'),false);assert.equal(saves[0].has('create_automatic_edit_rule'),false);
  assert.equal(Object.values(worker.data.lfmAlbumlessV1.profiles.dccxx.attempts)[0].phase,'verified');
  assert.deepEqual(worker.data.albumlessScan,{nextPage:94});

  // A matching row is insufficient: changed native original fields must stop
  // before a Save Edit request. No optimistic success or invented form payload.
  mismatch=true;cleared=false;posts.length=0;
  await worker.externalSet({lfmAlbumlessV1:{version:1,profiles:{dccxx:initial}}});
  await pages[0].evaluate(()=>LastfmAlbumless.checkNow());
  assert.equal(posts.filter(p=>p.has('track_name_original')).length,0);
  assert.equal(worker.data.lfmAlbumlessV1.profiles.dccxx.enabled,false);

  mismatch=false;rejectSave=true;posts.length=0;
  await worker.externalSet({lfmAlbumlessV1:{version:1,profiles:{dccxx:initial}}});
  await pages[0].evaluate(()=>LastfmAlbumless.checkNow());
  const failed=worker.data.lfmAlbumlessV1.profiles.dccxx;
  assert.equal(failed.enabled,false);assert.equal(Object.values(failed.attempts)[0].phase,'uncertain');
  const before=posts.length;
  await worker.externalSet({lfmAlbumlessV1:{version:1,profiles:{dccxx:{...failed,enabled:true}}}});
  await pages[0].evaluate(()=>LastfmAlbumless.checkNow());
  assert.equal(posts.length,before,'an uncertain save is never automatically replayed');
  console.log('PASS: native dialog preparation, future-only single-play writes, exact original-field guard, cross-tab deduplication, readback confirmation and uncertain-write stop');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
