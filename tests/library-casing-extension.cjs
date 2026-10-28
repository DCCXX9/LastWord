const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const origin = 'https://www.last.fm';
const encode = value => encodeURIComponent(value).replace(/%20/g, '+');
const item = n => '/music/Artist/_/' + encode('Song ' + n);
const row = n => `<tr class="chartlist-row" style="height:48px"><td>${n}</td><td class="chartlist-name"><a href="${item(n)}">Song ${n}</a></td></tr>`;
const list = page => `<!doctype html><main class="col-main"><a id="artist" href="/music/Artist">Artist</a><a id="album" href="/music/Artist/Album">Album</a><table class="chartlist"><tbody>${Array.from({length:page===1?50:10},(_,i)=>row((page-1)*50+i+1)).join('')}</tbody></table><nav class="pagination">${page===1?'<a class="pagination-next" href="?page=2">Next</a>':''}</nav></main>`;
(async () => {
  fs.mkdirSync(path.join(root, 'test-results'), {recursive:true});
  const profile = fs.mkdtempSync(path.join(root, 'test-results', 'casing-extension-'));
  const browser = await chromium.launchPersistentContext(profile, {
    executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, headless:false,
    args:['--headless=new', '--no-sandbox', `--disable-extensions-except=${root}`, `--load-extension=${root}`]
  });
  const requests = [], errors = [];
  browser.on('page', p => p.on('pageerror', e => errors.push(e.message)));
  await browser.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.protocol === 'chrome-extension:') return route.continue();
    requests.push(url.href);
    if (url.origin === origin) return route.fulfill({contentType:'text/html', body:list(Number(url.searchParams.get('page') || 1))});
    return route.abort();
  });
  try {
    const worker = browser.serviceWorkers()[0] || await browser.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host, setupUrl = `chrome-extension://${id}/options.html`;
    let setup; const deadline = Date.now()+10000;
    while (!(setup=browser.pages().find(p=>p.url()===setupUrl)) && Date.now()<deadline) await new Promise(r=>setTimeout(r,25));
    assert.ok(setup, 'fresh-install setup should be ready before seeding the isolated fixture');
    await setup.locator('#profile-status').filter({hasText:'Not connected'}).waitFor();
    const seed = {settings:{username:'DCCXX',infiniteScroll:true}, rules:{artists:{},albums:{},tracks:{},albumArtists:{}},
      legacyScan:{page:93}, lfmAlbumlessV1:{fixture:'preserve'}, lfmPersonalArtworkCacheV1:[]};
    await worker.evaluate(data=>chrome.storage.local.set(data), seed);
    const importer = await browser.newPage();
    await importer.goto(`chrome-extension://${id}/preferences.html`);
    await importer.locator('a[href="itunes.html"]').click();
    await importer.waitForFunction(()=>!document.querySelector('#xml-file').disabled);
    const xml = '<plist><dict><key>Tracks</key><dict>'+Array.from({length:60},(_,i)=>
      `<key>${i+1}</key><dict><key>Name</key><string>sOnG ${i+1}</string><key>Artist</key><string>aRTIST</string><key>Album</key><string>aLbUm</string><key>Location</key><string>file:///private/music.mp3</string></dict>`).join('')+'</dict></dict></plist>';
    await importer.locator('#xml-file').setInputFiles({name:'Reviewed Library.xml',mimeType:'application/xml',buffer:Buffer.from(xml)});
    await importer.locator('#review').waitFor({state:'visible'});
    assert.equal(await importer.locator('#selected-count').textContent(), '62 selected');
    assert.deepEqual(await worker.evaluate(()=>chrome.storage.local.get(null)),seed,'scanning writes nothing');
    assert.deepEqual(requests,[],'XML import does not contact Last.fm or any external host');
    await importer.locator('#search').fill('Song 60');
    await importer.locator('#select-albums').uncheck();
    await importer.locator('#select-artists').uncheck();
    assert.equal(await importer.locator('#selected-count').textContent(), '60 selected');
    await importer.locator('#select-artists').check();
    await importer.locator('#select-albums').check();
    await importer.locator('#apply').click();
    await importer.locator('#confirm').click();
    await importer.getByText('62 display preferences applied.',{exact:true}).waitFor();
    const stored = await worker.evaluate(()=>chrome.storage.local.get(null));
    assert.equal(Object.keys(stored.rules.tracks).length,60);
    assert.equal(stored.rules.tracks['["artist","song 60"]'].to,'sOnG 60');
    assert.equal(JSON.stringify(stored).includes('private/music'),false);
    assert.deepEqual(stored.legacyScan,seed.legacyScan);
    assert.deepEqual(stored.lfmAlbumlessV1,seed.lfmAlbumlessV1);
    const own = await browser.newPage();
    await own.goto(origin+'/user/DCCXX/library/tracks');
    await own.locator('#artist').filter({hasText:'aRTIST'}).waitFor();
    assert.equal(await own.locator('#album').textContent(),'aLbUm');
    await own.locator('.chartlist-name a').last().filter({hasText:'sOnG 50'}).waitFor();
    await own.locator('tr.chartlist-row').last().scrollIntoViewIfNeeded();
    await own.locator('[data-lfm-ui="scroll"]').screenshot({path:path.join(root,'test-results','scroll-consent-panel.png')});
    await own.getByRole('button',{name:'Yes',exact:true}).click();
    await own.waitForFunction(()=>document.querySelectorAll('tr.chartlist-row').length===60);
    assert.equal(await own.locator('.chartlist-name a').last().textContent(),'sOnG 60','imported rules apply to real infinite-scroll rows');
    const friend = await browser.newPage();
    await friend.goto(origin+'/user/Friend/library/tracks');
    assert.equal(await friend.locator('#artist').textContent(),'Artist');
    assert.equal(await friend.locator('.chartlist-name a').first().textContent(),'Song 1');
    await importer.evaluate(()=>LastfmStore.mutate([{op:'put',type:'tracks',from:'Song 1',to:'Later preference',artist:'Artist'}]));
    await importer.reload();
    await importer.locator('#revert').click();
    await importer.locator('#confirm').click();
    await importer.getByText('61 preferences reverted; 1 later changes kept.',{exact:true}).waitFor();
    await own.bringToFront();
    await own.locator('#artist').filter({hasText:'Artist'}).waitFor();
    assert.equal(await own.locator('.chartlist-name a').last().textContent(),'Song 60');
    assert.equal(await own.locator('.chartlist-name a').first().textContent(),'Later preference');
    const reverted = await worker.evaluate(()=>chrome.storage.local.get(null));
    assert.deepEqual(reverted.legacyScan,seed.legacyScan);
    assert.deepEqual(reverted.lfmAlbumlessV1,seed.lfmAlbumlessV1);
    assert.deepEqual(errors,[]);
    await importer.locator('#xml-file').setInputFiles({name:'Reviewed Library.xml',mimeType:'application/xml',buffer:Buffer.from(xml)});
    await importer.locator('#review').waitFor({state:'visible'});
    await importer.setViewportSize({width:1280,height:1000});
    await importer.screenshot({path:path.join(root,'test-results','library-casing-review.png'),fullPage:true});
    console.log('PASS: actual unpacked XML import, all-library field selection, exact names on initial/infinite rows, friend isolation, persistent revert and preserved later edits/legacy records');
  } finally {await browser.close();fs.rmSync(profile,{recursive:true,force:true,maxRetries:5});}
})().catch(error=>{console.error(error);process.exitCode=1;});
