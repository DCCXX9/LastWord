const assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const {createMockWorker,libraryCache}=require('./harness.cjs');
(async()=>{
 const cached=libraryCache('DCCXX',[]);for(let n=0;n<50000;n++)cached.profiles.dccxx.groups.tracks.items[JSON.stringify(['artist','song '+n])]={name:'Song '+n,artist:'Artist'};
 const w=createMockWorker({settings:{username:'DCCXX'},lfmLibraryCacheV1:cached}),get=w.chrome.storage.local.get;let reads=0;
 w.chrome.storage.local.get=async keys=>{if(keys===null||keys.includes('lfmLibraryCacheV1'))reads++;return get(keys)};
 const start=performance.now();
 for(let n=0;n<20;n++)await w.request('library-cache',{op:'info'},{id:'test',url:'chrome-extension://test/itunes.html'});
 console.log(JSON.stringify({names:50000,statusCalls:20,wholeCacheReads:reads,milliseconds:Math.round(performance.now()-start)}));
 assert.ok(reads<=1,'repeated status queries must not deserialize a 50,000-name library every time');
 const newer=structuredClone(cached);newer.profiles.dccxx.groups.tracks.items['["artist","new"]']={name:'New',artist:'Artist'};
 await w.externalSet({lfmLibraryCacheV1:newer});
 assert.equal((await w.request('library-cache',{op:'info'})).cache.groups.tracks.count,50001,'external changes invalidate the view');
 await w.chrome.storage.local.remove('lfmLibraryCacheV1');
 assert.equal((await w.request('library-cache',{op:'info'})).cache,undefined,'removal is visible immediately');
 console.log('PASS: repeated large-cache metadata reads reuse a coherent worker view; external updates/removal stay visible');
})().catch(e=>{console.error(e);process.exitCode=1});
