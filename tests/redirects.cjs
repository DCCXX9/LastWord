const assert = require('node:assert/strict');
require('../adapter.js');
require('../redirects.js');
const D = globalThis.LastfmRedirects, A = globalThis.LastfmAdapter;
const settings = { username: 'DCCXX', redirectProtection: true };
const base = 'https://www.last.fm/user/DCCXX/library';
const protect = (value, identity) => D.protect(value, settings, base, identity);
for (const artist of ['Travis+Scott', 'lucki', 'LUCKI', 'Drug+Church', 'Radiohead', 'Yeat', 'Bj%C3%B6rk', 'Lucky+Twice', 'Travi$+Scott', 'Lucki+Eck$', 'Luckiness']) {
  for (const suffix of ['', '/+tracks', '/Album', '/_/Song', '/Album/Song', '/edit', '/_/delete']) {
    const path = `/music/${artist}${suffix}?from=2026-01-01&page=2#tracks`;
    assert.equal(protect(path), 'https://www.last.fm' + path.replace('/music/', '/music/+noredirect/'));
    assert.equal(protect(protect(path)), protect(path), 'idempotent');
    const library = '/user/DCCXX/library' + path;
    assert.equal(protect(library), 'https://www.last.fm' + library.replace('/music/', '/music/+noredirect/'));
  }
}
for (const path of ['/music/Lucki/+images/abc', '/music/Lucki/Album/+images',
  '/music/Lucki/+wiki/edit', '/user/Friend/library/music/Lucki', '/user/DCCXX/library/edit-track',
  'https://other.example/music/Lucki', 'http://www.last.fm/music/Lucki', '//evil.example/music/Lucki',
  'javascript:alert(1)', '/music/%E0%A4%A']) assert.equal(protect(path), path, path);
assert.equal(D.protect('/music/Lucki', {...settings, redirectProtection:false},base), '/music/Lucki');
assert.equal(D.protect('/music/Lucki', {username:''},base), '/music/Lucki');
const original = {artist:'Lucki', track:'Song', album:'Album'};
assert.equal(protect('/music/Lucky+Twice/_/Song', original), 'https://www.last.fm/music/+noredirect/Lucki/_/Song');
assert.equal(protect('/music/Lucky+Twice/Album', original), 'https://www.last.fm/music/+noredirect/Lucki/Album');
assert.equal(protect('/music/Lucky+Twice/_/Other', original), 'https://www.last.fm/music/+noredirect/Lucky+Twice/_/Other');
assert.equal(protect('/music/Lucky+Twice/Other', original), 'https://www.last.fm/music/+noredirect/Lucky+Twice/Other');
assert.equal(protect('/music/Other/_/Song', original), 'https://www.last.fm/music/+noredirect/Lucki/_/Song');
assert.equal(protect('/music/Travi$+Scott', {artist:'Travis Scott'}), 'https://www.last.fm/music/+noredirect/Travis+Scott');
assert.equal(D.samePagePath(base+'/music/Lucki/+tracks',base+'/music/+noredirect/Lucki/+tracks'),true);
assert.equal(D.samePagePath(base+'/music/Lucki/+tracks',base+'/music/+noredirect/Lucky+Twice/+tracks'),false);
const next = href => ({querySelector:()=>({getAttribute:()=>href})});
assert.equal(A.nextPage(next('?page=2'),base+'/music/+noredirect/Lucki/+tracks'),base+'/music/+noredirect/Lucki/+tracks?page=2');
assert.equal(A.nextPage(next(base+'/music/Lucki/+tracks?page=2'),base+'/music/+noredirect/Lucki/+tracks'),base+'/music/Lucki/+tracks?page=2');
assert.equal(A.nextPage(next(base+'/music/Lucki/+tracks?page=2&from=2026'),base+'/music/+noredirect/Lucki/+tracks'),null);
console.log('PASS: exact protected identities, nested routes, encoded tails/filters, verified raw aliases and pagination boundaries');

assert.equal(protect('/music/Canonical/_/Song', {artist:'Original',track:'Song'}), 'https://www.last.fm/music/+noredirect/Original/_/Song');
assert.equal(D.samePagePath(base+'/music/Drug+Church/Album',base+'/music/+noredirect/Drug+Church/Album'),true);
