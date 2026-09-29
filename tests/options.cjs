const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

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
    await page.evaluate(() => {
      window.saved = {
        settings: { username: 'DCCXX', infiniteScroll: true },
        rules: { artists: {
          '["dean blunt"]': { from: 'Dean Blunt', to: 'DEAN BLUNT' }
        }, albums: {}, tracks: {}, albumArtists: {} }
      };
      window.chrome = { storage: { local: {
        async get(keys) {
          return Object.fromEntries((Array.isArray(keys) ? keys : [keys])
            .map(key => [key, window.saved[key]]));
        },
        async set(values) { Object.assign(window.saved, structuredClone(values)); },
        async remove(key) { delete window.saved[key]; }
      }, onChanged: { addListener() {} } } };
    });
    await page.addScriptTag({ path: path.join(project, 'rules.js') });
    await page.addScriptTag({ path: path.join(project, 'options.js') });
    await page.waitForFunction(() => document.querySelectorAll('#rules tr').length === 1);
    await page.locator('#search').fill('no match');
    assert.equal(await page.locator('#rules tr').count(), 0);
    await page.locator('#search').fill('dean');
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('textbox', { name: 'Preferred name for Dean Blunt' })
      .fill('DeAn BlUnT');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    assert.equal(await page.evaluate(() =>
      window.saved.rules.artists['["dean blunt"]'].to), 'DeAn BlUnT');
    await page.getByRole('button', { name: 'Delete' }).click();
    assert.equal(await page.evaluate(() =>
      Object.keys(window.saved.rules.artists).length), 0);
    console.log('PASS: preference search, edit, delete');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
