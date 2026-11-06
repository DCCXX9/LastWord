const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
  const profile = fs.mkdtempSync(path.join(root, 'test-results', 'startup-profile-'));
  const browser = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, headless: false,
    args: ['--headless=new', '--no-sandbox', `--disable-extensions-except=${root}`, `--load-extension=${root}`]
  });
  let release;
  try {
    let held;
    const heldRequest = new Promise(resolve => { held = resolve; });
    const blocked = new Promise(resolve => { release = resolve; });
    await browser.route('https://www.last.fm/**', async route => {
      if (route.request().url().endsWith('/hold.js')) {
        held(); await blocked;
        return route.fulfill({ contentType: 'text/javascript', body: '' });
      }
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><head><script src="/hold.js"></script></head><body><a href="/music/Bladee">Bladee</a></body>' });
    });
    let worker = browser.serviceWorkers()[0] || await browser.waitForEvent('serviceworker');
    await worker.evaluate(() => chrome.storage.local.set({
      settings: { username: 'DCCXX', infiniteScroll: true },
      rules: { artists: { '["bladee"]': { from: 'Bladee', to: 'BLADEE' } }, albums: {}, tracks: {}, albumArtists: {} }
    }));
    const before = await worker.evaluate(() => chrome.storage.local.get(null));
    const page = await browser.newPage();
    const session = await browser.newCDPSession(page);
    await session.send('Runtime.enable');
    const exceptions = [];
    session.on('Runtime.exceptionThrown', event => exceptions.push(event.exceptionDetails.exception?.description || event.exceptionDetails.text));
    const navigation = page.goto('https://www.last.fm/user/dccxx', { waitUntil: 'load' });
    await heldRequest;
    // Reload after document_start has passed, before document_idle can execute.
    const restarted = browser.waitForEvent('serviceworker');
    await worker.evaluate(() => chrome.runtime.reload()).catch(() => {});
    worker = await restarted;
    release();
    await navigation;
    await page.waitForTimeout(500);
    assert.deepEqual(exceptions, [], 'extension Reload during navigation must not leave idle scripts without dependencies');
    // Reload invalidates existing worlds and can omit document_idle entirely.
    // The supported update flow includes refreshing the Last.fm page afterward.
    // A reloaded worker handle can refer to its invalidated execution world.
    // Read the durable snapshot through a fresh extension page instead.
    const snapshot = await browser.newPage();
    await snapshot.goto(new URL('popup.html', worker.url()).href);
    assert.deepEqual(await snapshot.evaluate(() => chrome.storage.local.get(null)), before, 'startup must preserve every saved storage key');
    await snapshot.close();
    await page.reload();
    await page.getByRole('link', { name: 'BLADEE', exact: true }).waitFor({ timeout: 3000 });
    assert.deepEqual(exceptions, [], 'ordinary navigation must not initialize feature scripts twice');
    console.log('PASS: Reload during navigation has no dependency crash; the required page refresh activates features and preserves all preferences');
  } finally { release?.(); await browser.close(); fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
