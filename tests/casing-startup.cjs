const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const html = '<a href="/music/Artist/_/Song">Song</a>';
const rules = to => ({artists:{},albums:{},albumArtists:{},tracks:{'["artist","song"]':{from:'Song',to,artist:'Artist'}}});
(async () => {
  const browser = await chromium.launch({headless:true,
    executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
  try {
    const page = await browser.newPage();
    await page.route('**/*', r => r.fulfill({contentType:'text/html',body:html}));
    await page.goto('https://www.last.fm/user/DCCXX/library/tracks');
    const initial = {settings:{username:'DCCXX'},rules:rules('SONG'),lfmLibraryCacheV1:{preserve:'large cache'},itunesImportUndo:{preserve:'undo'}};
    const worker = await mockExtension(page,initial,{artworkLookups:false});
    await page.evaluate(() => {
      const send = chrome.runtime.sendMessage;
      chrome.runtime.sendMessage = m => m.action === 'read' ? new Promise(() => {}) : send(m);
      const get = chrome.storage.local.get;
      window.displayReads = [];
      chrome.storage.local.get = keys => { displayReads.push(keys); return get(keys); };
    });
    await loadScripts(page,['rules.js','store.js','adapter.js','content.js']);
    await page.getByRole('link',{name:'SONG',exact:true}).waitFor({timeout:3000});
    assert.deepEqual(await page.evaluate(() => displayReads),[['settings','rules']], 'display startup must not load library cache or wait for the writer');
    assert.deepEqual(worker.data,initial,'display startup never writes saved records');
    await page.evaluate(() => {history.pushState({},'', '/user/Friend/library/tracks');dispatchEvent(new PopStateEvent('popstate'));});
    assert.equal(await page.locator('a').textContent(),'Song','foreign profiles retain native names');
    assert.equal(await page.locator('a').getAttribute('style'),null,'startup never hides names or changes their styling');
    await page.close();

    const race = await browser.newPage();
    await race.route('**/*',r=>r.fulfill({contentType:'text/html',body:html}));
    await race.goto('https://www.last.fm/user/DCCXX/library/tracks');
    const newer = await mockExtension(race,{settings:{username:'DCCXX'},rules:rules('SONG')},{artworkLookups:false});
    await race.evaluate(() => {
      const get = chrome.storage.local.get;
      chrome.storage.local.get = keys => {
        if(Array.isArray(keys)&&keys.join(',')==='settings,rules')
          return get(keys).then(value => new Promise(resolve => { window.releaseDisplay = () => resolve(value); }));
        return get(keys);
      };
    });
    await loadScripts(race,['rules.js','store.js','adapter.js','content.js']);
    await race.waitForFunction(()=>!!window.releaseDisplay);
    await newer.externalSet({rules:rules('song')});
    await race.getByRole('link',{name:'song',exact:true}).waitFor();
    await race.evaluate(()=>releaseDisplay());
    await race.waitForTimeout(50);
    assert.equal(await race.locator('a').textContent(),'song','a late initial read cannot replace a newer committed preference');
    console.log('PASS: casing starts while the worker is busy, reads only display keys, preserves all data/styles, isolates profiles and rejects stale initial state');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
