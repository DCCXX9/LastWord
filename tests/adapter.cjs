const assert = require('node:assert/strict');
require('../adapter.js');
const A = globalThis.LastfmAdapter;
const base = 'https://www.last.fm/user/DCCXX/library';
assert.equal(A.ownProfile(base, 'dccxx'), true);
assert.equal(A.ownProfile(base.replace('DCCXX', 'Friend'), 'DCCXX'), false);
assert.equal(A.ownProfile('https://other.example/user/DCCXX', 'DCCXX'), false);
for(const path of ['/music/Artist','/music/+noredirect/Artist/+tracks','/music/Artist/']) assert.equal(A.publicArtistPage('https://www.last.fm'+path),true);
for(const path of ['/music/Artist/Album','/music/Artist/_/Track','/music/Artist/+images','/user/Friend/library','/music/']) assert.equal(A.publicArtistPage('https://www.last.fm'+path),false);
assert.equal(A.publicArtistPage('https://evil.example/music/Artist'),false);
// The same scope check runs in the background worker, whose origin is the extension.
globalThis.location={href:'chrome-extension://test/background.js'};
assert.equal(A.publicArtistPage('https://www.last.fm/music/Artist'),true);
assert.equal(A.publicArtistPage('https://evil.example/music/Artist'),false);
delete globalThis.location;
assert.deepEqual(A.musicItem('/music/+noredirect/Bladee+%26+Ecco2k'),
  { type: 'artists', artist: 'Bladee & Ecco2k', name: 'Bladee & Ecco2k' });
assert.deepEqual(A.musicItem(base + '/music/Dean+Blunt/Zushi/11'),
  { type: 'tracks', artist: 'Dean Blunt', name: '11' });
assert.deepEqual(A.musicItem(base + '/music/+noredirect/Dean+Blunt/_/11'),
  { type: 'tracks', artist: 'Dean Blunt', name: '11' });
assert.equal(A.musicItem('https://other.example/music/Test'), null);
for (const [path, view] of [['', 'scrobbles'], ['/scrobbles', 'scrobbles'], ['/artists', 'artists'],
  ['/albums', 'albums'], ['/tracks', 'tracks'], ['/music/A', 'artistScrobbles'],
  ['/music/+noredirect/A/+albums', 'artistAlbums'], ['/music/A/+tracks', 'tracks']]) {
  assert.equal(A.libraryView(base + path), view);
}
assert.equal(A.libraryView(base + '/music/A/_/Track'), null);
const next = href => ({ querySelector: () => ({ getAttribute: () => href }) });
assert.equal(A.nextPage(next('?page=2'), base), base + '?page=2');
assert.equal(A.nextPage(next('?page=2'), base + '?page=2'), null);
assert.equal(A.nextPage(next('?page=3'), base + '?from=2026-01-01'), null);
assert.equal(A.nextPage(next('/user/Friend/library?page=2'), base), null);
assert.equal(A.nextPage(next('?from=2026-01-01&page=2'), base + '?from=2026-01-01'), base + '?from=2026-01-01&page=2');

// Reconstructed from the user-reported names/action, not a captured live DOM.
const values = { artist_name: 'Dean Blunt', track_name: '11', album_name: '',
  album_artist_name: '', timestamp: '1700000000' };
const form = (fields, action = '/user/DCCXX/library/edit-track') => ({
  elements: Object.entries(fields).map(([name, value]) => ({ name, value })),
  matches: () => true, getAttribute: () => action, method: 'post'
});
assert.deepEqual(A.editRow(form(values), base, 'DCCXX'), { artist: 'Dean Blunt', track: '11',
  album: '', albumArtist: '', timestamp: '1700000000', action: base + '/edit-track' });
assert.equal(A.editRow(form(values, '/user/DCCXX/library/edit'), base, 'DCCXX'), null);
assert.equal(A.editRow(form(values), base, 'Friend'), null);
assert.equal(A.editRow(form({ ...values, timestamp: '' }), base, 'DCCXX'), null);
const missing = { ...values }; delete missing.album_name;
assert.equal(A.editRow(form(missing), base, 'DCCXX'), null);
assert.equal(A.editRow(form(missing), base, 'DCCXX', true), null, 'one omitted album field stays invalid');
delete missing.album_artist_name;
assert.equal(A.editRow(form(missing), base, 'DCCXX'), null, 'edit callers retain strict defaults');
assert.equal(A.editRow(form(missing), base, 'DCCXX', true).album, '');
assert.equal(A.editRow(form(missing), base, 'DCCXX', true).albumArtist, '');
const duplicate = form(missing); duplicate.elements.push({name:'album_name',value:''},{name:'album_name',value:''});
assert.equal(A.editRow(duplicate, base, 'DCCXX', true), null, 'duplicate fields are never classified as absent');
const pairs = Object.fromEntries(Object.entries(values).filter(([name]) => name !== 'timestamp')
  .flatMap(([name, value]) => [[name + '_original', value], [name, value]]));
assert.equal(A.editPairs(form(pairs)).album.from, '');
assert.equal(A.editPairs(form({ ...pairs, track_name: 'ELEVEN' })).track.to, 'ELEVEN');
delete pairs.track_name_original;
assert.equal(A.editPairs(form(pairs)), null);
assert.equal(A.editPairs(form({ before: '11', after: 'ELEVEN' })), null);
const albumPairs = {album_name_original:'LUH LEAKYZ Vol. 1',album_name:'Luh Leakyz Vol. 1',
  album_artist_name_original:'Yeat',album_artist_name:'YEAT'};
assert.equal(A.editPairs(form(albumPairs)),null,'track callers stay strict');
assert.deepEqual(A.editPairs(form(albumPairs),'album'),{
  album:{from:'LUH LEAKYZ Vol. 1',to:'Luh Leakyz Vol. 1'},albumArtist:{from:'Yeat',to:'YEAT'}});
const incompleteAlbum={...albumPairs}; delete incompleteAlbum.album_artist_name_original;
assert.equal(A.editPairs(form(incompleteAlbum),'album'),null,'incomplete album pairs rejected');
const duplicateAlbum=form(albumPairs); duplicateAlbum.elements.push({name:'album_name',value:'Other'});
assert.equal(A.editPairs(duplicateAlbum,'album'),null,'duplicate album fields rejected');
assert.equal(A.editPairs(form({...albumPairs,artist_name:'Yeat',artist_name_original:'Yeat'}),'album'),null,
  'unexpected extra editable pairs are not ignored');
console.log('PASS: shared URL, pagination and exact form-field contracts; unsupported forms rejected');
