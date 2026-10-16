const assert = require('node:assert/strict');
const { createMockWorker } = require('./harness.cjs');
(async () => {
  const fresh = createMockWorker();
  assert.equal((await fresh.request('read')).settings.username, '', 'fresh installs must not connect to Jay');
  assert.equal(fresh.writes, 0);
  const backup = await fresh.request('backup');
  await fresh.request('replace', { backup, expectedSnapshot: await fresh.request('read') });
  await assert.rejects(fresh.request('itunes-apply', { entries: [], username: '' }), /connect.*profile/i);
  await assert.rejects(fresh.request('mutate', { operations: [{op:'put',type:'artists',from:'Demo',to:'DEMO'}] }), /connect.*profile/i);
  await fresh.request('settings', { patch: { username: 'DemoListener', infiniteScroll: true } });
  assert.equal((await fresh.request('read')).settings.username, 'DemoListener');
  const user = {id:'test',url:'https://www.last.fm/user/DemoListener/library'};
  await fresh.request('mutate', { operations: [{op:'put',type:'artists',from:'Demo',to:'DEMO'}] }, user);
  await assert.rejects(fresh.request('mutate', { operations: [{op:'put',type:'artists',from:'Other',to:'OTHER'}] },
    {id:'test',url:'https://www.last.fm/user/Friend/library'}), /connected/);

  const legacy = { settings:{username:'DCCXX',infiniteScroll:true},
    rules:{artists:{},albums:{},tracks:{},albumArtists:{}}, itunesImportUndo:null,
    albumlessScan:{nextPage:94}, untouched:{private:'preserve'} };
  const old = createMockWorker(legacy);
  assert.equal((await old.request('read')).settings.username, 'DCCXX');
  assert.deepEqual(old.data, legacy); assert.equal(old.writes, 0);
  const extension = {id:'test',url:'chrome-extension://test/albumless.html'};
  const req = (op, values={}) => old.request('albumless', {op,username:'DCCXX',...values}, extension);
  const state = await req('read');
  await assert.rejects(req('configure', {enabled:true,revision:state.revision}), /unavailable.*beta/i);
  await req('learn', {tracks:[{artist:'Demo',track:'Song'}]});
  const saved = old.data.lfmAlbumlessV1;
  saved.profiles.dccxx.enabled = true; // simulate a previously enabled installation
  const before = structuredClone(old.data);
  await assert.rejects(req('reserve', {item:{artist:'Demo',track:'Song',timestamp:String(Math.floor(Date.now()/1000)+1)}}), /unavailable.*beta/i);
  assert.deepEqual(old.data, before, 'beta gate preserves previously enabled records without making an attempt');
  const exportData = await old.request('backup');
  assert.deepEqual(exportData.extraStorage.lfmAlbumlessV1, saved);
  console.log('PASS: disconnected defaults, profile isolation, empty backup restore, legacy preservation and hard beta write gate');
})().catch(error => { console.error(error); process.exitCode=1; });
