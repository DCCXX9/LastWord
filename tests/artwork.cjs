const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');
const root = path.resolve(__dirname, '..');
const encode = value => encodeURIComponent(value).replace(/%20/g, '+');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const form = (item, album, albumArtist, stamp) => `<tr class="chartlist-row"><td><form method="post" action="/user/DCCXX/library/edit-track" data-edit-scrobble>${Object.entries({artist_name:item.artist,track_name:item.name,album_name:album,album_artist_name:albumArtist,timestamp:String(stamp)}).map(([name,value])=>`<input name="${name}" value="${escape(value)}">`).join('')}</form></td></tr>`;
// Count markup and edit-form names are confirmed from the signed-in page.
const history = (item, total, entries, next) => `<!doctype html><main class="col-main"><p class="metadata-display">${total}</p><table class="chartlist"><tbody>${entries.map(([album,artist,stamp])=>form(item,album,artist,stamp)).join('')}</tbody></table><nav class="pagination">${next?`<a class="pagination-next" href="?page=${next}">Next</a>`:''}</nav></main>`;
const native = (item,id) => `<tr class="chartlist-row" data-case="${id}"><td class="chartlist-image"><a href="/music/Wrong/Compilation"><img src="https://lastfm-img.freetls.fastly.net/i/u/64s/wrong.jpg" srcset="https://lastfm-img.freetls.fastly.net/i/u/128s/wrong.jpg 2x" data-src="https://lastfm-img.freetls.fastly.net/i/u/64s/wrong.jpg" width="34" height="34"></a></td><td class="chartlist-name"><a href="/music/${encode(item.artist)}/_/${encode(item.name)}">${escape(item.name)}</a></td></tr>`;
const cover = 'https://lastfm-img.freetls.fastly.net/i/u/ar0/9741753a613314214accd15a28eb91da.jpg';
const starred = 'https://lastfm-img.freetls.fastly.net/i/u/500x500/preferred-artwork.jpg';

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const page=await browser.newPage();
  const myron={artist:'Lil Uzi Vert',name:'Myron'}, mixed={artist:'Artist',name:'Mixed'}, blank={artist:'Silentó',name:'Watch Me (Whip / Nae Nae)'};
  const compilation={artist:'Singer',name:'Compilation track'}, incomplete={artist:'Artist',name:'Incomplete'}, tied={artist:'Artist',name:'Tied'}, malformed={artist:'Artist',name:'Malformed'}, carti={artist:'Playboi Carti',name:'2024'};
  const calls=[];
  let holdMixed = false;
  const histories={
   Myron:[history(myron,56,Array.from({length:50},(_,i)=>['LUV vs. the World 2','',1000-i]),2)],
   Mixed:[history(mixed,7,[['Recent','',10],['Recent','',9],['Recent','',8],['Older','',7]],2),history(mixed,7,[['Older','',6],['Older','',5],['Older','',4]])],
   // Signed-in Last.fm omits BOTH fields for album-less plays, rather than empty inputs.
   [blank.name]:[history(blank,3,[['','',3],['','',2],['','',1]]).replace(/<input name="album_(?:artist_)?name" value="">/g,'')],
   [compilation.name]:[history(compilation,3,[['Mix','Various Artists',3],['Mix','Various Artists',2],['Solo','Singer',1]])],
   [incomplete.name]:[history(incomplete,7,[['Recent','',3],['Older','',2],['Older','',1]])],
   [tied.name]:[history(tied,4,[['Latest','',4],['Other','',3],['Other','',2],['Latest','',1]])],
   [malformed.name]:[history(malformed,1,[['Album','',1]]).replace('name="album_artist_name"','name="unexpected_field"')],
   // Captured public layout: album column + stable scrobble ids, no edit forms.
   '2024':[`<!doctype html><main class="col-main"><p class="metadata-display">63</p><table class="chartlist"><tbody>${Array.from({length:50},(_,i)=>`<tr class="chartlist-row" data-edit-scrobble-id="${i.toString(16).padStart(32,'0')}"><td class="chartlist-name"><a href="/music/Playboi+Carti/_/2024">2024</a></td><td class="chartlist-album"><a href="/music/Playboi+Carti/MUSIC">MUSIC</a></td></tr>`).join('')}</tbody></table><nav class="pagination"><a class="pagination-next" href="?page=2">Next</a></nav></main>`]
  };
  await page.route('https://lastfm-img.freetls.fastly.net/**',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64')}));
  await page.route('https://www.last.fm/**',r=>{
   const url=new URL(r.request().url());
   const blankRow = native(blank,'blank').replace('</td></tr>', '<form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input name="artist_name" value="Silentó"><input name="track_name" value="Watch Me (Whip / Nae Nae)"><input name="timestamp" value="3"></form></td></tr>');
   if(url.pathname==='/user/DCCXX/library/tracks') return r.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><table class="chartlist"><tbody>${native(myron,'a')}${native(myron,'b')}${blankRow}</tbody></table><div style="height:2000px"></div><table class="chartlist"><tbody>${native(mixed,'offscreen')}</tbody></table>`});
   calls.push(url.pathname+url.search);
   if(url.pathname.startsWith('/user/DCCXX/library/music/')) {
    const name=decodeURIComponent(url.pathname.split('/').at(-1)).replaceAll('+',' ');
    if(holdMixed && name==='Mixed') return; // Simulate a history that is slow to respond.
    const body=histories[name]?.[Number(url.searchParams.get('page')||1)-1];
    return r.fulfill({status:body?200:404,contentType:'text/html',body:body||'Unexpected page'});
   }
   const primary=url.pathname.endsWith('/LUV+vs.+the+World+2')?starred:cover;
   return r.fulfill({contentType:'text/html',body:`<!doctype html><meta property="og:image" content="${cover}"><div class="cover-art"><img src="${primary}"></div><aside><div class="cover-art"><img src="https://lastfm-img.freetls.fastly.net/i/u/300x300/unrelated.jpg"></div></aside>`});
  });
  await page.goto('https://www.last.fm/user/DCCXX/library/tracks');
  const worker=await mockExtension(page,{settings:{username:'DCCXX',infiniteScroll:false},rules:{artists:{},albums:{},tracks:{},albumArtists:{}}});
  // Advance the test clock per call to omit throttle delays; the real queue,
  // fetch parsing, profile guards and persisted rate-limit behavior still run.
  await page.evaluate(()=>{let time=Date.now(); Date.now=()=>time+=2000;});
  await loadScripts(page,['rules.js','store.js','adapter.js','pages.js']);
  const sourcePath=path.join(root,'artwork-source.js');
  if(fs.existsSync(sourcePath)) await page.addScriptTag({path:sourcePath});
  const dominant=await page.evaluate(async item=>globalThis.LastfmArtworkSource?.resolve(item,'DCCXX'),myron);
  assert.equal(dominant?.album,'LUV vs. the World 2','choose the user-tagged album once the remaining plays cannot overturn it');
  assert.equal(dominant.artist,'Lil Uzi Vert');
  assert.equal(dominant.image,starred,'use the signed-in primary cover, which may differ from the public sharing image');
  assert.equal(calls.some(url=>url.includes('Myron?page=2')),false,'a mathematically settled majority must not fetch another history page');
  const music=await page.evaluate(item=>LastfmArtworkSource.resolve(item,'DCCXX'),carti);
  assert.equal(music.album,'MUSIC','native scrobble album metadata must override the global 2024 title-album image');
  assert.equal(music.fallback,false);
  assert.equal(calls.some(url=>url.endsWith('/2024?page=2')),false,'50 of 63 MUSIC plays already prove the winner');
  const older=await page.evaluate(item=>LastfmArtworkSource.resolve(item,'DCCXX'),mixed);
  assert.equal(older.album,'Older','use the all-time winner rather than the most recent album');
  const single=await page.evaluate(item=>LastfmArtworkSource.resolve(item,'DCCXX'),blank);
  assert.equal(single.album,blank.name);
  assert.equal(single.fallback,true);
  assert.ok(calls.includes('/music/Silent%C3%B3/Watch+Me+(Whip+%2F+Nae+Nae)'),'album-less fallback must use the artist/title album URL, preserving slash escaping');
  const various=await page.evaluate(item=>LastfmArtworkSource.resolve(item,'DCCXX'),compilation);
  assert.equal(various.artist,'Various Artists','use the scrobbled album artist for a compilation cover');
  assert.equal(various.album,'Mix');
  const tie=await page.evaluate(item=>LastfmArtworkSource.resolve(item,'DCCXX'),tied);
  assert.equal(tie.album,'Latest','an exact tie uses the most recently scrobbled album');
  const missing=await page.evaluate(async item=>{try{await LastfmArtworkSource.resolve(item,'DCCXX');return '';}catch(e){return e.message;}},incomplete);
  assert.match(missing,/complete track history/,'an incomplete history must never be treated as an all-time winner');
  const bad=await page.evaluate(async item=>{try{await LastfmArtworkSource.resolve(item,'DCCXX');return '';}catch(e){return e.message;}},malformed);
  assert.match(bad,/album fields/,'missing source fields must never be guessed from a global image');
  const beforeAbort=calls.length;
  const aborted=await page.evaluate(async item=>{const c=new AbortController();c.abort();try{await LastfmArtworkSource.resolve(item,'DCCXX',c.signal);return '';}catch(e){return e.name;}},myron);
  assert.equal(aborted,'AbortError'); assert.equal(calls.length,beforeAbort);
  const savedBefore=structuredClone(worker.data.rules);
  const callsBefore=calls.length;
  const uiPath=path.join(root,'artwork.js');
  if(fs.existsSync(uiPath)) await page.addScriptTag({path:uiPath});
  await page.waitForFunction(()=>document.querySelector('[data-case="a"] img').getAttribute('src')=== 'https://lastfm-img.freetls.fastly.net/i/u/64s/preferred-artwork.jpg',null,{timeout:3000});
  await page.waitForFunction(()=>document.querySelector('[data-case="blank"] img').getAttribute('src')=== 'https://lastfm-img.freetls.fastly.net/i/u/64s/9741753a613314214accd15a28eb91da.jpg');
  assert.equal(calls.slice(callsBefore).filter(url=>url.includes('/_/Myron')).length,1,'two visible rows for one track share a lookup');
  assert.equal(calls.slice(callsBefore).some(url=>url.includes('/_/Mixed')),false,'offscreen covers must not generate history requests');
  assert.equal(calls[callsBefore],'/music/Silent%C3%B3/'+encode(blank.name), 'a verified album-less scrobble must fetch its title album directly before unrelated histories');
  assert.equal(await page.locator('[data-case="a"] img').getAttribute('srcset'),null,'native srcset must not override the personal cover');
  assert.equal(await page.locator('[data-case="a"] img').getAttribute('alt'),'Cover for LUV vs. the World 2 by Lil Uzi Vert');
  assert.equal(await page.locator('[data-case="a"] .chartlist-image a').getAttribute('href'),'https://www.last.fm/music/Lil+Uzi+Vert/LUV+vs.+the+World+2');
  const beforeReturn = calls.length;
  await page.evaluate(() => {
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await page.waitForFunction(()=>document.querySelector('[data-case="a"] img').src.endsWith('/preferred-artwork.jpg'));
  assert.equal(calls.length,beforeReturn,'returning to an already-resolved page must immediately reuse its cover without rejoining the network queue');
  holdMixed = true;
  const pendingHistory = page.waitForRequest(request => request.url().includes('/_/Mixed'));
  await page.locator('[data-case="offscreen"]').scrollIntoViewIfNeeded();
  await pendingHistory;
  const lateRow = native({artist:'Silentó',name:'Late single'},'late').replace('</td></tr>', '<form data-edit-scrobble method="post" action="/user/DCCXX/library/edit-track"><input type="hidden" name="artist_name" value="Silentó"><input type="hidden" name="track_name" value="Late single"><input type="hidden" name="timestamp" value="4"></form></td></tr>');
  await page.evaluate(html => document.querySelector('[data-case="offscreen"]').insertAdjacentHTML('afterend',html),lateRow);
  await page.waitForFunction(()=>document.querySelector('[data-case="late"] img').src.endsWith('/9741753a613314214accd15a28eb91da.jpg'),null,{timeout:3000});
  assert.equal(await page.locator('[data-case="late"] .chartlist-image a').getAttribute('href'),'https://www.last.fm/music/Silent%C3%B3/Late+single','a newly visible album-less row must interrupt an unrelated slow history');
  await worker.externalSet({settings:{username:'Friend',infiniteScroll:false}});
  await page.waitForFunction(()=>document.querySelector('[data-case="a"] img').getAttribute('src').endsWith('/wrong.jpg'));
  assert.equal(await page.locator('[data-case="a"] .chartlist-image a').getAttribute('href'),'/music/Wrong/Compilation');
  assert.equal(await page.locator('[data-case="a"] img').getAttribute('srcset'),'https://lastfm-img.freetls.fastly.net/i/u/128s/wrong.jpg 2x');
  const beforeFriend=calls.length;
  const denied=await page.evaluate(async()=>{try{await LastfmPages.getAlbum('/music/Artist/Album');return '';}catch(e){return e.message;}});
  assert.match(denied,/configured profile/);
  assert.equal(calls.length,beforeFriend,'public album lookups must not run on an unconnected profile');
  assert.deepEqual(worker.data.rules,savedBefore,'artwork lookup must never mutate display preferences');
  await page.close();
  console.log('PASS: exact personal album winner, early majority, album-less fallback, visible-only deduplicated covers and profile restoration');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
