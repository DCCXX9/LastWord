const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
for (const file of ['rules.js', 'library-casing.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
}
const C = context.LastfmLibraryCasing;
const plain = value => JSON.parse(JSON.stringify(value));
assert.equal(C.VERSION, 1);
const records = [
  { Name: 'café', Artist: 'mY aRTIST', Album: 'ALBUM', 'Album Artist': 'Various Artists', Location: 'private/file.mp3', 'Persistent ID': 'private-id' },
  { Name: 'Cafe\u0301', Artist: 'MY ARTIST', Album: 'Album', 'Album Artist': 'Various Artists' },
  { Name: 'café', Artist: 'Other Artist', Album: 'ALBUM' },
  { Name: 'lowercase', Artist: 'mY aRTIST' },
  { Name: 'Missing artist' }
];
const result = plain(C.fromTracks(records));
assert.equal(result.songs, 5);
assert.equal(result.skipped, 1);
const songs = result.candidates.filter(x => x.type === 'tracks');
assert.equal(songs.length, 3, 'same title under different artists remains separate');
assert.deepEqual(songs[0].variants, ['café', 'Café'], 'conflicting XML casing needs a choice');
assert.equal(songs[0].occurrences, 2);
assert.equal(songs[2].to, 'lowercase', 'unchanged lowercase remains an explicit preference');
const albums = result.candidates.filter(x => x.type === 'albums');
assert.equal(albums.length, 3, 'compilations include track-artist and album-artist scopes');
assert.deepEqual(albums[0].variants, ['ALBUM', 'Album']);
assert.equal(albums[1].artist, 'Various Artists');
assert.equal(JSON.stringify(result).includes('private'), false, 'paths and persistent IDs never enter the casing plan');
assert.equal(records[0].Artist, 'mY aRTIST', 'input is never modified');
const bad = plain(C.fromTracks([null, [], { Name: 'Song', Artist: 42 },
  { Name: 'Song', Artist: 'A', Album: 42, 'Album Artist': false }]));
assert.equal(bad.songs, 4); assert.equal(bad.skipped, 3);
assert.equal(bad.candidates.length, 2, 'invalid optional album fields do not invent rules');
assert.throws(() => C.fromTracks({}), /array/i);
const collector = C.createCollector();
collector.skipTrack('Malformed track skipped.');
for (let n = 0; n < 5000; n++) collector.addTrack({ Name: 'Song ' + n, Artist: 'Artist ' + n % 10 });
assert.equal(collector.counts().processed, 5001);
assert.equal(collector.result().candidates.filter(x => x.type === 'tracks').length, 5000);
assert.equal(collector.result().skipped, 1);
console.log('PASS: shared library casing contract, exact spellings, Unicode/conflicts, compilation scopes, 5000 songs and private-field exclusion');
