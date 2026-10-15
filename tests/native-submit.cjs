const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
(async () => {
 const browser = await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const page=await browser.newPage();
  await page.route('https://www.last.fm/**',r=>r.fulfill({body:r.request().url().includes('/_/') ? `<table><tr><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Artist"><input name="track_name" value="Song"><input name="timestamp" value="1700000000"><button type="submit">Edit</button></form></td></tr></table>` : `<table><tr class="chartlist-row"><td class="chartlist-name"><a href="/music/Artist/_/Song">Song</a></td><td><ul class="chartlist-more-menu"><li>Existing action</li></ul></td></tr></table>`}));
  await page.goto('https://www.last.fm/user/DCCXX/library/music/Artist/Album');
  const worker=await mockExtension(page,{settings:{username:'DCCXX',infiniteScroll:false}});
  page.on('dialog',d=>d.accept());
  await page.evaluate(()=>{
   document.addEventListener('submit',e=>{
    e.preventDefault();
    if(!e.target.matches('[data-edit-scrobble]')) {window.realEdits=(window.realEdits||0)+1;return;}
    window.delegated = true;
    const modal=document.createElement('div');modal.className='popup_content';
    modal.innerHTML='<form method="post" action="/user/DCCXX/library/edit-track">'+['artist_name','track_name','album_name','album_artist_name'].map((name,i)=>['_original',''].map(s=>'<input name="'+name+s+'" value="'+(['Artist','Song','',''][i])+'">').join('')).join('')+'<button type="submit">Save Edit</button></form>';
    document.body.append(modal);
   });
  });
  await loadScripts(page,['rules.js','store.js','adapter.js','pages.js','native-edit.js']);
  await page.getByRole('button',{name:'Edit track',exact:true}).click();
  await page.waitForFunction(()=>window.delegated===true,null,{timeout:2500});
  await page.locator('.popup_content [name="track_name"]').fill('SONG');
  await page.locator('.popup_content form').evaluate(f=>f.requestSubmit());
  await page.waitForFunction(()=>document.querySelector('[data-lfm-case-confirmation]'),null,{timeout:1500});
  assert.equal(await page.evaluate(()=>window.realEdits||0),0,'requestSubmit and keyboard submissions of casing-only changes must stay local');
  assert.equal(worker.data.rules.tracks['["artist","song"]'].to,'SONG');
  await page.locator('.popup_content [name="track_name"]').fill('Remix');
  await page.locator('.popup_content form').evaluate(f=>f.requestSubmit());
  assert.equal(await page.evaluate(()=>window.realEdits),1,'real edits continue through Last.fm without rewriting their submission');
  console.log('PASS: omitted blank fields open native dialog, submit-event casing isolation and normal edit pass-through');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
