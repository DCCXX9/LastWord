const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const placeholder = 'https://lastfm-img.freetls.fastly.net/i/u/64s/4128a6eb29f94943c9d206c08e625904.jpg';
const lucre = 'https://lastfm-img.freetls.fastly.net/i/u/64s/6da014dd54bb1082a3a51218fcbf7a89.jpg';
const otherCover = 'https://lastfm-img.freetls.fastly.net/i/u/64s/other-preferred.jpg';
const nameLink = (artist, name, type='tracks') => `/music/${artist.replaceAll(' ','+')}/${type === 'tracks' ? '_/' : ''}${name.replaceAll(' ','+')}`;
const ranked = (artist, name, n, type='tracks', image=placeholder) => `<tr class="chartlist-row"><td class="chartlist-image"><span class="cover-art"><img width="34" height="34" src="${image}"></span></td><td class="chartlist-name"><a href="${nameLink(artist,name,type)}">${name}</a></td><td><span data-stat-value="${n}">${n}</span></td></tr>`;
const history = (artist, name, albums) => `<main class="col-main"><p class="metadata-display">${albums.length}</p><table class="chartlist"><tbody>${albums.map((album,i) => `<tr class="chartlist-row" data-edit-scrobble-id="${'a'.repeat(32)}"><td class="chartlist-name"><a href="${nameLink(artist,name)}">${name}</a></td><td class="chartlist-album"><a href="${nameLink(artist,album,'albums')}">${album}</a></td><td class="chartlist-timestamp"><span title="5 Oct 2026, ${i}:00">${i}</span></td></tr>`).join('')}</tbody></table></main>`;
(async () => {
  const browser = await chromium.launch({ headless:true, executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args:['--no-sandbox'] });
  try {
    const page = await browser.newPage(), requests = [];
    await page.route('https://lastfm-img.freetls.fastly.net/**', r => r.fulfill({ contentType:'image/png', body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64') }));
    await page.route('https://www.last.fm/**', r => {
      const u = new URL(r.request().url());
      if (u.pathname === '/user/DCCXX/library/music/Dean+Blunt') return r.fulfill({ contentType:'text/html', body:`<main class="col-main"><table class="chartlist"><tbody>${Array.from({length:6},(_,i)=>ranked('Dean Blunt','Other '+i,200-i,'albums',otherCover)).join('')}${ranked('Dean Blunt','LUCRE',120,'albums',lucre)}</tbody></table><table class="chartlist"><tbody>${ranked('Dean Blunt','lucre 5',18)}${ranked('Dean Blunt','lucre 6',18)}</tbody></table></main>` });
      requests.push(u.pathname);
      if (u.pathname.includes('/_/lucre+')) return r.fulfill({ contentType:'text/html', body:history('Dean Blunt',u.pathname.endsWith('5')?'lucre 5':'lucre 6',Array(18).fill('LUCRE')) });
      if (u.pathname.includes('/_/Mixed')) return r.fulfill({ contentType:'text/html', body:history('Other Artist','Mixed',[...Array(4).fill('Recent'),...Array(6).fill('Most used')]) });
      if (u.pathname.includes('/_/Broken')) return r.fulfill({ contentType:'text/html', body:history('Other Artist','Broken',['Missing']) });
      if (u.pathname.startsWith('/music/')) return r.fulfill({ status:502, contentType:'text/html', body:'502 Bad Gateway' });
      if (u.pathname.endsWith('/Most+used')) return r.fulfill({ contentType:'text/html', body:`<main class="col-main"><header class="library-header"><h2 class="library-header-title">Most used</h2><span class="library-header-image cover-art"><img src="${otherCover}"></span><a href="/music/Other+Artist/Most+used">Go to album page</a></header></main>` });
      if (u.pathname.endsWith('/Missing')) return r.fulfill({ contentType:'text/html', body:`<main class="col-main"><header class="library-header"><h2 class="library-header-title">Different album</h2><span class="library-header-image cover-art"><img src="${otherCover}"></span><a href="/music/Other+Artist/Different+album">Go to album page</a></header></main>` });
      return r.fulfill({ status:404, body:'Unrelated album lookups must not block a placeholder track' });
    });
    await page.goto('https://www.last.fm/user/DCCXX/library/music/Dean+Blunt');
    const worker = await mockExtension(page, { settings:{username:'DCCXX',infiniteScroll:false},rules:{artists:{},albums:{},tracks:{},albumArtists:{}} });
    await page.evaluate(()=>{let t=Date.now();Date.now=()=>t+=2000;});
    await loadScripts(page,['rules.js','store.js','adapter.js','pages.js','artwork-albums.js','artwork-source.js']);
    const selected = await page.evaluate(()=>LastfmArtworkSource.resolve({artist:'Dean Blunt',name:'lucre 5',placeholder:true},'DCCXX'));
    assert.equal(selected.album,'LUCRE');
    assert.equal(selected.image,lucre,'reuse the exact matching seventh album row after proving the scrobble winner');
    assert.deepEqual(requests,['/user/DCCXX/library/music/+noredirect/Dean+Blunt/_/lucre+5'],'a placeholder must not wait behind five unrelated album lists or a broken public cover request');
    const mixed = await page.evaluate(()=>LastfmArtworkSource.resolve({artist:'Other Artist',name:'Mixed',placeholder:true},'DCCXX'));
    assert.equal(mixed.album,'Most used','the same rule applies to every artist, choosing the all-time album rather than the latest album');
    assert.equal(mixed.image,otherCover,'the own-library album header recovers a failed public cover request');
    const invalid = await page.evaluate(async()=>{try {await LastfmArtworkSource.resolve({artist:'Other Artist',name:'Broken',placeholder:true},'DCCXX');}catch(e){return e.message;} });
    assert.match(invalid,/502|different album|available cover/,'never use a different library album header');
    await loadScripts(page,['artwork.js']);
    await page.waitForFunction(src=>[...document.querySelectorAll('.chartlist-name a')].filter(a=>a.getAttribute('href').includes('/_/lucre+')).every(a=>a.closest('tr').querySelector('img').src===src),lucre);
    assert.equal(await page.locator('a[href="https://www.last.fm/music/Dean+Blunt/LUCRE"]').count(),2);
    assert.equal(await page.locator('.chartlist-name a[href$="_/lucre+5"]').evaluate(a=>getComputedStyle(a.closest('tr').querySelector('img')).visibility),'visible');
    assert.equal(await page.locator('.chartlist-name a[href$="_/lucre+5"]').evaluate(a=>a.closest('tr').querySelector('img').naturalWidth)>0,true,'verify the cover actually loads');
    assert.equal(worker.data.rules.tracks && Object.keys(worker.data.rules.tracks).length,0);
    console.log('PASS: seventh-album cover recovery, direct placeholder history, all-artist majority selection, verified own-album header and painted linked covers');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
