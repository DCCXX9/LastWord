const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');

// Reconstructed fixtures use action/field names the user read from signed-in
// Last.fm. Native event delegation is simulated, not a live-site verification.
const albumUrl = 'https://www.last.fm/user/DCCXX/library/music/Dean+Blunt/Zushi';
const trackUrl = 'https://www.last.fm/user/DCCXX/library/music/Dean+Blunt/_/11';
const album = `<!doctype html><body><h1 class="library-header-title">Zushi</h1>
  <table><tbody><tr class="chartlist-row"><td class="chartlist-name"><a href="/music/Dean+Blunt/Zushi/11">11</a><span>(2:13)</span></td><td>
  <ul class="chartlist-more-menu"><li><a href="${trackUrl}">Go to track in library</a></li><li>Existing action</li></ul>
  </td></tr></tbody></table></body>`;
const track = (albumName = 'Zushi', trackName = '11', next = '') => `<!doctype html><body>
  <h1 class="library-header-title">11</h1><table><tbody><tr class="chartlist-row"><td>
  <form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track">
    <input name="csrfmiddlewaretoken" value="fixture-token">
    <input name="track_name" value="${trackName}"><input name="artist_name" value="Dean Blunt">
    <input name="album_name" value="${albumName}"><input name="album_artist_name" value="Dean Blunt">
    <input name="timestamp" value="1700000000"><button type="submit">Edit scrobble</button>
  </form></td></tr></tbody></table>${next ? `<nav class="pagination"><a class="pagination-next" href="?page=${next}">Next</a></nav>` : ''}</body>`;
const scripts = ['rules.js', 'adapter.js', 'store.js', 'pages.js', 'content.js', 'native-edit.js'];
const data = { settings: { username: 'DCCXX', infiniteScroll: false }, rules: {
  artists: {}, albums: { '["dean blunt","zushi"]': { from: 'Zushi', to: 'ZUSHI', artist: 'Dean Blunt' } },
  tracks: { '["dean blunt","11"]': { from: '11', to: 'ELEVEN', artist: 'Dean Blunt' } }, albumArtists: {} } };

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  try {
    let mode = 'match';
    const fetched = [];
    await page.route('https://www.last.fm/**', route => {
      const url = new URL(route.request().url());
      const history = url.pathname.includes('/_/11');
      if (history) fetched.push(url.href);
      route.fulfill({ contentType: 'text/html', body: history
        ? track(mode === 'alternative' ? 'Other Album' : 'Zushi', mode === 'missing' ? 'Other Track' : '11',
          mode === 'missing' ? Number(url.searchParams.get('page') || 1) + 1 : '') : album });
    });
    await page.goto(albumUrl);
    const worker = await mockExtension(page, data);
    await page.evaluate(() => {
      document.addEventListener('submit', event => {
        event.preventDefault();
        if (!event.target.matches('form[data-edit-scrobble]')) { window.realEditSubmitted = true; return; }
        const values = Object.fromEntries(new FormData(event.target));
        window.nativeEditOpened = values.track_name;
        window.nativeEditAlbum = values.album_name;
        document.querySelectorAll('.popup_content').forEach(node => node.remove());
        const popup = document.createElement('div'); popup.className = 'popup_content';
        const form = document.createElement('form'); form.method = 'post';
        form.action = '/user/DCCXX/library/edit-track';
        for (const name of ['track_name', 'artist_name', 'album_name', 'album_artist_name']) {
          for (const suffix of ['_original', '']) {
            const input = document.createElement('input'); input.name = name + suffix; input.value = values[name];
            form.append(input);
          }
        }
        const submit = document.createElement('button'); submit.type = 'submit'; submit.name = 'submit';
        submit.textContent = 'Save Edit'; form.append(submit); popup.append(form); document.body.append(popup);
      });
    });
    await loadScripts(page, scripts);
    await page.waitForFunction(() => document.querySelector('h1').textContent === 'ZUSHI');
    assert.equal(await page.locator('.chartlist-name').textContent(), '11 (2:13)');
    const edit = page.getByRole('button', { name: 'Edit track', exact: true });
    await edit.waitFor();
    assert.equal(await page.locator('.chartlist-more-menu li').first().textContent(), 'Edit track');
    await page.locator('.chartlist-more-menu').evaluate(menu => menu.append(menu.firstElementChild));
    await page.waitForFunction(() => document.querySelector('.chartlist-more-menu li')?.textContent === 'Edit track');
    assert.equal(await edit.count(), 1);
    await edit.click();
    await page.waitForFunction(() => window.nativeEditOpened === '11');
    assert.equal(fetched[0], trackUrl);
    assert.equal(await page.evaluate(() => window.nativeEditAlbum), 'Zushi');
    assert.equal(await page.locator('iframe').count(), 0);
    assert.equal(page.url(), albumUrl);

    await page.locator('.popup_content [name="album_name"]').fill('ZUSHI');
    await page.getByRole('button', { name: 'Save Edit', exact: true }).click();
    await page.locator('[data-lfm-local-toast][data-kind="success"]').waitFor();
    assert.equal(await page.evaluate(() => Boolean(window.realEditSubmitted)), false);
    assert.equal(worker.data.rules.albums['["dean blunt","zushi"]'].to, 'ZUSHI');
    await page.locator('.popup_content [name="track_name"]').fill('Eleven (Remix)');
    await page.getByRole('button', { name: 'Save Edit', exact: true }).click();
    assert.equal(await page.evaluate(() => window.realEditSubmitted), true);
    assert.equal(worker.data.rules.tracks['["dean blunt","11"]'].to, 'ELEVEN');

    mode = 'alternative';
    let accept = false;
    const prompts = [];
    page.on('dialog', async dialog => { prompts.push(dialog.message()); if (accept) await dialog.accept(); else await dialog.dismiss(); });
    await page.evaluate(() => { window.nativeEditAlbum = null; });
    await edit.click();
    await page.waitForFunction(() => document.querySelector('[data-lfm-track-action] button')?.disabled === false);
    assert.match(prompts[0], /tagged “Other Album”/);
    assert.equal(await page.evaluate(() => window.nativeEditAlbum), null);
    accept = true;
    await edit.click();
    await page.waitForFunction(() => window.nativeEditAlbum === 'Other Album');

    mode = 'missing';
    const before = fetched.length;
    await edit.click();
    await page.locator('[data-lfm-local-toast][data-kind="error"]').waitFor();
    assert.equal(fetched.length - before, 3);
    assert.match(await page.locator('[data-lfm-local-toast]').textContent(), /up to 3/);
    await page.waitForTimeout(50);
    assert.equal(fetched.length - before, 3);
    await worker.externalSet({ settings: { username: 'Friend', infiniteScroll: false } });
    await page.waitForFunction(() => !document.querySelector('[data-lfm-track-action]'));
    assert.equal(await page.locator('h1').textContent(), 'Zushi');
    await worker.externalSet({ settings: data.settings });
    await edit.waitFor();

    await page.goto('https://www.last.fm/user/Friend/library/music/Dean+Blunt/Zushi');
    await mockExtension(page, data); await loadScripts(page, scripts);
    await page.waitForTimeout(100);
    assert.equal(await page.locator('[data-lfm-track-action]').count(), 0);
    assert.equal(await page.locator('h1').textContent(), 'Zushi');
    console.log('PASS: native form delegation, first menu item, local-only casing, real edit pass-through, bounded lookup, profile transitions');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
