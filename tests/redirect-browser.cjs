const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const row = (artist, name, n, raw = artist, albumArtist = raw) => `<tr class="chartlist-row"><td class="chartlist-name"><a href="/music/${artist}/_/${name}">${name}</a></td>
  <td class="chartlist-artist"><a href="/music/${artist}">${artist}</a></td><td class="chartlist-album"><a href="/music/${artist}/Album">Album ${name}</a></td><td class="chartlist-image"><a href="/music/Unrelated/Other">Related ${name}</a></td><td><form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track">
  <input name="artist_name" value="${raw}"><input name="track_name" value="${name}"><input name="album_name" value="Album"><input name="album_artist_name" value="${albumArtist}"><input name="timestamp" value="${1700000100-n}"><input name="csrfmiddlewaretoken" value="fixture-token"></form></td></tr>`;
const html = (n = 1) => `<!doctype html><main><table class="chartlist"><tbody>${row('Lucki','Song'+n,n)}
 ${n === 1 ? row('Lucky+Twice','Native',2,'Lucki') + row('Lucky+Twice','Genuine',3,'Lucky Twice') + row('Canonical','Verified',4,'Original','Compilation Artist') : ''}</tbody></table>
 ${n < 3 ? `<nav class="pagination"><a class="pagination-next" href="/user/DCCXX/library/music/Lucki/+tracks?page=${n+1}">Next</a></nav>` : ''}
 <a id="travis" href="/music/Travis+Scott/Album?x=1#tracks"><img alt="Cover" src="https://lastfm-img.freetls.fastly.net/i/u/64s/abcdef0123456789abcdef0123456789.jpg"></a>
 <a id="gallery" href="/music/Lucki/+images/abc">Gallery</a><a id="friend" href="/user/Friend/library/music/Lucki">Friend library</a>
 <a id="unrelated" href="/music/Other">Other</a><a id="generic-album" href="/music/Radiohead/OK+Computer">Album</a><a id="generic-song" href="/music/Bj%C3%B6rk/_/J%C3%B3ga">Song</a></main>`;

