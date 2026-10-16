const assert = require('node:assert/strict');
const { createMockWorker } = require('./harness.cjs');

const empty = () => ({ artists: {}, albums: {}, tracks: {}, albumArtists: {} });
const preference = (from, to) => ({ op: 'put', type: 'artists', from, to });
const id = from => JSON.stringify([from.toLowerCase()]);
const optionsSender = { id: 'test', url: 'chrome-extension://test/options.html' };
const profileSender = { id: 'test', url: 'https://www.last.fm/user/DCCXX/library' };

(async () => {
  const worker = createMockWorker({
    settings: { username: 'DCCXX', infiniteScroll: true },
    rules: empty(),
    albumlessRules: { existing: { fromTimestamp: 1234 } },
    albumlessScan: { nextPage: 94 },
    unrelated: { value: 'preserve' }
  });
  const change = operations => worker.request('mutate', { operations }, profileSender);
  await Promise.all([
    change([preference('Bladee', 'BLADEE')]),
    change([preference('Ecco2k', 'ECCO2K')])
  ]);
  assert.equal(Object.keys(worker.data.rules.artists).length, 2, 'parallel tab additions must both survive');

  const bladee = structuredClone(worker.data.rules.artists[id('Bladee')]);
  await change([{ op: 'delete', type: 'artists', id: id('Bladee'), expected: bladee }]);
  await change([{ op: 'restore', type: 'artists', id: id('Bladee'), rule: bladee, expected: null }]);
  await change([{ op: 'delete', type: 'artists', id: id('Bladee'), expected: bladee }]);
  await change([preference('Bladee', 'bLaDeE')]);
  await assert.rejects(change([{ op: 'restore', type: 'artists', id: id('Bladee'), rule: bladee, expected: null }]), /another tab/);
  await assert.rejects(change([{ op: 'delete', type: 'artists', id: id('Bladee'), expected: bladee }]), /another tab/);
  assert.equal(worker.data.rules.artists[id('Bladee')].to, 'bLaDeE');

  const beforeAtomic = structuredClone(worker.data);
  await assert.rejects(change([preference('First', 'FIRST'), { op: 'put', type: 'albums', from: 'Album', to: '' }]), /Enter/);
  assert.deepEqual(worker.data, beforeAtomic, 'a failed batch must not partially save');

  const backup = await worker.request('backup', {}, optionsSender);
  assert.deepEqual(backup.extraStorage, {
    albumlessRules: { existing: { fromTimestamp: 1234 } },
    albumlessScan: { nextPage: 94 },
    unrelated: { value: 'preserve' }
  });
  const expectedSnapshot = await worker.request('read');
  const invalid = structuredClone(backup);
  invalid.rules.tracks.bad = { from: 'Broken', to: 'BROKEN' };
  await assert.rejects(worker.request('replace', { backup: invalid, expectedSnapshot }), /original name|invalid display/);
  assert.deepEqual(worker.data, beforeAtomic, 'invalid import must change nothing');

  await change([preference('After export', 'AFTER EXPORT')]);
  await assert.rejects(worker.request('replace', { backup, expectedSnapshot }), /changed while/);
  assert.ok(worker.data.rules.artists[id('After export')], 'stale import must not erase intervening save');
  const latest = await worker.request('read');
  backup.extraStorage.albumlessScan.nextPage = 10;
  backup.extraStorage.restoredExtra = { keep: true };
  await worker.request('replace', { backup, expectedSnapshot: latest });
  assert.equal(worker.data.albumlessScan.nextPage, 94, 'import must preserve newer unknown local keys');
  assert.deepEqual(worker.data.restoredExtra, { keep: true });
  assert.deepEqual(worker.data.unrelated, { value: 'preserve' });

  await assert.rejects(worker.request('mutate', { operations: [preference('Friend', 'FRIEND')] },
    { id: 'test', url: 'https://www.last.fm/user/Friend/library' }), /connected/);
  await assert.rejects(worker.request('mutate', { operations: [preference('Other', 'OTHER')] },
    { id: 'other', url: 'chrome-extension://test/options.html' }), /this extension/);
  await assert.rejects(worker.request('settings', { patch: { username: 'Friend' } }, profileSender), /connected/);
  await worker.request('settings', { patch: { infiniteScroll: false } });
  assert.equal(worker.data.settings.username, 'DCCXX', 'patch must preserve other settings');
  const fresh = await worker.request('backup');
  assert.equal(fresh.settings.infiniteScroll, false, 'export must use current storage');
  const initial = createMockWorker();
  assert.deepEqual((await initial.request('read')).settings, { username: '', infiniteScroll: true });
  assert.equal(initial.writes, 0, 'startup defaults must not migrate or initialize storage');
  assert.deepEqual(initial.data, {});
  console.log('PASS: serialized writes, conflict-safe undo/import, atomic validation, fresh backup, legacy data and profile boundaries');
})().catch(error => { console.error(error); process.exitCode = 1; });
