const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const project = path.resolve(__dirname, '..');
const artistRow = (rank, name) =>
  '<tr class="chartlist-row"><td>' + rank + '</td><td><img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt=""></td>' +
  '<td><a href="/music/' + encodeURIComponent(name).replace(/%20/g, '+') + '">' +
  name + '</a></td><td><a href="#">' + (1000 - rank) + '</a>' +
  (rank === 51 ? '<button class="more" type="button">⋮</button>' +
    '<ul class="dropdown-menu"><li><a href="/user/DCCXX/library/music/+noredirect/Bladee+%26+Ecco2k">' +
    'Go to artist in library</a></li></ul>' : '') + '</td></tr>';

const table = (first, last, hidden = false) =>
  '<table class="chartlist' + (hidden ? ' hidden' : '') +
  '"><tbody>' +
  Array.from({ length: last - first + 1 }, (_, i) =>
    artistRow(first + i, first + i === 10 ? 'Dean Blunt'
      : first + i === 51 ? 'Bladee & Ecco2k' : 'Artist ' + (first + i))
  ).join('') + '</tbody></table>';

const pageHtml = (first, last, next) =>
  '<!doctype html><html><head><style>' +
  'body{margin:0} .hidden{display:none} td{height:28px;border-bottom:1px solid #ddd} ' +
  'table.chartlist{width:600px} footer{height:100px}' +
  '</style></head><body>' +
  '<div id="library-sort-section">' +
  table(first, last - 1, true) +
  table(first, last - 1, true) +
  table(first, last) +
  '<nav class="pagination"><a class="pagination-next" href="?page=' +
  next + '">Next</a></nav></div><footer>Footer</footer></body></html>';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  try {
    await page.route('https://www.last.fm/**', route => {
      const url = new URL(route.request().url());
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: url.searchParams.get('page') === '2'
          ? pageHtml(51, 100, 3)
          : pageHtml(1, 50, 2)
      });
    });
    await page.goto('https://www.last.fm/user/DCCXX/library/artists');
    await page.addInitScript(() => {});
    await page.evaluate(() => {
      const data = {
        settings: { username: 'DCCXX', infiniteScroll: true },
        rules: {
          artists: {
            '["dean blunt"]': { from: 'Dean Blunt', to: 'DEAN BLUNT' }
          },
          albums: {}, tracks: {}, albumArtists: {}
        }
      };
      const listeners = [];
      window.testData = data;
      window.chrome = {
        runtime: { getURL: path => 'chrome-extension://test/' + path },
        storage: {
          local: {
            async get(keys) {
              return Object.fromEntries(keys.map(key => [key, data[key]]));
            },
            async set(values) {
              const changes = {};
              for (const [key, value] of Object.entries(values)) {
                changes[key] = { oldValue: data[key], newValue: value };
                data[key] = value;
              }
              listeners.forEach(listener => listener(changes, 'local'));
            }
          },
          onChanged: { addListener(listener) { listeners.push(listener); } }
        }
      };
    });
    await page.addScriptTag({ path: path.join(project, 'rules.js') });
    await page.addScriptTag({ path: path.join(project, 'content.js') });
    await page.addScriptTag({ path: path.join(project, 'native-edit.js') });

    await page.waitForFunction(() =>
      document.querySelector('a[href="/music/Dean+Blunt"]')?.textContent === 'DEAN BLUNT'
    );
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await page.waitForFunction(() =>
      [...document.querySelectorAll('table.chartlist')]
        .some(table => table.getBoundingClientRect().height > 2000 &&
              [...table.querySelectorAll('tr.chartlist-row')]
                .some(row => row.cells[0].textContent === '51'))
    );
    assert.equal(await page.locator('table.chartlist:not(.hidden) tr.chartlist-row').count(), 100);

    await page.locator('table.chartlist:not(.hidden) tr.chartlist-row')
      .filter({ hasText: 'Bladee & Ecco2k' }).locator('button.more').click();
    await page.getByText('Edit artist display name').click();
    assert.equal(await page.locator('dialog[data-lfm-artist-dialog] input').inputValue(),
      'Bladee & Ecco2k');
    await page.locator('dialog[data-lfm-artist-dialog] input').fill('BLADEE & ECCO2K');
    await page.locator('dialog[data-lfm-artist-dialog] button')
      .filter({ hasText: 'Save locally' }).click();
    await page.waitForFunction(() =>
      document.querySelector('a[href="/music/Bladee+%26+Ecco2k"]')?.textContent ===
        'BLADEE & ECCO2K'
    );
    assert.equal(await page.evaluate(() =>
      window.testData.rules.artists['["bladee & ecco2k"]']?.to), 'BLADEE & ECCO2K');
    assert.equal(await page.evaluate(() =>
      Object.keys(window.testData.rules.artists).some(key => key.includes('noredirect'))), false);

    await page.evaluate(() => {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML =
        '<form><div class="alert">Your edit doesn&#39;t contain any real changes. ' +
        'We cannot accept casing changes.</div>' +
        ['11', 'Zushi', 'Dean Blunt', 'Dean Blunt']
          .map(value => '<input type="text" disabled value="' + value + '">')
          .join('') +
        ['11', 'ZUSHI', 'Dean Blunt', 'Dean Blunt']
          .map(value => '<input type="text" value="' + value + '">')
          .join('') + '</form>';
      document.body.append(modal);
    });
    await page.waitForFunction(() =>
      window.testData.rules.albums['["dean blunt","zushi"]']?.to === 'ZUSHI'
    );
    assert.match(await page.locator('[data-lfm-case-confirmation]').textContent(),
      /Case-sensitive changes saved locally. Manage preferences/);

    await page.evaluate(() => {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = '<form>' +
        '<div><span>Your edit doesn&#39;t contain any real changes. ' +
        'We cannot accept casing changes.</span></div>' +
        '<section><label>Album</label><div>' +
        '<input type="text" value="Xperiment"> → ' +
        '<input type="text" value="xperiment"></div></section>' +
        '<section><label>Album Artist</label><div>' +
        '<input type="text" value="Ken Carson"> → ' +
        '<input type="text" value="Ken Carson"></div></section>' +
        '</form>';
      document.body.append(modal);
    });
    await page.waitForFunction(() =>
      window.testData.rules.albums['["ken carson","xperiment"]']?.to ===
        'xperiment'
    );
    assert.match(await page.locator('.modal').last()
      .locator('[data-lfm-case-confirmation]').textContent(),
      /Case-sensitive changes saved locally. Manage preferences/);

    await page.goto('https://www.last.fm/user/Friend/library/artists');
    await page.evaluate(() => {
      window.chrome = {
        storage: {
          local: { get: async () => ({
            settings: { username: 'DCCXX', infiniteScroll: true },
            rules: { artists: { '["dean blunt"]': {
              from: 'Dean Blunt', to: 'DEAN BLUNT'
            } }, albums: {}, tracks: {}, albumArtists: {} }
          }) },
          onChanged: { addListener() {} }
        }
      };
    });
    await page.addScriptTag({ path: path.join(project, 'rules.js') });
    await page.addScriptTag({ path: path.join(project, 'content.js') });
    await page.addScriptTag({ path: path.join(project, 'native-edit.js') });
    await page.waitForTimeout(150);
    assert.equal(await page.locator('a[href="/music/Dean+Blunt"]').first().textContent(), 'Dean Blunt');
    assert.equal(await page.locator('[data-lfm-artist-action]').count(), 0);
    console.log('PASS: own-profile rules, native row append, local bulk, edit prompt, friend isolation');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
