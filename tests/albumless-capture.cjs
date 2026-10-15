const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {mockExtension,loadScripts}=require('./harness.cjs');
const fields=(original=true)=>`<input name="csrfmiddlewaretoken" value="test-only"><input name="timestamp" value="1700000000">${Object.entries({artist_name:'Artist',track_name:'Song',album_name:'Single',album_artist_name:'Artist'}).map(([n,v])=>original?['_original',''].map(s=>`<input name="${n+s}" value="${v}">`).join(''):`<input name="${n}" value="${v}">`).join('')}`;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const p=await browser.newPage();let blank=false,reads=0,posts=0;
  await p.route('https://www.last.fm/**',r=>{
   if(r.request().method()==='POST')posts++;
   if(r.request().url().includes('/_/')){reads++;return r.fulfill({contentType:'text/html',body:`<table><tr class="chartlist-row"><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track">${fields(false).replace(blank?/<input name="album_(?:artist_)?name"[^>]*>/g:/nevermatch/g,'')}</form></td></tr></table>`});}
   return r.fulfill({contentType:'text/html',body:`<div class="popup_content"><form method="post" action="/user/DCCXX/library/edit-track">${fields()}<input type="checkbox" name="create_automatic_edit_rule"><button type="submit">Save Edit</button></form></div>`});
  });
  await p.goto('https://www.last.fm/user/DCCXX/library');
  const w=await mockExtension(p,{settings:{username:'DCCXX',infiniteScroll:false}});
  await p.evaluate(()=>document.addEventListener('submit',e=>e.preventDefault()));
  await loadScripts(p,['rules.js','store.js','adapter.js','pages.js','albumless-reader.js','albumless-engine.js','native-edit.js']);
  const remember=p.locator('[data-lfm-remember-albumless]');await remember.waitFor();
  await p.locator('[name="album_name"]').fill('');await p.locator('[name="album_artist_name"]').fill('');
  await p.locator('[name="create_automatic_edit_rule"]').check();assert.equal(await remember.isChecked(),true);
  await p.getByRole('button',{name:'Save Edit',exact:true}).click();
  await p.waitForFunction(()=>document.querySelector('[data-lfm-albumless-toast]')?.textContent.includes('No rule was saved'));
  assert.equal(w.data.lfmAlbumlessV1,undefined,'a rejected/unconfirmed native edit saves no rule');
  blank=true;await p.evaluate(()=>{let t=Date.now();Date.now=()=>t+=20000;});
  await p.locator('form').evaluate(f=>f.requestSubmit());
  await p.waitForFunction(()=>window.saved.lfmAlbumlessV1?.profiles.dccxx.rules['["artist","song"]']);
  assert.equal(w.data.lfmAlbumlessV1.profiles.dccxx.enabled,false);
  assert.equal(reads,2,'one confirmation read per submission, without polling retries');assert.equal(posts,0,'capture never submits its own Last.fm edit');
  assert.ok(await p.getByRole('link',{name:'Manage album-less rules'}).count());
  console.log('PASS: native remember checkbox, failed-edit rejection, exact-play readback, successful future-only capture and no duplicate submission');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
