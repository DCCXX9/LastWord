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
    await page.setContent(fs.readFileSync(path.join(project, 'preferences.html'), 'utf8')
      .replace(/<script[^>]*><\/script>/g, ''));
    await page.addStyleTag({ path: path.join(project, 'extension-ui.css') });
    const worker = await mockExtension(page, {
      settings: { username: 'DCCXX', infiniteScroll: true },
      rules: { artists: { '["dean blunt"]': { from: 'Dean Blunt', to: 'DEAN BLUNT' } }, albums: {}, tracks: {}, albumArtists: {} },
      albumlessScanDraft: { pages: 93, found: [] }
    });
    await loadScripts(page, ['rules.js', 'store.js', 'preferences.js']);
    await page.waitForFunction(() => document.querySelectorAll('#rules tbody tr').length === 1);
    await page.locator('#search').fill('no match');
    assert.equal(await page.locator('#rules tbody tr').count(), 0);
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
    await page.waitForFunction(() => document.querySelectorAll('#rules tbody tr').length === 1 && document.querySelector('#rules').textContent.includes('SONG'));
    await page.locator('#type-filter').selectOption('');

    await worker.request('mutate', { operations: [
      { op: 'put', type: 'artists', from: 'Zebra', to: 'ZEBRA' },
      { op: 'put', type: 'artists', from: 'Alpha', to: 'ALPHA' },
      { op: 'put', type: 'albumArtists', from: 'Beta', to: 'BETA' },
      { op: 'put', type: 'albums', from: 'Zoo', to: 'ZOO', artist: 'Artist' },
      { op: 'put', type: 'albums', from: 'Apple', to: 'APPLE', artist: 'Artist' }
    ] });
    await page.waitForFunction(() => document.querySelectorAll('#rules-artists tr').length === 4);
    assert.deepEqual(await page.locator('#rules-artists tr td:nth-child(3)').allTextContents(), ['ALPHA', 'BETA', 'DEAN blunt', 'ZEBRA']);
    assert.deepEqual(await page.locator('#rules-albums tr td:nth-child(3)').allTextContents(), ['APPLE', 'ZOO']);
    await page.locator('#type-filter').selectOption('artists');
    assert.match(await page.locator('#rules-artists').innerText(), /Album artist/);
    await page.locator('#type-filter').selectOption('');
    // A queued worker save must not let another row replace the active draft.
    await page.evaluate(() => {
      const send = chrome.runtime.sendMessage;
      const gate = new Promise(resolve => { window.releaseSave = resolve; });
      chrome.runtime.sendMessage = async message => {
        if (message.action === 'mutate') await gate;
        return send(message);
      };
    });
    await page.locator('#rules-artists tr').filter({ hasText: 'ZEBRA' }).getByRole('button', { name: 'Edit', exact: true }).click();
    await page.locator('#preferred-edit').fill('ZeBrA');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    assert.equal(await page.locator('#preferred-edit').isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Cancel', exact: true }).isDisabled(), true);
    assert.equal(await page.locator('#rules button:not(:disabled)').count(), 0);
    await page.evaluate(() => window.releaseSave());
    await page.waitForFunction(() => !document.querySelector('#preferred-edit') && window.saved.rules.artists['["zebra"]'].to === 'ZeBrA');
    fs.mkdirSync(path.join(project, 'test-results'), { recursive: true });
    await page.setViewportSize({width:1180,height:1000});
    await page.screenshot({path:path.join(project,'test-results','preferences.png'),fullPage:true});

    await page.goto('about:blank');
    await page.setContent(fs.readFileSync(path.join(project, 'options.html'), 'utf8').replace(/<script[^>]*><\/script>/g, ''));
    await page.addStyleTag({ path: path.join(project, 'extension-ui.css') });
    await mockExtension(page, {}, { worker });
    await loadScripts(page, ['rules.js','store.js','options.js']);
    await page.waitForFunction(() => document.querySelector('#count').textContent.includes('preferences'));
    assert.equal(await page.locator('#rules, #search, #type-filter').count(),0,'main options has no preference list');
    assert.equal(await page.locator('a[href="preferences.html"]').count(),1);
    assert.equal(await page.locator('h1').innerText(), "LastWord for Last.fm");
    assert.equal(await page.locator('.page-header .eyebrow, #username-help, #activity-heading, #active-status').count(), 0);
    assert.equal(await page.locator('#troubleshooting').evaluate(e=>e.open), false);
    assert.match(await page.locator('[aria-labelledby="itunes-heading"]').innerText(), /Mass import your casing preferences from your iTunes\/Apple Music library\./);
    assert.equal(await page.getByLabel('Load more library pages as you scroll').count(), 1);
    assert.equal(await page.locator('a[href="itunes.html"]').count(),1,'redundant cache link removed');
    assert.equal(await page.locator('a[href="preferences.html"]').innerText(),'Manage preferences');
    assert.equal(await page.locator('a').evaluateAll(links=>links.every(a=>getComputedStyle(a).textDecorationLine==='none'&&getComputedStyle(a).backgroundColor!=='rgba(0, 0, 0, 0)')),true,'settings navigation uses green buttons');
    assert.equal(await page.locator('#redirects-help').evaluate(e=>Boolean(e.compareDocumentPosition(document.querySelector('#redirect-form'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);
    // Separate cards must not save or discard each other's unsaved drafts.
    await page.locator('#username').fill('UnsavedDraft');
    await page.getByLabel('Keep music links on their original pages').uncheck();
    await page.locator('#save-redirects').click();
    await page.locator('#redirect-note').filter({hasText:'Saved'}).waitFor();
    assert.equal(worker.data.settings.username, 'DCCXX');
    assert.equal(worker.data.settings.redirectProtection, false);
    assert.equal(await page.locator('#username').inputValue(), 'UnsavedDraft');
    await page.getByLabel('Keep music links on their original pages').check();
    await page.locator('#username').fill('DCCXX');await page.locator('#save-settings').click();
    await page.waitForFunction(()=>!document.querySelector('#save-settings').disabled);
    assert.equal(worker.data.settings.redirectProtection, false, 'profile save does not commit redirect draft');
    assert.equal(await page.locator('#redirects').isChecked(), true);
    await page.locator('#save-redirects').click();await page.locator('#redirect-note').filter({hasText:'Saved'}).waitFor();
    await page.evaluate(()=>{const send=chrome.runtime.sendMessage;chrome.runtime.sendMessage=async m=>{if(m.action==='settings'&&m.patch?.redirectProtection===false)throw Error('Storage unavailable');return send(m)}});
    await page.locator('#redirects').uncheck();await page.locator('#save-redirects').click();
    await page.locator('#redirect-note').filter({hasText:'Not saved'}).waitFor();
    assert.equal(worker.data.settings.redirectProtection, true, 'failure preserves saved setting');
    assert.equal(await page.locator('#redirects').isChecked(), false, 'failure keeps the draft');
    assert.equal(await page.locator('#redirects').isDisabled(), false);
    await page.locator('#redirects').check();
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), true);
    await page.setViewportSize({width:1180,height:1000});
    await page.screenshot({path:path.join(project,'test-results','options.png'),fullPage:true});

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
    await page.locator('#import-preview').waitFor({ state: 'visible' });
    // Closing the previous preview queues an event; it must not erase a new preview.
    await page.evaluate(() => document.querySelector('#import-preview').dispatchEvent(new Event('close')));
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
    await loadScripts(popup, ['version.js', 'rules.js', 'store.js', 'popup-status.js', 'popup.js']);
    await popup.waitForFunction(() => document.querySelector('#profile').textContent === 'DCCXX');
    assert.match(await popup.locator('.popup-footer').textContent(), /v0\.3\.5-test beta · Help · Privacy/);
    assert.equal(await popup.locator('#diagnostics').textContent(), 'Copy diagnostics');
    await popup.locator('#diagnostics').click();
    await popup.waitForFunction(() => window.copied);
    const diagnostics = JSON.parse(await popup.evaluate(() => window.copied));
    assert.equal(diagnostics.page.view, 'scrobbles');
    assert.equal('token' in diagnostics.page, false);
    assert.equal(diagnostics.configuredProfile, 'DCCXX');
    await popup.screenshot({ path: path.join(process.env.TEMP || '/tmp', 'lastfm-popup-polish.png') });
    await popup.close();
    console.log('PASS: separate grouped/sorted preferences, edit/undo conflicts, clean options, import/backup and popup');
  } catch (error) {
    console.error('Options state:', await page.evaluate(() => ({
      message: document.querySelector('#message')?.textContent,
      importOpen: document.querySelector('#import-preview')?.open,
      importSummary: document.querySelector('#import-summary')?.textContent
    })));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
