const assert = require('node:assert/strict');
require('../rules.js');
const R = globalThis.LastfmRules;
const rules = R.empty();

R.put(rules, 'artists', 'Dean Blunt', 'DEAN BLUNT');
R.put(rules, 'albums', 'Zushi', 'ZUSHI', 'Dean Blunt');
R.put(rules, 'tracks', '11', 'ELEVEN', 'Dean Blunt');
assert.equal(R.get(rules, 'artists', 'dean blunt'), 'DEAN BLUNT');
assert.equal(R.get(rules, 'albums', 'zushi', 'DEAN BLUNT'), 'ZUSHI');
assert.equal(R.get(rules, 'albums', 'zushi', 'Other artist'), null);
assert.equal(R.get(rules, 'tracks', '11', 'Dean Blunt'), null, 'legacy renaming preferences never change displayed titles');

const copy = R.clean(JSON.parse(JSON.stringify(rules)));
assert.equal(R.get(copy, 'artists', 'DEAN BLUNT'), 'DEAN BLUNT');
R.put(copy, 'artists', 'Dean Blunt', 'Dean Blunt');
assert.equal(R.get(copy, 'artists', 'Dean Blunt'), null);

const many = R.empty();
for (let i = 0; i < 5000; i++) {
  R.put(many, 'artists', 'Artist ' + i, 'ARTIST ' + i);
}
assert.equal(R.get(many, 'artists', 'artist 4999'), 'ARTIST 4999');
assert.ok(Buffer.byteLength(JSON.stringify(many)) < 1024 * 1024);
console.log('PASS: scoped rules, case matching, deletion, JSON round-trip, 5,000 entries');
