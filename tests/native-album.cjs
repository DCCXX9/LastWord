const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');

// Named pairs/action captured from the signed-in Supermium album dialog on
// 28 October 2026. Album editing has no artist_name or track_name pair.
const action = '/user/DCCXX/library/edit-album?edited-variation=library-album-scrobble';
const fields = { album_name: 'LUH LEAKYZ Vol. 1', album_artist_name: 'Yeat' };
const html = `<!doctype html><a href="/music/Yeat/LUH+LEAKYZ+Vol.+1">LUH LEAKYZ Vol. 1</a>
 <div class="popup_content"><form method="post" action="${action}" data-modal-form>
 ${Object.entries(fields).map(([name,value]) => `<input name="${name}_original" value="${value}" readonly><input name="${name}" value="${value}">`).join('')}
 <input type="checkbox" name="create_automatic_edit_rule">
 <button type="submit">Save edit</button><input type="hidden" name="submit" value="edit-album">
 </form></div>`;

(async () => {
 const browser = await chromium.launch({headless:true,
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const page = await browser.newPage();
  await page.route('https://www.last.fm/**', route => route.fulfill({contentType:'text/html',body:html}));
  const seed = {settings:{username:'DCCXX',infiniteScroll:false},
   lfmItunesUndoV1:{sentinel:'undo'},albumlessScanDraft:{sentinel:'scan'},
   lfmNetworkPause:{sentinel:'pause'},lfmPersonalArtworkCacheV1:{sentinel:'artwork'}};
  const scripts = ['rules.js','store.js','adapter.js','pages.js','content.js','native-edit.js'];
  async function setup(profile='DCCXX') {
   await page.goto(`https://www.last.fm/user/${profile}/library/music/Yeat/+albums`);
   const worker = await mockExtension(page,seed,{artworkLookups:false});
   await page.evaluate(()=>document.addEventListener('submit',e=>{
    e.preventDefault(); window.nativeSubmissions=(window.nativeSubmissions||0)+1;
   }));
   await loadScripts(page,scripts);
   await page.waitForTimeout(30);
   return worker;
  }
  let worker = await setup();
  const album = page.locator('.popup_content [name=album_name]');
  const artist = page.locator('.popup_content [name=album_artist_name]');
  const submit = () => page.locator('.popup_content form').evaluate(f=>f.requestSubmit());
  const casing = page.getByRole('button',{name:'Save casing changes',exact:true});
  assert.equal(await casing.count(),1,'one local save beside the native submit');
  assert.equal(await casing.getAttribute('type'),'button','local control cannot submit a Last.fm edit');
  assert.equal(await casing.isDisabled(),true,'unchanged input cannot save');
  assert.equal(await casing.evaluate(b=>b.previousElementSibling.textContent.trim()),'Save edit');
  await album.fill('Luh Leakyz Vol. 1');
  assert.equal(await casing.isEnabled(),true);
  await casing.click();
  await page.waitForFunction(()=>document.querySelector('[data-lfm-local-toast][data-kind="success"]'),null,{timeout:1500});
  assert.equal(worker.data.rules.albums['["yeat","luh leakyz vol. 1"]'].to,'Luh Leakyz Vol. 1');
  assert.equal(await page.evaluate(()=>window.nativeSubmissions||0),0);
  await page.waitForFunction(()=>document.querySelector('a[href^="/music/"]').textContent==='Luh Leakyz Vol. 1');
  for(const [key,value] of Object.entries(seed)) assert.deepEqual(worker.data[key],value,key+' preserved');

  worker = await setup();
  await artist.fill('YEAT');
  assert.equal(await casing.isEnabled(),true);
  await casing.click();
  await page.waitForFunction(()=>document.querySelector('[data-lfm-local-toast][data-kind="success"]'));
  assert.equal(worker.data.rules.albumArtists['["yeat"]'].to,'YEAT');
  assert.equal(await page.evaluate(()=>window.nativeSubmissions||0),0);

  worker = await setup();
  await album.fill('Luh Leakyz Vol. 1'); await artist.fill('YEAT');
  await submit();
  await page.waitForFunction(()=>document.querySelector('[data-lfm-local-toast][data-kind="success"]'));
  assert.equal(worker.data.rules.albums['["yeat","luh leakyz vol. 1"]'].artist,'Yeat');
  assert.equal(worker.data.rules.albumArtists['["yeat"]'].to,'YEAT');
  assert.equal(await page.evaluate(()=>window.nativeSubmissions||0),0);

  for(const [name,values] of Object.entries({unchanged:fields,
   mixedAlbum:{...fields,album_name:'A different album',album_artist_name:'YEAT'},
   mixedArtist:{...fields,album_name:'Luh Leakyz Vol. 1',album_artist_name:'Other artist'}})) {
   worker = await setup();
   await album.fill(values.album_name); await artist.fill(values.album_artist_name);
   assert.equal(await casing.isDisabled(),true,name+' cannot use the local casing button');
   const before=structuredClone(worker.data);
   await submit();
   assert.equal(await page.evaluate(()=>window.nativeSubmissions),1,name+' preserves native editing');
   assert.deepEqual(worker.data,before,name+' saves no partial preference');
   assert.equal(await page.locator('[data-lfm-local-toast]').count(),0,name+' is supported');
  }
  worker=await setup('Friend');
  assert.equal(await casing.count(),0,'no local save on another profile');
  const before=structuredClone(worker.data);
  await album.fill('Luh Leakyz Vol. 1'); await submit();
  assert.equal(await page.evaluate(()=>window.nativeSubmissions),1);
  assert.deepEqual(worker.data,before,'friend profile cannot save casing');
  assert.equal(await page.locator('a[href^="/music/"]').textContent(),'LUH LEAKYZ Vol. 1');
  console.log('PASS: captured native album pairs, album/album-artist casing, combined changes, unchanged/mixed native pass-through, own-profile isolation and storage preservation');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
