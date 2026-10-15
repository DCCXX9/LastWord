const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(fs.readFileSync(path.join(root, 'options.html'), 'utf8').replace(/<script[^>]*><\/script>/g, ''));
    const worker = await mockExtension(page, { settings: { username: 'DCCXX', infiniteScroll: true },
      rules: { artists: {}, albums: {}, tracks: {}, albumArtists: {} }, albumlessScanDraft: { pages: 93 } });
    await loadScripts(page, ['rules.js', 'store.js', 'options.js']);
    await page.waitForFunction(() => document.querySelector('#username').value === 'DCCXX');
    await page.evaluate(() => {
      const send = chrome.runtime.sendMessage;
      const gate = new Promise(resolve => { window.releaseSave = resolve; });
      chrome.runtime.sendMessage = async message => {
        if (message.action === 'settings') await gate;
        return send(message);
      };
    });
    await page.locator('#username').fill('FirstDraft');
    await page.locator('#infinite').uncheck();
    await page.locator('#save-settings').click();
    await page.waitForFunction(() => document.querySelector('#save-settings').disabled);
    await page.locator('#username').fill('NewerDraft');
    await page.locator('#infinite').check();
    await page.evaluate(() => window.releaseSave());
    await page.waitForFunction(() => !document.querySelector('#save-settings').disabled);
    assert.equal(worker.data.settings.username, 'FirstDraft', 'only the submitted settings are saved');
    assert.equal(worker.data.settings.infiniteScroll, false);
    assert.equal(await page.locator('#username').inputValue(), 'NewerDraft', 'finishing a save must retain newer unsaved typing');
    assert.equal(await page.locator('#infinite').isChecked(), true, 'retain newer unsaved checkbox changes too');
    assert.match(await page.locator('#settings-note').textContent(), /Unsaved/);
    await page.locator('#save-settings').click();
    await page.waitForFunction(() => !document.querySelector('#save-settings').disabled);
    assert.equal(worker.data.settings.username, 'NewerDraft');
    assert.equal(worker.data.settings.infiniteScroll, true);
    assert.equal(await page.locator('#settings-note').textContent(), '');
    assert.deepEqual(worker.data.albumlessScanDraft, { pages: 93 });
    assert.deepEqual(worker.data.rules, { artists: {}, albums: {}, tracks: {}, albumArtists: {} });
    console.log('PASS: settings saves preserve newer unsaved text and checkbox changes, subsequent saves and unrelated storage');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
