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
  const before = structuredClone(old.data);
  await assert.rejects(old.request('albumless', {op:'learn', username:'DCCXX', tracks:[{artist:'Demo',track:'Song'}]}), /Unknown preference/);
  assert.deepEqual(old.data, before, 'removed feature requests cannot modify storage');
  const exportData = await old.request('backup');
  assert.deepEqual(exportData.extraStorage.albumlessScan, legacy.albumlessScan);
  console.log('PASS: disconnected defaults, profile isolation, legacy preservation and removed action rejection');
})().catch(error => { console.error(error); process.exitCode=1; });
