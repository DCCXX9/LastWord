const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');

const project = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('about:blank');
    await page.setContent(fs.readFileSync(path.join(project, 'options.html'), 'utf8')
      .replace(/<script[^>]*><\/script>/g, ''));
    await page.addStyleTag({ path: path.join(project, 'extension-ui.css') });
    const worker = await mockExtension(page, {
      settings: { username: 'DCCXX', infiniteScroll: true },
      rules: { artists: { '["dean blunt"]': { from: 'Dean Blunt', to: 'DEAN BLUNT' } }, albums: {}, tracks: {}, albumArtists: {} },
      albumlessScanDraft: { pages: 93, found: [] }
    });
    await loadScripts(page, ['rules.js', 'store.js', 'options.js']);
    await page.waitForFunction(() => document.querySelectorAll('#rules tr').length === 1);
    await page.locator('#search').fill('no match');
    assert.equal(await page.locator('#rules tr').count(), 0);
    await page.locator('#search').fill('dean');
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('textbox', { name: 'Preferred name for Dean Blunt' })
      .fill('DeAn BlUnT');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForFunction(() => window.saved.rules.artists['["dean blunt"]'].to === 'DeAn BlUnT');
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.waitForFunction(() => Object.keys(window.saved.rules.artists).length === 0);
    await page.getByRole('button', { name: 'Undo delete' }).click();
    await page.waitForFunction(() => window.saved.rules.artists['["dean blunt"]']?.to === 'DeAn BlUnT');

    // A Last.fm tab changes the same preference while an options draft is open.
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.locator('#preferred-edit').fill('my unsaved draft');
    await worker.request('mutate', { operations: [{ op: 'put', type: 'artists', from: 'Dean Blunt', to: 'Dean BLUNT' }] });
    await page.waitForFunction(() => document.querySelector('.conflict'));
    assert.equal(await page.locator('#preferred-edit').inputValue(), 'my unsaved draft');
    assert.equal(await page.getByRole('button', { name: 'Save', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(worker.data.rules.artists['["dean blunt"]'].to, 'Dean BLUNT');

    // Undo must never overwrite a preference recreated elsewhere.
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForFunction(() => Object.keys(window.saved.rules.artists).length === 0);
    await worker.request('mutate', { operations: [{ op: 'put', type: 'artists', from: 'Dean Blunt', to: 'DEAN blunt' }] });
    await page.getByRole('button', { name: 'Undo delete' }).click();
    await page.waitForFunction(() => document.querySelector('#message').dataset.tone === 'error');
    assert.equal(worker.data.rules.artists['["dean blunt"]'].to, 'DEAN blunt');

    await worker.request('mutate', { operations: [{ op: 'put', type: 'tracks', from: 'Song', to: 'SONG', artist: 'Artist' }] });
    await page.locator('#search').fill('');
    await page.locator('#type-filter').selectOption('tracks');
    await page.waitForFunction(() => document.querySelectorAll('#rules tr').length === 1 && document.querySelector('#rules').textContent.includes('SONG'));
    await page.locator('#type-filter').selectOption('');

    const backup = { version: 1, settings: { username: 'DCCXX', infiniteScroll: false },
      rules: { artists: { '["imported"]': { from: 'Imported', to: 'IMPORTED' } }, albums: {}, tracks: {}, albumArtists: {} } };
    const upload = () => page.locator('#import-file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await upload();
    await page.locator('#import-preview').waitFor({ state: 'visible' });
    assert.match(await page.locator('#import-summary').innerText(), /1 display preferences for DCCXX/);
    assert.ok(worker.data.rules.tracks['["artist","song"]'], 'preview does not mutate storage');
    await worker.request('mutate', { operations: [{ op: 'put', type: 'artists', from: 'New', to: 'NEW' }] });
    await page.locator('#confirm-import').click();
    await page.waitForFunction(() => document.querySelector('#message').textContent.includes('Preferences changed'));
    assert.ok(worker.data.rules.artists['["new"]'], 'stale import must not discard newer rules');
    await upload();
    await page.locator('#confirm-import').click();
    await page.waitForFunction(() => document.querySelector('#message').textContent === 'Backup imported.');
    assert.deepEqual(worker.data.rules, backup.rules);
    assert.equal(worker.data.albumlessScanDraft.pages, 93, 'legacy scan progress retained');

    // Export fetches the current worker data, including retained unknown keys.
    await page.evaluate(() => {
      URL.createObjectURL = blob => { blob.text().then(text => { window.exported = JSON.parse(text); }); return 'blob:test'; };
      HTMLAnchorElement.prototype.click = function () {};
    });
    await page.locator('#export').click();
    await page.waitForFunction(() => window.exported);
    const exported = await page.evaluate(() => window.exported);
    assert.deepEqual(exported.rules, worker.data.rules);
    assert.equal(exported.extraStorage.albumlessScanDraft.pages, 93);
    await page.screenshot({ path: path.join(process.env.TEMP || '/tmp', 'lastfm-options-polish.png'), fullPage: true });

    // Popup reports actual content status and provides only allowlisted diagnostics.
    const popup = await browser.newPage();
    await popup.goto('about:blank');
    await popup.setContent(fs.readFileSync(path.join(project, 'popup.html'), 'utf8').replace(/<script[^>]*><\/script>/g, ''));
    await popup.addStyleTag({ path: path.join(project, 'extension-ui.css') });
    await mockExtension(popup, {}, { worker });
    await popup.evaluate(() => {
      window.chrome.runtime.getManifest = () => ({ version: '0.3.5-test' });
      window.chrome.runtime.openOptionsPage = async () => {};
      window.chrome.tabs = { query: async () => [{ id: 1 }], sendMessage: async () => ({
        ownProfile: true, username: 'DCCXX', view: 'scrobbles', scrollState: 'idle', rateLimited: false, version: '0.3.5-test', token: 'not-for-diagnostics' }) };
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.copied = text; } } });
    });
    await loadScripts(popup, ['rules.js', 'store.js', 'popup.js']);
    await popup.waitForFunction(() => document.querySelector('#active-status').textContent === 'Active on DCCXX');
    await popup.locator('#diagnostics').click();
    await popup.waitForFunction(() => window.copied);
    const diagnostics = JSON.parse(await popup.evaluate(() => window.copied));
    assert.equal(diagnostics.page.view, 'scrobbles');
    assert.equal('token' in diagnostics.page, false);
    assert.equal(diagnostics.configuredProfile, 'DCCXX');
    await popup.screenshot({ path: path.join(process.env.TEMP || '/tmp', 'lastfm-popup-polish.png') });
    await popup.close();
    console.log('PASS: options search/filter, edit conflicts, undo conflicts, import preview/concurrency, fresh backup, popup status and safe diagnostics');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
