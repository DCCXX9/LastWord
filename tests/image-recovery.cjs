const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const cdn = 'https://lastfm-img.freetls.fastly.net/i/u/';
const drug = '6696583a8c279d9b0534d98d51140fe8';
const album = 'c9873a741eb6a4aec138657e09b99489';
const dead = 'dddddddddddddddddddddddddddddddd';
const old = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const newer = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const offscreen = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const flaky = 'ffffffffffffffffffffffffffffffff';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=', 'base64');
const image = (hash, size = 'avatar70s') => cdn + size + '/' + hash + '.jpg';
const row = (hash, name, href, extra = '') => `<tr class="chartlist-row"><td class="chartlist-image"><a href="${href}"><img id="${hash}" width="34" height="34" alt="${name}" title="Native title" src="${image(hash)}" ${extra}></a></td><td class="chartlist-name"><a href="${href}">${name}</a></td></tr>`;
(async () => {
  fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
  const profile = fs.mkdtempSync(path.join(root, 'test-results', 'image-recovery-profile-'));
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, headless: false,
    args: ['--headless=new', '--no-sandbox', `--disable-extensions-except=${root}`, `--load-extension=${root}`]
  });
  let releaseHeld;
  try {
    const calls = [], imageCalls = [], errors = [];
    let flakyLoads = 0;
    let held;
    await context.route('**/*', async route => {
      const u = new URL(route.request().url());
      if (u.protocol === 'chrome-extension:') return route.continue();
      calls.push(u.href);
      if (u.hostname === 'lastfm-img.freetls.fastly.net') {
        imageCalls.push({ url: u.href, page: route.request().frame().url() });
        if (u.pathname.includes(old) && u.pathname.includes('300x300')) {
          held = true; await new Promise(resolve => { releaseHeld = resolve; });
        }
        const fails = !u.pathname.includes(newer) && (u.pathname.includes('avatar70s') || u.pathname.includes('/64s/') ||
          u.pathname.includes(dead) || u.pathname.includes(album) && u.pathname.includes('300x300') ||
          u.pathname.includes(flaky) && u.pathname.includes('300x300') && ++flakyLoads > 1);
        return route.fulfill(fails ? { status: 404, body: 'Missing derivative' } : { contentType: 'image/png', body: png }).catch(() => {});
      }
      if (u.hostname !== 'www.last.fm') return route.abort();
      if(u.pathname==='/music/Drug+Church') return route.fulfill({contentType:'text/html',body:`<main class="col-main"><table class="chartlist">${row(drug,'Drug Church','/music/Drug+Church')}${row(album,'One','/music/Drug+Church/_/One')}</table></main>`});
      if (u.pathname === '/user/DCCXX/library/music/Drug+Church/Hygiene') return route.fulfill({ contentType: 'text/html', body:
        `<!doctype html><main class="col-main"><header class="library-header"><span class="library-header-image"><img width="70" height="70" src="${image(album)}"></span><a href="/music/Drug+Church/Hygiene">Go to album page</a></header><table class="chartlist"><tbody>${row(newer, 'Track one', '/music/Drug+Church/_/One')}${row(newer, 'Track two', '/music/Drug+Church/_/Two')}</tbody></table></main>` });
      const page = Number(u.searchParams.get('page') || 1);
      return route.fulfill({ contentType: 'text/html', body: `<!doctype html><style>td{height:40px}img{object-fit:cover;border-radius:50%}</style><main class="col-main"><table class="chartlist"><tbody>${page === 1 ?
        row(drug, 'Drug Church', '/music/Drug+Church') + row(album, 'Hygiene', '/music/Drug+Church/Hygiene', `srcset="${image(album, '64s')} 1x" data-srcset="${image(album, '64s')} 1x"`) :
        row(dead, 'Unavailable', '/music/Other') + row(drug, 'Drug Church again', '/music/Drug+Church')}
        </tbody></table>${page === 1 ? '<nav class="pagination"><a class="pagination-next" href="?page=2">Next</a></nav>' : ''}</main>` });
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    await worker.evaluate(() => chrome.storage.local.set({ settings: { username: 'DCCXX', infiniteScroll: true },
      legacyScan: { keep: 42 }, lfmXmlUndoV1: { keep: true } }));
    await worker.evaluate(cover=>chrome.storage.local.set({lfmPersonalArtworkCacheV1:[{key:JSON.stringify(['dccxx','drug church','one']),username:'DCCXX',item:{artist:'Drug Church',name:'One'},checkedAt:Date.now(),cover}]}),{artist:'Drug Church',album:'Hygiene',image:image(album,'64s'),url:'https://www.last.fm/music/Drug+Church/Hygiene',fallback:false,sourceVersion:3,scanned:1,total:1});
    const saved = await worker.evaluate(() => chrome.storage.local.get(['settings','legacyScan','lfmXmlUndoV1']));
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('https://www.last.fm/user/DCCXX/library/artists');
    await page.waitForFunction(hash => {
      const img = document.getElementById(hash);
      return img.naturalWidth > 0 && img.src.includes('/300x300/');
    }, drug, { timeout: 2500 });
    await page.waitForFunction(hash => document.getElementById(hash).naturalWidth > 0 && document.getElementById(hash).src.includes('/ar0/'), album);
    assert.equal(await page.locator('[id="' + drug + '"]').getAttribute('alt'), 'Drug Church');
    assert.equal(await page.locator('[id="' + drug + '"]').getAttribute('title'), 'Native title');
    assert.equal(await page.locator('[id="' + drug + '"]').evaluate(i => i.closest('a').getAttribute('href')), '/music/Drug+Church');
    assert.equal(await page.locator('[id="' + drug + '"]').evaluate(i => getComputedStyle(i).borderRadius), '50%');
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('tr.chartlist-row').length === 4);
    await page.waitForFunction(hash => [...document.querySelectorAll('img')].filter(i => i.id === hash).every(i => i.naturalWidth > 0), drug);
    await page.waitForTimeout(250);
    assert.equal(calls.filter(u => u.includes(dead) && /\/(300x300|ar0)\//.test(u)).length, 2, 'unavailable originals have exactly two bounded alternatives');
    assert.ok(calls.filter(u => u.includes(drug) && u.includes('300x300')).length <= 3, 'scroll-added duplicate reuses the verified source with only its normal image load');
    await page.locator('[id="' + drug + '"]').first().evaluate(i => { i.srcset = i.dataset.srcset = i.src.replace('/300x300/', '/avatar70s/') + ' 1x'; });
    await page.waitForFunction(hash => document.getElementById(hash).currentSrc.includes('/300x300/') && document.getElementById(hash).naturalWidth > 0, drug);
    await page.locator('tbody').evaluate((body, html) => body.insertAdjacentHTML('beforeend', html), row(old, 'Changed preference', '/music/Other'));
    for (let n = 0; n < 80 && !held; n++) await page.waitForTimeout(25);
    assert.ok(held, 'candidate probe started');
    await page.locator('[id="' + old + '"]').evaluate((i, src) => { i.src = src; i.dataset.src = src; }, image(newer, '64s'));
    releaseHeld();
    await page.waitForTimeout(150);
    assert.equal(await page.locator('[id="' + old + '"]').getAttribute('src'), image(newer, '64s'), 'late recovery must not overwrite a newly selected image');
    assert.equal(calls.filter(u => u.includes(newer) && /\/(300x300|ar0)\//.test(u)).length, 0, 'healthy native images are left alone');
    await page.locator('tbody').evaluate((body, html) => body.insertAdjacentHTML('beforeend', html), row(flaky, 'Transient visible failure', '/music/Other'));
    await page.waitForFunction(hash => document.getElementById(hash).naturalWidth > 0 && document.getElementById(hash).src.includes('/ar0/'), flaky);
    await page.locator('main').evaluate((main, html) => main.insertAdjacentHTML('beforeend', '<div style="height:3000px"></div><table><tbody>' + html + '</tbody></table>'), row(offscreen, 'Offscreen', '/music/Other'));
    await page.waitForTimeout(150);
    assert.equal(calls.filter(u => u.includes(offscreen) && /\/(300x300|ar0)\//.test(u)).length, 0, 'offscreen failures do not start extra requests');
    await page.locator('[id="' + offscreen + '"]').scrollIntoViewIfNeeded();
    await page.waitForFunction(hash => document.getElementById(hash).naturalWidth > 0, offscreen);
    await page.goto('https://www.last.fm/user/DCCXX/library/music/Drug+Church/Hygiene');
    await page.waitForFunction(hash => [...document.querySelectorAll('.chartlist-image img, .library-header-image img')].every(i => i.naturalWidth > 0 && i.src.includes('/ar0/' + hash)), album);
    const personalCalls = calls.length;
    await page.waitForTimeout(250);
    assert.equal(calls.length, personalCalls, 'personal-cover and recovery observers must settle without a source rewrite loop');
    assert.equal(await page.locator('.chartlist-image img').first().getAttribute('title'), 'Personal cover: Hygiene (this album view)');
    assert.equal(await page.locator('.chartlist-image a').first().getAttribute('href'), 'https://www.last.fm/music/Drug+Church/Hygiene');
    await page.screenshot({ path: path.join(root, 'test-results', 'v094-recovered-album.png') });
    const state = await worker.evaluate(() => chrome.storage.local.get(['settings', 'legacyScan', 'lfmXmlUndoV1']));
    assert.deepEqual(state, saved, 'recovery preserves settings, legacy scans and undo');
    await page.goto('https://www.last.fm/music/Drug+Church');
    await page.waitForFunction(({drug,album})=>document.getElementById(drug)?.naturalWidth>0&&document.getElementById(album)?.naturalWidth>0&&document.getElementById(album)?.src.includes('/ar0/'),{drug,album});
    assert.equal(await page.locator('[id="'+album+'"]').evaluate(i=>i.closest('a').href),'https://www.last.fm/music/Drug+Church/Hygiene','public personal covers and derivative recovery must settle on the same selected image and album link');
    const beforeFriend = imageCalls.length;
    await page.goto('https://www.last.fm/user/Friend/library/artists');
    await page.waitForTimeout(200);
    assert.equal(imageCalls.slice(beforeFriend).filter(call => call.page.includes('/user/Friend/') && /\/(300x300|ar0)\//.test(call.url)).length, 0, 'friend profiles remain native');
    assert.equal(await page.locator('[id="' + drug + '"]').getAttribute('src'), image(drug));
    assert.deepEqual(errors, []);
    console.log('PASS: real unpacked startup failures, artist/album derivatives, srcset, scroll append, personal-cover coexistence, bounded missing-image retries, stale preference protection and own-profile isolation');
  } finally { releaseHeld?.(); await context.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
