const assert=require('node:assert/strict');const{createMockWorker,libraryCache}=require('./harness.cjs');
(async()=>{
 const cached=libraryCache('DCCXX',[]);for(let n=0;n<50000;n++)cached.profiles.dccxx.groups.tracks.items[JSON.stringify(['artist','song '+n])]={name:'Song '+n,artist:'Artist'};
 const w=createMockWorker({settings:{username:'DCCXX'},lfmLibraryCacheV1:cached,itunesImportUndo:{large:'x'.repeat(1000000)}}),reads=[],writes=[];
 const get=w.chrome.storage.local.get,set=w.chrome.storage.local.set;
 w.chrome.storage.local.get=async keys=>{reads.push(keys);return get(keys)};
 w.chrome.storage.local.set=async values=>{writes.push(Object.keys(values));return set(values)};
 await w.request('read');assert.ok(reads.every(keys=>keys!==null&&!keys.includes('lfmLibraryCacheV1')&&!keys.includes('itunesImportUndo')),'normal page preference reads must not deserialize the entire cache and undo');
 reads.length=0;await w.request('library-cache',{op:'active'});assert.ok(reads.every(keys=>keys!==null&&!keys.includes('lfmLibraryCacheV1')),'per-request job guard reads metadata only');
 await w.request('library-cache',{op:'pause'},{id:'test',url:'chrome-extension://test/itunes.html'});
 assert.ok(writes.every(keys=>!keys.includes('lfmLibraryCacheV1')),'pausing must not broadcast the entire cache to every tab');
 console.log('PASS: 50,000-name cache excluded from ordinary page reads and job guards; pause does not rewrite or broadcast cache');
})().catch(e=>{console.error(e);process.exitCode=1});
