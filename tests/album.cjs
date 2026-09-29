const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const project = path.resolve(__dirname, '..');
const albumUrl = 'https://www.last.fm/user/DCCXX/library/music/Dean+Blunt/Zushi';
const trackUrl = 'https://www.last.fm/user/DCCXX/library/music/Dean+Blunt/_/11';
const album = `<!doctype html><body><h1 class="library-header-title">Zushi</h1>
  <table><tbody><tr class="chartlist-row"><td class="chartlist-name"><a href="/music/Dean+Blunt/Zushi/11">11</a><span>(2:13)</span></td><td>
  <ul class="chartlist-more-menu"><li><a href="${trackUrl}">Go to track in library</a></li><li>Existing action</li></ul>
  </td></tr></tbody></table></body>`;
const track = `<!doctype html><body><h1 class="library-header-title">11</h1>
  <table><tbody><tr class="chartlist-row"><td>
  <form data-edit-scrobble method="post"
    action="/user/DCCXX/library/edit?edited-variation=library-track-scrobble">
    <input name="csrfmiddlewaretoken" value="test-token">
    <input name="track_name" value="11">
    <input name="artist_name" value="Dean Blunt">
    <input name="album_name" value="Zushi">
    <input name="album_artist_name" value="Dean Blunt">
    <button type="submit">Edit scrobble</button>
  </form></td></tr></tbody></table></body>`;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  try {
    let trackAlbum = 'Zushi';
    const fetchedTracks = [];
    await page.route('https://www.last.fm/**', route => route.fulfill({
      contentType: 'text/html',
      body: route.request().url().includes('/_/11')
        ? (fetchedTracks.push(route.request().url()),
          track.replace('name="album_name" value="Zushi"',
            `name="album_name" value="${trackAlbum}"`)) : album
    }));
    await page.goto(albumUrl);
    await page.evaluate(() => {
      const data = { settings: { username: 'DCCXX', infiniteScroll: false },
        rules: { artists: {}, albums: {
          '["dean blunt","zushi"]': { from: 'Zushi', to: 'ZUSHI', artist: 'Dean Blunt' }
        }, tracks: {
          '["dean blunt","11"]': { from: '11', to: 'ELEVEN', artist: 'Dean Blunt' }
        }, albumArtists: {} } };
      const listeners = [];
      window.chrome = {
        runtime: { getURL: name => 'chrome-extension://test/' + name },
        storage: { local: {
          async get(keys) { return Object.fromEntries(keys.map(key => [key, data[key]])); },
          async set(values) {
            for (const [key, value] of Object.entries(values)) data[key] = value;
            listeners.forEach(listener => listener(
              Object.fromEntries(Object.entries(values).map(([key, value]) =>
                [key, { newValue: value }])), 'local'));
          }
        }, onChanged: { addListener(listener) { listeners.push(listener); } } }
      };
      document.addEventListener('submit', event => {
        if (!event.target.matches('form[data-edit-scrobble]')) return;
        event.preventDefault();
        window.nativeEditOpened = new FormData(event.target).get('track_name');
        window.nativeEditAlbum = new FormData(event.target).get('album_name');
        const popup = document.createElement('div');
        popup.className = 'popup_content';
        popup.innerHTML = '<form action="/user/DCCXX/library/edit">' +
          '<input name="track_name" value="11"><button>Save Edit</button></form>';
        document.body.append(popup);
      });
    });
    for (const file of ['rules.js', 'content.js', 'native-edit.js']) {
      await page.addScriptTag({ path: path.join(project, file) });
    }
    await page.waitForFunction(() => document.querySelector('h1').textContent === 'ZUSHI');
    assert.equal(await page.locator('tr.chartlist-row .chartlist-name a').textContent(), 'ELEVEN');
    assert.equal(await page.locator('.chartlist-name').textContent(), 'ELEVEN (2:13)');
    await page.getByRole('button', { name: 'Edit track' }).waitFor();
    assert.equal(await page.locator('.chartlist-more-menu li').first().textContent(), 'Edit track');
    await page.locator('.chartlist-more-menu').evaluate(menu =>
      menu.append(menu.firstElementChild));
    await page.waitForFunction(() =>
      document.querySelector('.chartlist-more-menu li')?.textContent === 'Edit track');
    await page.getByRole('button', { name: 'Edit track' }).click();
    await page.waitForFunction(() => window.nativeEditOpened === '11');
    assert.equal(fetchedTracks[0], trackUrl);
    assert.equal(await page.evaluate(() => window.nativeEditAlbum), 'Zushi');
    assert.equal(await page.locator('.chartlist-more-menu form[data-edit-scrobble]').count(), 1);
    assert.equal(await page.locator('.popup_content form[action="/user/DCCXX/library/edit"]').count(), 1);
    assert.equal(page.url(), albumUrl);
    assert.equal(await page.locator('iframe').count(), 0);

    trackAlbum = 'Another Album';
    await page.evaluate(() => { window.nativeEditAlbum = null; });
    let allowAlternative = false;
    const prompts = [];
    page.on('dialog', async dialog => {
      prompts.push(dialog.message());
      if (allowAlternative) await dialog.accept();
      else await dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Edit track' }).click();
    await page.waitForFunction(() => document.querySelector('.chartlist-more-menu button')?.disabled === false);
    assert.match(prompts[0], /No scrobble tagged “Zushi” was found/);
    assert.match(prompts[0], /tagged “Another Album”/);
    assert.equal(await page.evaluate(() => window.nativeEditAlbum), null);
    allowAlternative = true;
    await page.getByRole('button', { name: 'Edit track' }).click();
    await page.waitForFunction(() => window.nativeEditAlbum === 'Another Album');
    assert.equal(page.url(), albumUrl);

    await page.goto(trackUrl);
    await page.evaluate(() => {
      window.chrome = { storage: { local: { get: async () => ({
        settings: { username: 'DCCXX', infiniteScroll: false },
        rules: { artists: {}, albums: {}, tracks: {
          '["dean blunt","11"]': { from: '11', to: 'ELEVEN', artist: 'Dean Blunt' }
        }, albumArtists: {} }
      }) }, onChanged: { addListener() {} } } };
    });
    await page.addScriptTag({ path: path.join(project, 'rules.js') });
    await page.addScriptTag({ path: path.join(project, 'content.js') });
    await page.waitForFunction(() =>
      document.querySelector('h1.library-header-title').textContent === 'ELEVEN');
    await page.goto('https://www.last.fm/user/DCCXX/library/music/' +
      '+noredirect/Bladee+%26+Ecco2k/+tracks');
    await page.setContent('<h1 class="library-header-title">Bladee &amp; Ecco2k</h1>' +
      '<a href="/user/DCCXX/library/music/+noredirect/Bladee+%26+Ecco2k">' +
      'Bladee &amp; Ecco2k</a>');
    await page.evaluate(() => {
      window.chrome = { storage: { local: { get: async () => ({
        settings: { username: 'DCCXX', infiniteScroll: false },
        rules: { artists: { '["bladee & ecco2k"]': {
          from: 'Bladee & Ecco2k', to: 'BLADEE & ECCO2K'
        } }, albums: {}, tracks: {}, albumArtists: {} }
      }) }, onChanged: { addListener() {} } } };
    });
    await page.addScriptTag({ path: path.join(project, 'rules.js') });
    await page.addScriptTag({ path: path.join(project, 'content.js') });
    await page.waitForFunction(() =>
      document.querySelector('h1').textContent === 'BLADEE & ECCO2K');
    assert.equal(await page.locator('a[href*="+noredirect"]').textContent(),
      'BLADEE & ECCO2K');
    console.log('PASS: album track menu opens native form in place; album and track headings');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
