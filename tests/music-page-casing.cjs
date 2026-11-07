const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');

// Markup observed on the public Last.fm track, album and artist pages (7 November 2026).
const header = (title, crumb) => `<!doctype html><title>${title}</title><header>` +
  (crumb ? '<a class="header-new-crumb" itemprop="url" href="/music/Lil+Baby"><span itemprop="name">Lil Baby</span></a>' : '') +
  `<h1 class="header-new-title" itemprop="name">${title.split(' — ')[0].replace(' music, videos, stats, and photos | Last.fm', '')}</h1></header>` +
  '<section><a href="/music/Lil+Baby/_/AlL+mY+pArTnAs">AlL mY pArTnAs</a><a href="/music/Lil+Baby">Lil Baby</a></section>';
const pages = {
  '/music/Lil+Baby/_/AlL+mY+pArTnAs': header('AlL mY pArTnAs — Lil Baby | Last.fm', true),
  '/music/Lil+Baby/My+Turn': header('My Turn — Lil Baby | Last.fm', true),
  '/music/Lil+Baby': header('Lil Baby music, videos, stats, and photos | Last.fm', false),
  '/music/Other/_/Untouched': header('UnToUcHeD — Other | Last.fm', false).replace(/Lil\+Baby/g, 'Other')
};
const rules = {
  artists: { '["lil baby"]': { from: 'Lil Baby', to: 'LIL BABY' } },
  albums: { '["lil baby","my turn"]': { from: 'My Turn', to: 'MY TURN', artist: 'Lil Baby' } },
  tracks: { '["lil baby","all my partnas"]': { from: 'All My Partnas', to: 'All My Partnas', artist: 'Lil Baby' } },
  albumArtists: {}
};
const empty = { artists: {}, albums: {}, tracks: {}, albumArtists: {} };
const scripts = ['rules.js', 'store.js', 'adapter.js', 'content.js'];
const text = page => page.evaluate(() => ({ title: document.title,
  h1: document.querySelector('h1').textContent,
  crumb: document.querySelector('.header-new-crumb')?.textContent ?? null,
  links: [...document.querySelectorAll('section a')].map(a => a.textContent) }));

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
  try {
    const open = async (path, data) => {
      const page = await browser.newPage();
      await page.route('https://www.last.fm/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: pages[new URL(r.request().url()).pathname] }));
      await page.goto('https://www.last.fm' + path);
      const worker = await mockExtension(page, data);
      await loadScripts(page, scripts);
      return { page, worker };
    };

    // Track page: header title, artist crumb and tab title use the preferred casing.
    const { page, worker } = await open('/music/Lil+Baby/_/AlL+mY+pArTnAs', { rules, settings: { username: 'DCCXX', infiniteScroll: false } });
    await page.waitForFunction(() => document.querySelector('h1').textContent === 'All My Partnas');
    assert.deepEqual(await text(page), { title: 'All My Partnas — LIL BABY | Last.fm', h1: 'All My Partnas', crumb: 'LIL BABY',
      links: ['AlL mY pArTnAs', 'Lil Baby'] }, 'track header recased; links outside the header stay native');

    // Changing the preference updates the page; removing it restores Last.fm's casing.
    await worker.externalSet({ rules: { ...rules, tracks: { '["lil baby","all my partnas"]': { from: 'All My Partnas', to: 'ALL MY PARTNAS', artist: 'Lil Baby' } } } });
    await page.waitForFunction(() => document.querySelector('h1').textContent === 'ALL MY PARTNAS');
    assert.equal(await page.title(), 'ALL MY PARTNAS — LIL BABY | Last.fm');
    await worker.externalSet({ rules: empty });
    await page.waitForFunction(() => document.querySelector('h1').textContent === 'AlL mY pArTnAs');
    assert.deepEqual(await text(page), { title: 'AlL mY pArTnAs — Lil Baby | Last.fm', h1: 'AlL mY pArTnAs', crumb: 'Lil Baby',
      links: ['AlL mY pArTnAs', 'Lil Baby'] }, 'preference removal restores the original casing');

    // A rule that changes more than letter casing is never shown.
    await worker.externalSet({ rules: { ...empty, tracks: { '["lil baby","all my partnas"]': { from: 'All My Partnas', to: 'All My Partners', artist: 'Lil Baby' } } } });
    await page.waitForTimeout(150);
    assert.equal((await text(page)).h1, 'AlL mY pArTnAs', 'spelling changes are rejected');

    // Without a connected profile, public pages are untouched.
    await worker.externalSet({ rules, settings: { username: '', infiniteScroll: false } });
    await page.waitForTimeout(150);
    assert.equal((await text(page)).h1, 'AlL mY pArTnAs', 'no connected profile leaves the page native');
    await page.close();

    // Album and artist pages.
    const album = await open('/music/Lil+Baby/My+Turn', { rules, settings: { username: 'DCCXX', infiniteScroll: false } });
    await album.page.waitForFunction(() => document.querySelector('h1').textContent === 'MY TURN');
    assert.deepEqual(await text(album.page), { title: 'MY TURN — LIL BABY | Last.fm', h1: 'MY TURN', crumb: 'LIL BABY',
      links: ['AlL mY pArTnAs', 'Lil Baby'] });
    await album.page.close();
    const artist = await open('/music/Lil+Baby', { rules, settings: { username: 'DCCXX', infiniteScroll: false } });
    await artist.page.waitForFunction(() => document.querySelector('h1').textContent === 'LIL BABY');
    assert.equal(await artist.page.title(), 'LIL BABY music, videos, stats, and photos | Last.fm');
    await artist.page.close();

    // A page without a matching preference is untouched.
    const other = await open('/music/Other/_/Untouched', { rules, settings: { username: 'DCCXX', infiniteScroll: false } });
    await other.page.waitForTimeout(150);
    assert.deepEqual(await text(other.page), { title: 'UnToUcHeD — Other | Last.fm', h1: 'UnToUcHeD', crumb: null,
      links: ['AlL mY pArTnAs', 'Lil Baby'] });
    console.log('PASS: track, album and artist page headers and tab titles use display casing, update, restore and leave other pages alone');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
