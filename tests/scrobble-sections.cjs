const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const root = path.resolve(__dirname, '..');
const scripts = ['rules.js', 'store.js', 'adapter.js', 'pages.js', 'content.js'];
// Section/table/heading classes confirmed by the user's signed-in DOM inspection.
const section = (day, stamps) => `<section class="tracklist-section"><h2 class="date-heading">${day}</h2><table class="chartlist"><tbody>${stamps.map(stamp =>
  `<tr class="chartlist-row" data-test-stamp="${stamp}"><td style="height:36px"><a href="/music/Artist/_/Song+${stamp}">Song ${stamp}</a></td><td class="chartlist-timestamp"><time datetime="2026-10-01T00:00:${String(stamp).padStart(2, '0')}Z">${stamp}</time></td></tr>`).join('')}</tbody></table></section>`;
const html = (groups, next) => `<!doctype html><style>main{width:770px}table{width:100%}h2{font:16px Arial;color:#999}</style><main><div class="col-main">${groups.map(([day, stamps]) => section(day, stamps)).join('')}<nav class="pagination">${next ? `<a class="pagination-next" href="?page=${next}">Next</a>` : ''}</nav></div></main>`;

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
  try {
    for (const view of ['/library', '/library/music/Artist']) {
      const page = await browser.newPage();
      const pages = {
        1: html([['Today', [30]], ['Yesterday', [20, 19]]], 2),
        2: html([['Yesterday', [18]], ['2 Oct 2026', [10, 9]]], 3),
        3: html([['2 Oct 2026', [8]], ['1 Oct 2026', [5]]], null)
      };
      await page.route('https://www.last.fm/**', route => {
        const number = new URL(route.request().url()).searchParams.get('page') || 1;
        return route.fulfill({ contentType: 'text/html', body: pages[number] });
      });
      await page.goto('https://www.last.fm/user/DCCXX' + view);
      // Control loading through the public button so assertions don't depend on
      // the observer entering/leaving the viewport between rapid test requests.
      await page.evaluate(() => { window.IntersectionObserver = class { observe() {} disconnect() {} }; });
      const worker = await mockExtension(page);
      await loadScripts(page, scripts);
      await page.getByRole('button', { name: 'Load next page', exact: true }).waitFor();
      const lastInitialRow = page.locator('[data-test-stamp="19"]');
      const panel = page.locator('[data-lfm-ui="scroll"]');
      const initialPanelFollows = await panel.evaluate((panel, row) => Boolean(row.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING), await lastInitialRow.elementHandle());
      await page.getByRole('button', { name: 'Load next page', exact: true }).click();
      await page.getByText('1 more page loaded. Keep scrolling.', { exact: true }).waitFor();
      assert.deepEqual(await page.locator('[data-test-stamp]').evaluateAll(rows => rows.map(row => Number(row.dataset.testStamp))),
        [30, 20, 19, 18, 10, 9], 'every fetched day must follow the existing days in original page order');
      assert.ok(initialPanelFollows, 'loading panel must follow every initial date section');
      await page.getByRole('button', { name: 'Load next page', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('nav.pagination').hidden && document.querySelectorAll('[data-test-stamp]').length === 8);
      assert.deepEqual(await page.locator('[data-test-stamp]').evaluateAll(rows => rows.map(row => Number(row.dataset.testStamp))),
        [30, 20, 19, 18, 10, 9, 8, 5]);
      assert.deepEqual(await page.locator('.date-heading').allTextContents(), ['Today', 'Yesterday', '2 Oct 2026', '1 Oct 2026'], 'a day split across pages must keep one heading');
      assert.equal(await panel.count(), 0, 'the finished history must have no loading panel');
      assert.equal(await page.locator('[data-test-stamp] a').count(), 8, 'native row contents must survive');
      if (view === '/library') {
        fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
        await page.screenshot({ path: path.join(root, 'test-results', 'scrobble-sections.png'), fullPage: true });
      }
      await worker.externalSet({ settings: { username: 'DCCXX', infiniteScroll: false } });
      await page.waitForFunction(() => !document.querySelector('[data-lfm-ui="scroll"]') && !document.querySelector('nav.pagination').hidden);
      assert.equal(await page.locator('[data-test-stamp]').count(), 8, 'disabling must retain the complete loaded history');
      await page.close();
    }
    const page = await browser.newPage();
    let requested = 0, hideOlderDay = false;
    await page.route('https://www.last.fm/**', route => {
      const next = new URL(route.request().url()).searchParams.has('page');
      if (next) requested++;
      let body = next ? html([['Yesterday', [18]], ['2 Oct 2026', [10]]], null)
        : html([['Today', [30]], ['Yesterday', [20, 19]]], 2);
      if (next && hideOlderDay) body = body.replace('data-test-stamp="10"', 'data-test-stamp="10" style="display:none"');
      return route.fulfill({ contentType: 'text/html', body });
    });
    await page.goto('https://www.last.fm/user/DCCXX/library');
    await page.evaluate(() => { window.IntersectionObserver = class { observe() {} disconnect() {} }; });
    await mockExtension(page);
    await loadScripts(page, scripts);
    await page.getByRole('button', { name: 'Load next page', exact: true }).waitFor();
    await page.evaluate(() => {
      window.originalFrame = requestAnimationFrame;
      window.requestAnimationFrame = callback => { window.finishAppendFrame = callback; };
    });
    await page.getByRole('button', { name: 'Load next page', exact: true }).click();
    await page.waitForFunction(() => !!window.finishAppendFrame, null, { polling: 50, timeout: 3000 });
    await page.getByRole('button', { name: 'Pause loading', exact: true }).click();
    await page.evaluate(() => { requestAnimationFrame = window.originalFrame; window.finishAppendFrame(); });
    await page.waitForFunction(() => document.querySelector('[data-lfm-ui="scroll"]').dataset.state === 'paused', null, { timeout: 3000 });
    assert.deepEqual(await page.locator('[data-test-stamp]').evaluateAll(rows => rows.map(row => Number(row.dataset.testStamp))), [30, 20, 19], 'pausing during insertion must roll back all added date sections');
    hideOlderDay = true;
    await page.getByRole('button', { name: 'Resume loading', exact: true }).click();
    await page.getByRole('button', { name: 'Try again', exact: true }).waitFor();
    assert.equal(await page.locator('[data-test-stamp]').count(), 3, 'a hidden fetched day must roll back the entire page');
    assert.equal(await page.locator('nav.pagination').evaluate(nav => nav.hidden), false);
    hideOlderDay = false;
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('nav.pagination').hidden && document.querySelectorAll('[data-test-stamp]').length === 5);
    assert.equal(await page.locator('[data-lfm-ui="scroll"]').count(), 0, 'successful retry must also remove finished controls');
    assert.deepEqual(await page.locator('[data-test-stamp]').evaluateAll(rows => rows.map(row => Number(row.dataset.testStamp))), [30, 20, 19, 18, 10], 'retry must append the same complete page exactly once');
    assert.equal(requested, 3);
    await page.close();
    console.log('PASS: dated scrobble sections keep all rows in order, merge page-boundary days, and place loading after the complete history');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
