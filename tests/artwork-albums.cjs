const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const {mockExtension,loadScripts} = require('./harness.cjs');
const root = path.resolve(__dirname,'..');
const artist = 'Playboi Carti';
const image = album => `https://lastfm-img.freetls.fastly.net/i/u/64s/${album}.jpg`;
const row = (name,count,type='tracks') => `<tr class="chartlist-row"><td class="chartlist-image"><a href="/music/Playboi+Carti/${type==='albums'?name:'2024'}"><img src="${image(type==='albums'?name:'wrong')}" width="34" height="34"></a></td><td class="chartlist-name"><a href="/music/Playboi+Carti/${type==='albums'?'':'_/'}${name}">${name}</a></td><td class="chartlist-bar"><span data-stat-value="${count}"></span></td></tr>`;
const albumPage = tracks => `<!doctype html><main class="col-main"><p class="metadata-display">${tracks.reduce((n,[,count])=>n+count,0)}</p><table class="chartlist"><tbody>${tracks.map(([name,count])=>row(name,count)).join('')}</tbody></table></main>`;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const page=await browser.newPage(), calls=[];
  let hold=false, pending, corrupt=false, lengthy=false;
  const musicPages=[];
  await page.route('https://lastfm-img.freetls.fastly.net/**',r=>r.abort());
  await page.route('https://www.last.fm/**',r=>{
   const u=new URL(r.request().url());
   if(u.pathname==='/user/DCCXX/library/music/Playboi+Carti') return r.fulfill({contentType:'text/html',body:`<!doctype html><main class="col-main"><table class="chartlist"><tbody>${row('MUSIC',135,'albums')}${row('Red',66,'albums')}${row('DieLit',152,'albums')}</tbody></table><table class="chartlist"><tbody>${row('NoTime',77)}${row('2024',63)}${row('Shoota',75)}</tbody></table></main>`});
   calls.push(u.pathname);
   if(u.pathname.endsWith('/MUSIC')) {
    if(lengthy){const p=Number(u.searchParams.get('page')||1);musicPages.push(p);return r.fulfill({contentType:'text/html',body:albumPage(p===1?[['2024',63],['Other',37]]:[['More',100]]).replace('>100</p>','>300</p>')+`<nav class="pagination"><a class="pagination-next" href="?page=${p+1}">Next</a></nav>`});}
    return r.fulfill({contentType:'text/html',body:corrupt?albumPage([['2024',63],['Other',72]]).replace('>135</p>','>136</p>'):albumPage([['2024',63],['Other',72]])});
   }
   if(u.pathname.endsWith('/Red')) {
    if(hold){pending=r;return;}
    return r.fulfill({contentType:'text/html',body:albumPage([['Rockstar',66]])});
   }
   if(u.pathname.endsWith('/DieLit')) return r.fulfill({contentType:'text/html',body:albumPage([['NoTime',77],['Shoota',75]])});
   return r.fulfill({status:404,body:'Unexpected request'});
  });
  await page.goto('https://www.last.fm/user/DCCXX/library/music/Playboi+Carti');
  const worker=await mockExtension(page,{settings:{username:'DCCXX',infiniteScroll:false},rules:{artists:{},albums:{},tracks:{},albumArtists:{}}});
  await page.evaluate(()=>{let t=Date.now();Date.now=()=>t+=2000;});
  await loadScripts(page,['rules.js','store.js','adapter.js','pages.js']);
  if(fs.existsSync(path.join(root,'artwork-albums.js'))) await loadScripts(page,['artwork-albums.js']);
  const music=await page.evaluate(async()=>globalThis.LastfmArtworkAlbums?.resolve({artist:'Playboi Carti',name:'2024'},'DCCXX'));
  assert.equal(music?.album,'MUSIC','2024 must select the scrobbled album MUSIC from its exact 63-play album total');
  assert.equal(music.image,image('MUSIC'),'reuse the album-row cover, never the track-row video still');
  assert.equal(calls.length,1,'one album list must suffice when its track count equals the all-time track total');
  await page.evaluate(()=>LastfmArtworkAlbums.clear());
  hold=true;
  const heldRequest = page.waitForRequest(request=>request.url().endsWith('/Red'));
  await loadScripts(page,['artwork-source.js','artwork.js']);
  await page.waitForFunction(()=>document.querySelector('.chartlist-name a[href$="_/2024"]').closest('tr').querySelector('img').src.endsWith('/MUSIC.jpg'),null,{timeout:3000});
  await heldRequest;
  for(let n=0;n<20&&!pending;n++) await new Promise(resolve=>setTimeout(resolve,10));
  assert.ok(pending,'the next unrelated album list is deliberately held open');
  assert.equal(await page.locator('.chartlist-name a[href$="_/2024"]').evaluate(a=>a.closest('tr').querySelector('.chartlist-image a').href),'https://www.last.fm/music/Playboi+Carti/MUSIC');
  hold=false; await pending.fulfill({contentType:'text/html',body:albumPage([['Rockstar',66]])});
  await page.waitForFunction(()=>document.querySelector('.chartlist-name a[href$="_/Shoota"]').closest('tr').querySelector('img').src.endsWith('/DieLit.jpg'));
  assert.equal(calls.length,4,'three shared album lists serve every visible track, with no individual histories or album cover requests');
  assert.equal(calls.some(url=>url.includes('/_/')),false);
  const beforeFilter=calls.length;
  const filtered=await page.evaluate(async()=>{history.replaceState(null,'','?from=2026-01-01');const result=await LastfmArtworkAlbums.resolve({artist:'Playboi Carti',name:'2024'},'DCCXX');history.replaceState(null,'',location.pathname);return result;});
  assert.equal(filtered,null,'a date-filtered page must not supply an all-time album winner');
  assert.equal(calls.length,beforeFilter);
  corrupt=true;
  const incomplete=await page.evaluate(async()=>{LastfmArtworkAlbums.clear();try{await LastfmArtworkAlbums.resolve({artist:'Playboi Carti',name:'2024'},'DCCXX');return '';}catch(e){return e.message;}});
  assert.match(incomplete,/complete album library/,'incomplete aggregate counts must never be guessed');
  corrupt=false;lengthy=true;
  const bounded=await page.evaluate(async()=>{LastfmArtworkAlbums.clear();return LastfmArtworkAlbums.resolve({artist:'Playboi Carti',name:'2024'},'DCCXX');});
  assert.equal(bounded,null,'large unfinished album lists leave selection to the individual track reader');
  assert.deepEqual(musicPages,[1,2],'the optimization must not crawl a third album-list page');
  const reused = await page.evaluate(() => {
    const item = { artist: 'Playboi Carti', name: '2024' };
    const cover = { artist: item.artist, album: 'MUSIC', image: 'https://lastfm-img.freetls.fastly.net/i/u/64s/preferred.jpg',
      url: 'https://www.last.fm/music/Playboi+Carti/MUSIC', fallback: false, sourceVersion: 3, total: 63 };
    LastfmArtworkAlbums.remember(item, cover, 'DCCXX');
    return LastfmArtworkAlbums.coverForAlbum(item.artist, cover.album, 'DCCXX');
  });
  assert.equal(reused.album, 'MUSIC', 'a remembered album retains the cover-result contract for individual history reads');
  assert.ok(reused.image.endsWith('/preferred.jpg'));
  await page.evaluate(() => LastfmArtworkAlbums.clear());
  assert.equal(await page.evaluate(() => LastfmArtworkAlbums.coverForAlbum('Playboi Carti', 'MUSIC', 'Friend')), null);
  assert.deepEqual(worker.data.rules,{artists:{},albums:{},tracks:{},albumArtists:{}});
  await page.evaluate(() => {
    LastfmArtworkAlbums.clear();
    document.querySelector('table.chartlist').remove();
    history.replaceState(null, '', location.pathname + '/+tracks');
    LastfmArtworkAlbums.hint({ artist: 'Playboi Carti', name: '2024' }, {
      artist: 'Playboi Carti', album: 'MUSIC', fallback: false, total: 63,
      image: 'https://lastfm-img.freetls.fastly.net/i/u/64s/obsolete.jpg'
    }, 'DCCXX');
  });
  assert.equal(await page.evaluate(() => LastfmArtworkAlbums.coverForAlbum('Playboi Carti', 'MUSIC', 'DCCXX')), null,
    'a legacy hint cannot supply artwork before a fresh read verifies it');
  await assert.rejects(page.evaluate(() => LastfmArtworkAlbums.resolve({ artist: 'Playboi Carti', name: '2024' }, 'DCCXX')),
    /no verified cover/, 'a hint must not recover obsolete art from a missing album header');
  console.log('PASS: MUSIC wins for 2024, album images are reused, shared totals update proven tracks progressively and preserve preferences');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
