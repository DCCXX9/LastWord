const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
(async () => {
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const page=await browser.newPage();page.setDefaultTimeout(8000);
  const calls=[];
  await page.route('https://www.last.fm/**',r=>{
   const url=new URL(r.request().url());calls.push({url:url.href,method:r.request().method(),body:r.request().postData()});
   if(url.pathname.endsWith('/get-wrong'))return r.fulfill({status:302,headers:{location:'/user/DCCXX/library/music/Lucky+Twice/+tracks'}});
   return r.fulfill({contentType:'text/html',body:`<!doctype html><table><tr class="chartlist-row"><td class="chartlist-name"><a href="/music/Lucki/_/Song">Song</a></td><td><ul class="chartlist-more-menu"></ul><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Lucki"><input name="track_name" value="Song"><input name="timestamp" value="1700000000"><input name="csrfmiddlewaretoken" value="fixture-token"><button type="submit">Native edit</button></form></td></tr></table>`});
  });
  await page.goto('https://www.last.fm/user/DCCXX/library/music/Lucki/Album');
  const worker=await mockExtension(page,{settings:{username:'DCCXX',infiniteScroll:false}});
  await page.evaluate(()=>{let t=Date.now();Date.now=()=>t+=10000;});
  await loadScripts(page,['rules.js','store.js','adapter.js','redirects.js','pages.js','native-edit.js']);
  const result=await page.evaluate(async()=>{
   const album=await LastfmPages.getAlbum('/music/Lucki/Album');
   let error;
   try{await LastfmPages.get('/user/DCCXX/library/music/Lucki/get-wrong');}catch(e){error=e.message;}
   return {album:album.url,error};
  });
  assert.equal(result.album,'https://www.last.fm/music/+noredirect/Lucki/Album');
  assert.match(result.error,/different artist/,'a bad response cannot enter the library even if the server ignores the bypass');
  await page.evaluate(()=>document.addEventListener('submit',event=>{
   event.preventDefault();window.delegated=[...new FormData(event.target)];
  }));
  page.on('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Edit track',exact:true}).click();
  await page.waitForFunction(()=>window.delegated);
  assert.equal(await page.evaluate(()=>Object.fromEntries(window.delegated).artist_name),'Lucki');
  assert.equal(calls.some(c=>c.method==='POST'),false,'opening native editing delegates without a network write');
  // Only this isolated fixture submits a POST, to verify the read guard leaves
  // Last.fm's exact native action and fields alone. No real service is contacted.
  await page.evaluate(()=>LastfmPages.edit(document.querySelector('form[data-edit-scrobble]')));
  const post=calls.find(c=>c.method==='POST');
  assert.equal(post.url,'https://www.last.fm/user/DCCXX/library/edit-track');
  assert.equal(new URLSearchParams(post.body).get('artist_name'),'Lucki');
  assert.equal(new URLSearchParams(post.body).get('csrfmiddlewaretoken'),'fixture-token');
  await worker.request('settings',{patch:{redirectProtection:false}});
  await page.evaluate(()=>LastfmPages.getAlbum('/music/Travis+Scott/Album'));
  assert.equal(calls.at(-1).url,'https://www.last.fm/music/Travis+Scott/Album');
  console.log('PASS: artwork reads use the bypass, wrong-artist responses stop, native editing keeps exact action/fields, opt-out retains native requests');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
