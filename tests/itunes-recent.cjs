const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require('playwright');
const {libraryCache} = require('./harness.cjs');
const root = path.resolve(__dirname, '..');
const origin = 'https://www.last.fm';
const trackId = '["cochise","parlay"]';
const row = (title, href, artist = 'Cochise') => `<tr class="chartlist-row">
  <td class="chartlist-name"><a href="/music/${href}">${title}</a></td>
  <td class="chartlist-artist"><a href="/music/${artist}">${artist}</a></td></tr>`;
const html = '<main class="col-main"><table>' + [
  row('Parlay','Cochise/_/Parlay'), row('Parlay','Cochise/_/Parlay'),
  row('Only Plain (feat. Guest)','Cochise/_/Only+Plain+(feat.+Guest)'),
  row('Wrong artist','Other/_/Wrong+artist'), row('Ambiguous','Cochise/_/Ambiguous'),
  row('AMBIGUOUS','Cochise/_/Ambiguous'), row('Same','Cochise/_/Same')
].join('') + '</table></main>';
const xml = '<plist><dict><key>Tracks</key><dict>' +
  ['PARLAY','ONLY PLAIN','WRONG ARTIST','aMbIgUoUs','Same'].map((name,i) =>
    `<key>${i}</key><dict><key>Name</key><string>${name}</string><key>Artist</key><string>Cochise</string></dict>`
  ).join('') + '</dict></dict></plist>';

(async()=>{
  const browser = await chromium.launchPersistentContext('', {
    executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, headless:false,
    args:['--headless=new','--no-sandbox','--host-resolver-rules=MAP www.last.fm ~NOTFOUND',
      `--disable-extensions-except=${root}`,`--load-extension=${root}`]
  });
  try {
    const requests=[];
    await browser.route('**/*', route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.protocol==='chrome-extension:')return route.continue();
      requests.push([url.href,request.method()]);
      return url.href===origin+'/user/TestUser/library'
        ? route.fulfill({contentType:'text/html',body:html}) : route.abort();
    });
    const w=browser.serviceWorkers()[0]||await browser.waitForEvent('serviceworker');
    const base='chrome-extension://'+new URL(w.url()).host+'/';
    const cache=libraryCache('TestUser',[]);
    const before=cache.profiles.testuser;
    const jobs={testuser:{running:false,mode:'resume',waiting:'',error:''}};
    await w.evaluate(async ({cache,jobs})=>{
      for(let i=0;!chrome.storage&&i<100;i++)await new Promise(r=>setTimeout(r,25));
      await chrome.storage.local.set({settings:{username:'TestUser'},lfmLibraryCacheV1:cache,lfmLibraryJobsV1:jobs});
    },{cache,jobs});
    const page=await browser.newPage();await page.goto(base+'itunes.html');
    await page.locator('#step-xml').evaluate(e=>e.open=true);
    await page.locator('#xml-file:enabled').setInputFiles({name:'library.xml',mimeType:'application/xml',buffer:Buffer.from(xml)});
    await w.evaluate(()=>chrome.storage.local.set({lfmNetworkPause:{until:Date.now()+60000}}));
    await page.locator('#compare').click();
    await page.locator('#review').waitFor();
    assert.equal(await page.locator('#candidates tr').count(),0);
    assert.deepEqual(requests,[],'comparison respects an active Last.fm network pause');
    await w.evaluate(()=>chrome.storage.local.remove('lfmNetworkPause'));
    await page.locator('#step-xml').evaluate(e=>e.open=true);
    await page.locator('#compare').click();
    await page.locator('#review').waitFor();
    assert.deepEqual(await page.locator('#candidates tr').evaluateAll(rows=>rows.map(r=>[r.cells[2].textContent,r.cells[4].textContent])),[['Parlay','PARLAY']]);
    await page.locator('#apply').click();await page.locator('#confirm').click();
    await page.getByText('Complete — 1 display preferences saved.',{exact:true}).waitFor();
    const after=await w.evaluate(()=>chrome.storage.local.get(null));
    const saved=after.lfmLibraryCacheV1.profiles.testuser;
    assert.equal(after.rules.tracks[trackId].to,'PARLAY');
    assert.deepEqual(after.lfmLibraryJobsV1,jobs);
    assert.ok(saved.updatedAt>before.updatedAt,'cache import detects a changed snapshot');
    assert.deepEqual({...saved,updatedAt:before.updatedAt,groups:{...saved.groups,tracks:{...saved.groups.tracks,items:{}}}},before);
    assert.deepEqual(requests,[[origin+'/user/TestUser/library','GET']]);
    console.log('PASS: recent exact casing preview and save; no rebuild or server write');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
