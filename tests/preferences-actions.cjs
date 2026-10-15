const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
  const failures = [];
  async function scenario(name, check) {
    const page = await browser.newPage();
    try {
      await page.goto('about:blank');
      await page.setContent(fs.readFileSync(path.join(root, 'preferences.html'), 'utf8').replace(/<script[^>]*><\/script>/g, ''));
      const worker = await mockExtension(page, { settings: { username: 'DCCXX', infiniteScroll: true },
        rules: { artists: Object.fromEntries(['Alpha', 'Beta'].map(from => [JSON.stringify([from.toLowerCase()]), { from, to: from.toUpperCase() }])),
          albums: {}, tracks: {}, albumArtists: {} }, albumlessScanDraft: { pages: 93 } });
      await loadScripts(page, ['rules.js', 'store.js', 'preferences.js']);
      await page.waitForFunction(() => document.querySelectorAll('#rules-artists tr').length === 2);
      const row = name => page.locator('#rules-artists tr').filter({ has: page.getByRole('cell', { name, exact: true }) });
      await check(page, worker, row);
      assert.deepEqual(worker.data.albumlessScanDraft, { pages: 93 });
    } catch (error) { failures.push(name); console.error(name + ':', error.message); }
    finally { await page.close(); }
  }
  try {
    await scenario('keyboard return', async (page, worker, row) => {
      await row('Alpha').getByRole('button', { name: 'Edit', exact: true }).click();
      await page.locator('#preferred-edit').press('Escape');
      assert.equal(await row('Alpha').getByRole('button', { name: 'Edit', exact: true }).evaluate(node => node === document.activeElement), true,
        'cancelling an edit must return keyboard focus to its row');
      await row('Alpha').getByRole('button', { name: 'Edit', exact: true }).click();
      await page.locator('#preferred-edit').fill('aLpHa');
      await page.locator('#preferred-edit').press('Enter');
      await page.waitForFunction(() => !document.querySelector('#preferred-edit'));
      assert.equal(worker.data.rules.artists['["alpha"]'].to, 'aLpHa');
      assert.equal(await row('Alpha').getByRole('button', { name: 'Edit', exact: true }).evaluate(node => node === document.activeElement), true,
        'saving an edit must return keyboard focus to its row');
      await row('Beta').getByRole('button', { name: 'Delete', exact: true }).focus();
      await worker.externalSet({ settings: { username: 'DCCXX', infiniteScroll: false } });
      await page.waitForFunction(() => window.testData.settings.infiniteScroll === false);
      // Wait for the subscribed read/redraw, not only the storage notification.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await row('Beta').getByRole('button', { name: 'Delete', exact: true }).evaluate(node => node === document.activeElement), true,
        'a change from another tab must preserve focus on an existing row action');
    });
    await scenario('serialized delete and undo', async (page, worker, row) => {
      await row('Alpha').getByRole('button', { name: 'Delete', exact: true }).click();
      await page.locator('#undo-area').waitFor({ state: 'visible' });
      await page.waitForFunction(() => !document.querySelector('#undo').disabled);
      assert.equal(await page.locator('#undo').evaluate(node => node === document.activeElement), true,
        'deletion must provide a useful keyboard destination');
      await page.evaluate(() => {
        const send = chrome.runtime.sendMessage;
        chrome.runtime.sendMessage = async message => {
          if (message.action === 'mutate') {
            window.mutationWaiting = true;
            await new Promise(resolve => { window.releaseMutation = resolve; });
          }
          return send(message);
        };
      });
      await row('Beta').getByRole('button', { name: 'Delete', exact: true }).click();
      await page.waitForFunction(() => window.mutationWaiting);
      assert.equal(await page.locator('#rules button:not(:disabled)').count(), 0, 'a pending delete must disable competing row mutations');
      assert.equal(await page.locator('#undo').isDisabled(), true, 'undo must wait for the pending deletion');
      await page.evaluate(() => document.querySelector('#undo').click());
      await page.evaluate(() => window.releaseMutation());
      await page.waitForFunction(() => !document.querySelector('#rules-artists tr') && !document.querySelector('#undo').disabled);
      assert.deepEqual(worker.data.rules.artists, {}, 'disabled undo must not recreate the previous deletion');
      // Release subsequent calls immediately.
      await page.evaluate(() => {
        const send = chrome.runtime.sendMessage;
        chrome.runtime.sendMessage = message => {
          const promise = send(message); window.releaseMutation?.(); return promise;
        };
      });
      await page.locator('#undo').click();
      await page.waitForFunction(() => document.querySelector('#rules-artists tr') && document.querySelector('#undo-area').hidden);
      assert.deepEqual(Object.keys(worker.data.rules.artists), ['["beta"]'], 'undo restores only the most recent deletion');
      assert.equal(await row('Beta').getByRole('button', { name: 'Edit', exact: true }).evaluate(node => node === document.activeElement), true,
        'undo must return keyboard focus to the restored row');
    });
    await scenario('pending delete controls', async (page, worker, row) => {
      await page.evaluate(() => {
        const send = chrome.runtime.sendMessage;
        chrome.runtime.sendMessage = async message => {
          if (message.action === 'mutate') await new Promise(resolve => { window.releaseMutation = resolve; });
          return send(message);
        };
      });
      await row('Alpha').getByRole('button', { name: 'Delete', exact: true }).click();
      await page.waitForFunction(() => window.releaseMutation);
      assert.equal(await page.locator('#rules button:not(:disabled)').count(), 0,
        'delete must use the same busy guard as save');
      await page.locator('#search').fill('Beta');
      await page.evaluate(() => window.releaseMutation());
      await page.waitForFunction(() => document.querySelector('#undo-area').hidden === false);
      assert.equal(await page.locator('#search').evaluate(node => node === document.activeElement), true,
        'finishing a mutation must not steal focus from a newer search');
    });
  } finally { await browser.close(); }
  assert.deepEqual(failures, [], 'all preference action scenarios must pass');
  console.log('PASS: preference keyboard focus, serialized delete/undo, latest-deletion restore and newer-search focus');
})().catch(error => { console.error(error); process.exitCode = 1; });
