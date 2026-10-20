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
    const page = await browser.newPage();
    const calls = [];
    await page.route('https://www.last.fm/**', route => {
      const n = Number(new URL(route.request().url()).searchParams.get('page') || 1);
      calls.push(n);
      return route.fulfill({ contentType: 'text/html', body: html(n) });
    });
    await page.goto('https://www.last.fm/user/DCCXX/library/albums');
    await page.evaluate(() => {
      window.IntersectionObserver = class { observe() {} disconnect() {} };
      let time = Date.now(); Date.now = () => time += 2000;
    });
    const worker = await mockExtension(page, { settings:{username:'DCCXX',infiniteScroll:true}, albumlessScanDraft: { pages: 93 } });
    await loadScripts(page, scripts);
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('tr.chartlist-row').length === 2 &&
      document.querySelector('.lfm-scroll-status')?.dataset.state === 'prompt');
    const restore = () => page.evaluate(() => {
      dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
      dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    await restore();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('tr.chartlist-row').length === 3);
    assert.deepEqual(calls, [1, 2, 3], 'a restored browser-history page must continue from page three, not repeat page two');
    assert.deepEqual(await page.locator('tr.chartlist-row').allTextContents(), ['Row 1', 'Row 2', 'Row 3']);
    await page.waitForFunction(() => !document.querySelector('.lfm-scroll-status'));
    await restore();
    assert.equal(await page.locator('.lfm-scroll-status').count(), 0, 'restoring a completed view must retain its completed state');
    assert.deepEqual(calls, [1, 2, 3]);
    await worker.externalSet({ settings: { username: 'DCCXX', infiniteScroll: false } });
    await page.waitForFunction(() => !document.querySelector('nav.pagination').hidden);
    assert.deepEqual(worker.data.albumlessScanDraft, { pages: 93 });
    await page.close();

    const pending = await browser.newPage();
    let release, attempts = 0;
    await pending.route('https://www.last.fm/**', async route => {
      const n = Number(new URL(route.request().url()).searchParams.get('page') || 1);
      if (n === 2 && ++attempts === 1) await new Promise(resolve => { release = resolve; });
      try { await route.fulfill({ contentType: 'text/html', body: html(n) }); }
      catch (error) { if (!route.request().failure()) throw error; }
    });
    await pending.goto('https://www.last.fm/user/DCCXX/library/albums');
    await pending.evaluate(() => {
      window.IntersectionObserver = class { observe() {} disconnect() {} };
      let time = Date.now(); Date.now = () => time += 2000;
    });
    await mockExtension(pending, {settings:{username:'DCCXX',infiniteScroll:true}});
    await loadScripts(pending, scripts);
    const requested = pending.waitForRequest(request => request.url().includes('page=2'));
    await pending.getByRole('button', { name: 'Yes', exact: true }).click();
    await requested;
    await pending.evaluate(() => {
      dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
      dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    await pending.getByRole('button', { name: 'Resume loading', exact: true }).waitFor();
    release();
    assert.equal(await pending.locator('tr.chartlist-row').count(), 1, 'a cancelled history-cache request must not append its late response');
    await pending.getByRole('button', { name: 'Resume loading', exact: true }).click();
    await pending.waitForFunction(() => document.querySelectorAll('tr.chartlist-row').length === 2);
    assert.equal(attempts, 2, 'resume retries the cancelled next page once');
    assert.deepEqual(await pending.locator('tr.chartlist-row').allTextContents(), ['Row 1', 'Row 2']);
    await pending.close();
    console.log('PASS: cached history preserves pagination/order/completion; pending requests abort and resume without duplicates');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
