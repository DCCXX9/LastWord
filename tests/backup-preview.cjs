const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const root = path.resolve(__dirname, '..');
const backup = username => ({ version: 1, settings: { username, infiniteScroll: true },
  rules: { artists: { '["artist"]': { from: 'Artist', to: username } }, albums: {}, tracks: {}, albumArtists: {} } });

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(fs.readFileSync(path.join(root, 'options.html'), 'utf8').replace(/<script[^>]*><\/script>/g, ''));
    const worker = await mockExtension(page, { settings: { username: 'DCCXX', infiniteScroll: true },
      rules: { artists: {}, albums: {}, tracks: {}, albumArtists: {} }, albumlessScanDraft: { pages: 93 } });
    await page.evaluate(() => {
      const add = EventTarget.prototype.addEventListener, text = File.prototype.text;
      window.importTasks = [];
      EventTarget.prototype.addEventListener = function (type, listener, ...args) {
        if (this.id === 'import-file' && type === 'change') {
          return add.call(this, type, event => { window.importTasks.push(listener(event)); }, ...args);
        }
        return add.call(this, type, listener, ...args);
      };
      File.prototype.text = async function () {
        if (this.name === 'slow.json') {
          window.slowStarted = true;
          await new Promise(resolve => { window.releaseFile = resolve; });
        }
        return text.call(this);
      };
    });
    await loadScripts(page, ['rules.js', 'store.js', 'options.js']);
    await page.waitForFunction(() => document.querySelector('#username').value === 'DCCXX');
    const upload = (name, content) => page.locator('#import-file').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(content) });
    await upload('slow.json', JSON.stringify(backup('OldProfile')));
    await page.waitForFunction(() => window.slowStarted);
    await upload('new.json', JSON.stringify(backup('NewProfile')));
    await page.evaluate(() => window.importTasks[1]);
    assert.match(await page.locator('#import-summary').textContent(), /NewProfile/);
    await page.evaluate(async () => { window.releaseFile(); await window.importTasks[0]; });
    assert.match(await page.locator('#import-summary').textContent(), /NewProfile/,
      'a slower earlier file must never replace the newer backup preview');
    assert.deepEqual(worker.data.rules.artists, {}, 'preview must never write preferences');
    await page.locator('#confirm-import').click();
    await page.waitForFunction(() => document.querySelector('#message').textContent === 'Backup imported.');
    assert.equal(worker.data.settings.username, 'NewProfile');
    assert.equal(worker.data.rules.artists['["artist"]'].to, 'NewProfile');

    await upload('slow.json', '{invalid JSON');
    await page.waitForFunction(() => window.importTasks.length === 3);
    await upload('new.json', JSON.stringify(backup('LatestProfile')));
    await page.evaluate(() => window.importTasks[3]);
    await page.locator('#cancel-import').click();
    await page.evaluate(async () => { window.releaseFile(); await window.importTasks[2]; });
    assert.equal(await page.locator('#message').textContent(), 'Backup imported.',
      'an obsolete invalid file must not replace feedback for the newer action');
    assert.equal(await page.locator('#import-preview').evaluate(node => node.open), false);
    assert.deepEqual(worker.data.albumlessScanDraft, { pages: 93 });
    console.log('PASS: newest backup selection owns its preview; stale reads/errors cannot replace it or write preferences');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
