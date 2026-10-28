const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {mockExtension,loadScripts}=require('./harness.cjs');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try{
  const p=await b.newPage();
  for(const type of ['album','track'])for(const fail of [false,true]){
   await p.route('https://www.last.fm/**',r=>r.fulfill({contentType:'text/html',body:`
    <div class="popup_content"><form method="post" action="/user/DCCXX/library/edit-${type}" data-modal-form>
    ${Object.entries({album_name:'ALBUM',album_artist_name:'Artist',...(type==='track'?{track_name:'SONG',artist_name:'Artist'}:{})}).map(([n,v])=>`<input name="${n}_original" value="${v}" readonly><input name="${n}" value="${v}">`).join('')}
    <button type="submit">Save edit</button><button type="button" class="btn-secondary js-close">Cancel</button></form></div>
    <div role="dialog" id="other">Other dialog</div>`}));
   await p.goto('https://www.last.fm/user/DCCXX/library');
   await mockExtension(p,{settings:{username:'DCCXX',infiniteScroll:false}},{artworkLookups:false});
   await loadScripts(p,['rules.js','store.js','adapter.js']);
   await p.evaluate(fail=>{
    document.querySelector('.js-close').addEventListener('click',e=>{window.nativeCloses=(window.nativeCloses||0)+1;e.target.closest('.popup_content').hidden=true});
    document.addEventListener('submit',e=>{e.preventDefault();window.submitted=true});
    if(fail)globalThis.LastfmStore={...LastfmStore,mutate:async()=>{throw Error('Simulated storage failure')}};
   },fail);
   await loadScripts(p,['native-edit.js']);
   await p.locator('[name=album_name]').fill('Album');
   await p.locator('[data-lfm-save-casing]').click();
   await p.locator(`[data-lfm-local-toast][data-kind="${fail?'error':'success'}"]`).waitFor();
   assert.equal(await p.locator('.popup_content').isVisible(),fail,`${type}: close only after success`);
   assert.equal(await p.locator('#other').isVisible(),true,'other dialogs untouched');
   assert.equal(await p.evaluate(()=>Boolean(window.submitted)),false,'no native submission');
   assert.equal(await p.evaluate(()=>window.nativeCloses||0),fail?0:1,'native cancel used once');
   if(fail)assert.equal(await p.locator('[name=album_name]').inputValue(),'Album','failed input retained');
   await p.unroute('https://www.last.fm/**');
  }
  console.log('PASS: native album and track dialogs close after successful local saves; failed saves retain dialog and input; no submissions or unrelated dialog closures');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
