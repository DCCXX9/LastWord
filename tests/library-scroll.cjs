const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const project = path.resolve(__dirname, '..');
const views = [
  '/user/DCCXX/library',
  '/user/DCCXX/library/scrobbles',
  '/user/DCCXX/library/albums',
  '/user/DCCXX/library/music/Ken+Carson',
  '/user/DCCXX/library/music/Ken+Carson/+tracks',
  '/user/DCCXX/library/music/Ken+Carson/+albums',
  '/user/DCCXX/library/music/+noredirect/Ken+Carson/+tracks',
  '/user/DCCXX/library/music/+noredirect/Ken+Carson/+albums'
];
const html = (number, hasNext) => `<!doctype html><body><main>
  <table class="chartlist"><tbody><tr class="chartlist-row">
    <td style="height:32px">Row ${number}</td></tr></tbody></table>
  <nav class="pagination">${hasNext
    ? '<a class="pagination-next" href="?page=2">Next</a>' : ''}</nav>
  </main></body>`;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox']
  });
  try {
    for (const view of views) {
      const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
      await page.route('https://www.last.fm/**', route => route.fulfill({
        contentType: 'text/html',
        body: html(route.request().url().includes('page=2') ? 2 : 1,
          !route.request().url().includes('page=2'))
      }));
      await page.goto('https://www.last.fm' + view);
      await page.evaluate(() => {
        window.storageListeners = [];
        window.chrome = { storage: {
          local: { get: async () => ({
            settings: { username: 'DCCXX', infiniteScroll: true }, rules: {}
          }) }, onChanged: { addListener(listener) {
            window.storageListeners.push(listener);
          } }
        } };
      });
      await page.addScriptTag({ path: path.join(project, 'rules.js') });
      await page.addScriptTag({ path: path.join(project, 'content.js') });
      await page.waitForFunction(() =>
        document.querySelectorAll('table.chartlist tr.chartlist-row').length === 2);
      assert.deepEqual((await page.locator('table.chartlist tr.chartlist-row')
        .allTextContents()).map(value => value.trim()),
        ['Row 1', 'Row 2']);
      assert.equal(await page.locator('nav.pagination').evaluate(el => el.hidden), true);
      await page.evaluate(() => window.storageListeners.forEach(listener => listener({
        settings: { newValue: { username: 'DCCXX', infiniteScroll: false } }
      }, 'local')));
      await page.waitForFunction(() =>
        document.querySelector('nav.pagination').hidden === false);
      await page.close();
    }
    const friend = await browser.newPage();
    let friendFetches = 0;
    await friend.route('https://www.last.fm/**', route => {
      if (route.request().url().includes('page=2')) friendFetches++;
      return route.fulfill({ contentType: 'text/html', body: html(1, true) });
    });
    await friend.goto('https://www.last.fm/user/Friend/library/albums');
    await friend.evaluate(() => {
      window.chrome = { storage: {
        local: { get: async () => ({
          settings: { username: 'DCCXX', infiniteScroll: true }, rules: {}
        }) }, onChanged: { addListener() {} }
      } };
    });
    await friend.addScriptTag({ path: path.join(project, 'rules.js') });
    await friend.addScriptTag({ path: path.join(project, 'content.js') });
    await friend.waitForTimeout(200);
    assert.equal(friendFetches, 0);
    assert.equal(await friend.locator('nav.pagination').evaluate(el => el.hidden), false);
    await friend.close();
    console.log('PASS: scrobbles, albums, artist tracks and artist albums keep scrolling');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
