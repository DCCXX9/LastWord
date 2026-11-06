const assert=require('node:assert/strict');
require('../rules.js');global.crypto=require('node:crypto').webcrypto;require('../library-cache.js');require('../library-casing.js');
const C=LastfmLibraryCache,R=LastfmRules,cache=C.create('DCCXX');
const records=[{name:'Song',artist:'Artist'},{name:'Same',artist:'Artist'},{name:'Only Plain (feat. Guest)',artist:'Artist'},{name:'Bonus (Deluxe)',artist:'Artist'},{name:'Other Song',artist:'Other'},{name:'A  B',artist:'Artist'}];
C.accept(cache,{type:'tracks',page:1,total:1,done:true,items:records});
C.accept(cache,{type:'artists',page:1,total:1,done:true,items:[{name:'Artist'}]});
C.accept(cache,{type:'albums',page:1,total:1,done:true,items:[{name:'Album',artist:'Artist'}]});
const scan=LastfmLibraryCasing.fromTracks([
{Name:'song',Artist:'artist',Album:'album'}, {Name:'Same',Artist:'Artist'},
{Name:'Only Plain',Artist:'Artist'}, {Name:'Bonus',Artist:'Artist'}, {Name:'Other Song',Artist:'Artist'},
{Name:'A B',Artist:'Artist'}, {Name:'Absent',Artist:'Artist'}]);
const matched=C.compare(scan,cache,R.empty());
assert.deepEqual(matched.candidates.filter(x=>x.type==='tracks').map(x=>[x.before,x.to]),[['Song','song']]);
assert.equal(matched.candidates.find(x=>x.type==='albums').before,'Album');
const rules=R.empty();R.put(rules,'tracks','Song','SONG','Artist',true);
assert.equal(C.compare(scan,cache,rules).candidates.find(x=>x.type==='tracks').before,'SONG');
R.put(rules,'tracks','Song','song','Artist',true);
assert.equal(C.compare(scan,cache,rules).candidates.filter(x=>x.type==='tracks').length,0);
assert.throws(()=>C.accept(cache,{type:'tracks',page:1,total:1,done:true,items:[]}),/cache changed/);
for(const [a,b]of [['Song (feat. Artist)','Song'],['Song!','Song'],['A  B','A B'],['café','cafe']])assert.equal(C.spelling(a,b),false);
assert.equal(C.spelling('sONG','Song'),true);
const ambiguous=C.create('DCCXX');
C.accept(ambiguous,{type:'tracks',page:1,total:2,done:false,items:[{name:'Song',artist:'Artist'}]});
assert.equal(C.compare(scan,ambiguous,R.empty()).candidates.filter(x=>x.type==='tracks').length,1,'partial caches prove observed presence only');
C.accept(ambiguous,{type:'tracks',page:2,total:2,done:true,items:[{name:'SONG',artist:'Artist'}]});
assert.equal(C.compare(scan,ambiguous,R.empty()).candidates.length,0,'ambiguous raw casings cannot supply a single Before');
console.log('PASS: exact library intersection, artist scope, unchanged exclusion, raw/display before casing, no suffix punctuation whitespace or accent changes');
