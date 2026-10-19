const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const scripts = ['rules.js', 'store.js', 'adapter.js', 'pages.js', 'content.js'];
const html = n => `<!doctype html><main><table class="chartlist"><tbody>
  <tr class="chartlist-row"><td style="height:32px">Row ${n}</td></tr></tbody></table>
  <nav class="pagination">${n < 3 ? `<a class="pagination-next" href="?page=${n + 1}">Next</a>` : ''}</nav></main>`;

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
  try {
    for (const transition of ['setting', 'profile']) {
      const page = await browser.newPage(), calls = [];
      await page.route('https://www.last.fm/**', route => {
        const n = Number(new URL(route.request().url()).searchParams.get('page') || 1);
        calls.push(n); return route.fulfill({ contentType: 'text/html', body: html(n) });
      });
      await page.goto('https://www.last.fm/user/DCCXX/library/albums');
      await page.evaluate(() => {
        window.IntersectionObserver = class { observe() {} disconnect() {} };
        let time = Date.now(); Date.now = () => time += 2000;
      });
      const worker = await mockExtension(page, { rules: { artists: {}, albums: {}, tracks: {}, albumArtists: {} },
        settings: { username: 'DCCXX', infiniteScroll: true }, albumlessScanDraft: { pages: 93 } });
      await page.evaluate(() => { chrome.runtime.onMessage.addListener = listener => { window.contentStatus = listener; }; });
      await loadScripts(page, scripts);
      const status = () => page.evaluate(() => new Promise(resolve => window.contentStatus({ type: 'lfm:status' }, {}, resolve)));
      const disable = async () => {
        await worker.externalSet({ settings: transition === 'setting'
          ? { username: 'DCCXX', infiniteScroll: false } : { username: 'Friend', infiniteScroll: true } });
        await page.waitForFunction(() => !document.querySelector('.lfm-scroll-status') && !document.querySelector('nav.pagination').hidden);
        assert.equal((await status()).scrollState, transition === 'setting' ? 'off' : 'unavailable');
      };
      const enable = () => worker.externalSet({ settings: { username: 'DCCXX', infiniteScroll: true } });
      await page.getByRole('button', { name: 'Yes', exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll('tr.chartlist-row').length === 2 &&
        document.querySelector('.lfm-scroll-status')?.dataset.state === 'prompt');
      await disable();
      assert.equal(await page.locator('tr.chartlist-row').count(), 2, 'disabling must retain loaded rows');
      await enable();
      await page.getByRole('button', { name: 'Yes', exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll('tr.chartlist-row').length === 3);
      assert.deepEqual(calls, [1, 2, 3], transition + ' reactivation must continue with the next unseen page');
      assert.deepEqual(await page.locator('tr.chartlist-row').allTextContents(), ['Row 1', 'Row 2', 'Row 3']);
      await page.waitForFunction(() => !document.querySelector('.lfm-scroll-status'));
      await disable(); await enable();
      await page.waitForFunction(() => document.querySelector('nav.pagination').hidden);
      assert.equal(await page.locator('.lfm-scroll-status').count(), 0, 'a completed view must remain complete after reactivation');
      assert.deepEqual(calls, [1, 2, 3]);
      assert.deepEqual(worker.data.albumlessScanDraft, { pages: 93 });
      await page.close();
    }
    for (const lateResult of ['success', 'failure']) {
      const page = await browser.newPage();
      await page.route('https://www.last.fm/**', route => route.fulfill({ contentType: 'text/html', body: html(1) }));
      await page.goto('https://www.last.fm/user/DCCXX/library/albums');
      const worker = await mockExtension(page, { settings: { username: 'DCCXX', infiniteScroll: true } });
      await loadScripts(page, scripts.slice(0, 3));
      await page.evaluate(() => {
        window.IntersectionObserver = class { observe() {} disconnect() {} };
        window.requests = [];
        // Deliberately settle after cancellation to exercise an obsolete callback.
        window.LastfmPages = {
          get: (url, { signal }) => new Promise((resolve, reject) => requests.push({ url, signal, resolve, reject })),
          status: () => ({ rateLimited: false }), resume: async () => {}
        };
      });
      await loadScripts(page, ['content.js']);
      const finish = (index, failure = false) => page.evaluate(({ index, failure, source }) => {
        const request = requests[index];
        if (failure) request.reject(new Error('Obsolete request failed.'));
        else request.resolve({ url: request.url, doc: new DOMParser().parseFromString(source, 'text/html') });
      }, { index, failure, source: html(index === 2 ? 3 : 2) });
      await page.getByRole('button', { name: 'Yes', exact: true }).click();
      await page.waitForFunction(() => requests.length === 1);
      await worker.externalSet({ settings: { username: 'DCCXX', infiniteScroll: false } });
      await page.waitForFunction(() => !document.querySelector('.lfm-scroll-status'));
      assert.equal(await page.evaluate(() => requests[0].signal.aborted), true);
      await worker.externalSet({ settings: { username: 'DCCXX', infiniteScroll: true } });
      await page.getByRole('button', { name: 'Resume loading', exact: true }).click();
      await page.waitForFunction(() => requests.length === 2);
      await finish(0, lateResult === 'failure');
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.locator('tr.chartlist-row').count(), 1, 'an obsolete response must not append rows');
      assert.equal(await page.getByRole('button', { name: 'Pause loading', exact: true }).count(), 1,
        'an obsolete result must not change the newer request status');
      await finish(1);
      await page.waitForFunction(() => document.querySelectorAll('tr.chartlist-row').length === 2 &&
        document.querySelector('.lfm-scroll-status')?.dataset.state === 'prompt');
      await page.getByRole('button', { name: 'Yes', exact: true }).click();
      await page.waitForFunction(() => requests.length === 3);
      await finish(2);
      await page.waitForFunction(() => !document.querySelector('.lfm-scroll-status'));
      assert.deepEqual(await page.locator('tr.chartlist-row').allTextContents(), ['Row 1', 'Row 2', 'Row 3']);
      assert.deepEqual(await page.evaluate(() => requests.map(r => new URL(r.url).searchParams.get('page'))), ['2', '2', '3']);
      await page.close();
    }
    console.log('PASS: scrolling reactivation preserves progress/completion; cancelled late successes and failures cannot replace newer work');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