(async () => {
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
 const profile=fs.mkdtempSync(path.join(root,'test-results','redirect-profile-'));
 const browser=await chromium.launchPersistentContext(profile,{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  headless:false,args:['--headless=new','--no-sandbox',`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 try {
  const calls=[], errors=[];
  await browser.route('https://www.last.fm/**', route => {
   const url=new URL(route.request().url());calls.push({path:url.pathname,method:route.request().method()});
   if(url.pathname.includes('/get-wrong')) return route.fulfill({status:302,headers:{location:'/user/DCCXX/library/music/Lucky+Twice/+tracks'}});
   if(url.pathname.includes('/edit-track')) return route.fulfill({contentType:'text/html',body:'<!doctype html><p>Saved fixture only</p>'});
   return route.fulfill({contentType:'text/html',body:html(Number(url.searchParams.get('page')||1))});
  });
  await browser.route('https://lastfm-img.freetls.fastly.net/**',r=>r.abort());
  const worker=browser.serviceWorkers()[0]||await browser.waitForEvent('serviceworker');
  const extensionId=new URL(worker.url()).host;
  const data={settings:{username:'DCCXX',infiniteScroll:true},rules:{artists:{},albums:{},tracks:{},albumArtists:{}},
   itunesImportUndo:{preserve:'sentinel'},albumlessScanDraft:{page:94}};
  await worker.evaluate(data=>chrome.storage.local.set(data),data);
  const page=await browser.newPage();page.setDefaultTimeout(10000);
  const cdp=await browser.newCDPSession(page);await cdp.send('Runtime.enable');
  cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));
  await page.goto('https://www.last.fm/user/DCCXX/library/music/Lucki/+tracks');
  const protectedLink='/music/+noredirect/Lucki/_/Song1';
  await page.locator(`a[href="https://www.last.fm${protectedLink}"]`).waitFor();
  assert.equal(await page.locator('#travis').getAttribute('href'),'https://www.last.fm/music/+noredirect/Travis+Scott/Album?x=1#tracks');
  assert.equal(await page.getByRole('link',{name:'Native',exact:true}).getAttribute('href'),'https://www.last.fm/music/+noredirect/Lucki/_/Native');
  assert.equal(await page.getByRole('link',{name:'Genuine',exact:true}).getAttribute('href'),'https://www.last.fm/music/+noredirect/Lucky+Twice/_/Genuine');
  assert.equal(await page.locator('#friend').getAttribute('href'),'/user/Friend/library/music/Lucki');
  assert.equal(await page.locator('#gallery').getAttribute('href'),'/music/Lucki/+images/abc');
  assert.equal(await page.getByRole('link',{name:'Verified',exact:true}).getAttribute('href'),'https://www.last.fm/music/+noredirect/Original/_/Verified');
  assert.equal(await page.locator('#generic-album').getAttribute('href'),'https://www.last.fm/music/+noredirect/Radiohead/OK+Computer');
  assert.equal(await page.locator('#generic-song').getAttribute('href'),'https://www.last.fm/music/+noredirect/Bj%C3%B6rk/_/J%C3%B3ga');
  assert.equal(await page.getByRole('link',{name:'Album Verified',exact:true}).getAttribute('href'),'https://www.last.fm/music/+noredirect/Compilation+Artist/Album','album links use the original album artist');
  assert.equal(await page.getByRole('link',{name:'Related Verified',exact:true}).getAttribute('href'),'https://www.last.fm/music/+noredirect/Unrelated/Other','related cover links do not inherit row identity');
  const nativeBefore=await page.locator('form[data-edit-scrobble]').evaluateAll(forms=>forms.map(f=>f.outerHTML));
  assert.deepEqual(await worker.evaluate(()=>chrome.storage.local.get(null)),data,'redirect startup performs no user data writes');

  // This exercises the real manifest, shared request queue and scroll append.
  await page.getByRole('button',{name:'Yes',exact:true}).click();
  await page.getByRole('link',{name:'Song2',exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelector('a[href$="/_/Song2"]')?.href.includes('/+noredirect/Lucki/'));
  assert.ok(calls.some(c=>c.path==='/user/DCCXX/library/music/+noredirect/Lucki/+tracks'),'pagination fetch bypasses correction');
  await page.getByRole('button',{name:'Yes',exact:true}).click();
  await page.getByRole('link',{name:'Song3',exact:true}).waitFor();
  assert.deepEqual((await page.locator('form[data-edit-scrobble]').evaluateAll(forms=>forms.map(f=>f.outerHTML))).slice(0,4),nativeBefore,'raw edit forms are never rewritten');

  // Options changes apply to existing rows immediately and restore exact hrefs.
  const options=await browser.newPage();await options.goto(`chrome-extension://${extensionId}/options.html`);
  await options.getByLabel('Keep music links on their original pages',{exact:true}).uncheck();
  await options.getByRole('button',{name:'Save redirect settings',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#travis').getAttribute('href')==='/music/Travis+Scott/Album?x=1#tracks');
  assert.equal(await page.getByRole('link',{name:'Native',exact:true}).getAttribute('href'),'/music/Lucky+Twice/_/Native');
  await options.getByLabel('Keep music links on their original pages',{exact:true}).check();
  await options.getByRole('button',{name:'Save redirect settings',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#travis').href.includes('/+noredirect/'));
  // A Last.fm hydration update must replace the remembered href, not resurrect it.
  await page.locator('#travis').evaluate(a=>a.setAttribute('href','/music/Other'));
  await options.getByLabel('Keep music links on their original pages',{exact:true}).uncheck();
  await options.getByRole('button',{name:'Save redirect settings',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('a[href="/music/Lucki/_/Song1"]'));
  assert.equal(await page.locator('#travis').getAttribute('href'),'/music/Other');
  await options.getByLabel('Keep music links on their original pages',{exact:true}).check();
  await options.getByRole('button',{name:'Save redirect settings',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('a[href$="/_/Song1"]').href.includes('/+noredirect/'));

  // Public protected pages keep their downstream navigation protected; genuine
  // Lucky Twice retains its identity; other people's libraries remain native.
  await page.goto('https://www.last.fm/music/+noredirect/Lucki');
  await page.locator('#travis').filter({has:page.locator('img')}).waitFor();
  await page.waitForFunction(()=>document.querySelector('#travis').href.includes('/+noredirect/'));
  await page.getByRole('link',{name:'Cover',exact:true}).click();
  await page.waitForURL('**/music/+noredirect/Travis+Scott/Album?x=1#tracks');
  await page.goto('https://www.last.fm/user/Friend/library');
  assert.equal(await page.locator('#travis').getAttribute('href'),'/music/Travis+Scott/Album?x=1#tracks');
  await page.goto('https://www.last.fm/music/Drug+Church');
  await page.waitForFunction(()=>document.querySelector('#unrelated').href.includes('/+noredirect/Other'));
  assert.equal(await page.getByRole('link',{name:'Verified',exact:true}).getAttribute('href'),'https://www.last.fm/music/+noredirect/Canonical/_/Verified','public pages have no own-row identity authority');
  const saved=await worker.evaluate(()=>chrome.storage.local.get(null));
  assert.deepEqual(saved.itunesImportUndo,data.itunesImportUndo);assert.deepEqual(saved.albumlessScanDraft,data.albumlessScanDraft);
  assert.deepEqual(saved.rules,data.rules);assert.deepEqual(errors,[]);
  console.log('PASS: actual unpacked redirect protection, native alias evidence, scroll pages 2/3, public navigation, live opt-out/restore, friend isolation and unchanged native forms/storage');
 } finally {await browser.close();fs.rmSync(profile,{recursive:true,force:true,maxRetries:5});}
})().catch(error=>{console.error(error);process.exitCode=1;});
