const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createMockWorker}=require('./harness.cjs');
const ui={id:'test',url:'chrome-extension://test/itunes.html'},bg={id:'test',url:'chrome-extension://test/background.js'};
const job=fs.readFileSync(path.join(__dirname,'../library-cache-job.js'),'utf8');
// The worker downloads pages itself: no Last.fm tab exists in these scenarios.
async function scenario(responses){
 const seed={settings:{username:'DCCXX'},rules:{artists:{a:{from:'A',to:'a'}},tracks:{},albums:{},albumArtists:{}},itunesImportUndo:{id:'keep'},legacyScan:{page:1000},lfmNetworkPause:{until:123}};
 const w=createMockWorker(seed);await w.request('library-cache',{op:'resume'},ui);
 let now=Date.now(),calls=0,onAlarm;const alarms=new Map();
 const chrome={alarms:{create:async(name,value)=>alarms.set(name,value),clear:async name=>alarms.delete(name),onAlarm:{addListener(fn){onAlarm=fn}}},runtime:{}};
 const LastfmLibraryFetch={page:async m=>{calls++;const result=responses.shift()||{error:Object.assign(Error('Stop test'),{})};if(result.error)throw result.error;return {type:m.group,page:m.page,total:m.page,done:true,items:[m.group==='artists'?{name:'Artist'}:{name:'Song',artist:'Artist'}],skipped:[]}}};
 const context=vm.createContext({chrome,console,Date:{now:()=>now},setTimeout,clearTimeout,AbortController,LastfmLibraryFetch});
 const load=async()=>{vm.runInContext(job,context);context.LastfmLibraryCacheJobs.init(m=>w.request('library-cache',m,bg));await settle()};
 const settle=async()=>{for(let n=0;n<30;n++)await new Promise(setImmediate)};await load();
 return {w,seed,alarms,get calls(){return calls},get job(){return w.data.lfmLibraryJobsV1.dccxx},get cache(){return w.data.lfmLibraryCacheV1.profiles.dccxx},
  wake:async()=>{await context.LastfmLibraryCacheJobs.wake();await settle()},tick:async(ms)=>{now+=ms;onAlarm({name:'lfm-library-cache'});await settle()},restart:load};
}
const ok={},fail=(message,extra={})=>({error:Object.assign(Error(message),extra)});
(async()=>{
 const transient=fail('Last.fm returned HTTP 503. Loading stopped.',{retryable:true});
 const s=await scenario([transient,ok,ok,ok]);
 assert.equal(s.calls,1,'caching starts with no Last.fm tab open');
 assert.match(s.job.waiting,/trying again in 5 seconds/i,'temporary failures announce an automatic retry');
 assert.equal(s.job.running,true);assert.equal(s.job.error,'');assert.equal(s.cache.groups.tracks.page,1);
 await s.wake();assert.equal(s.calls,1,'extra wakeups cannot bypass the retry delay');
 await s.restart();assert.equal(s.calls,1,'worker restart preserves the retry deadline');
 await s.tick(4999);assert.equal(s.calls,1);await s.tick(1);assert.equal(s.calls,4);assert.equal(s.job.running,false);assert.equal(s.job.error,'');assert.equal(s.job.retryCount,0);
 for(const key of Object.keys(s.seed))assert.deepEqual(s.w.data[key],s.seed[key],key+' preserved');
 // Caching never gives up: it keeps retrying (at most every five minutes) until complete.
 const stubborn=await scenario([...Array(8).fill(transient),ok,ok,ok]);
 for(const ms of [5000,15000,30000,60000,300000,300000])await stubborn.tick(ms);
 assert.equal(stubborn.calls,7);assert.equal(stubborn.job.running,true,'repeated failures never stop caching');assert.equal(stubborn.job.error,'');assert.match(stubborn.job.waiting,/5 minutes/);
 await stubborn.tick(299000);assert.equal(stubborn.calls,7,'retries are capped at one per five minutes');
 await stubborn.tick(1000);await stubborn.tick(300000);assert.equal(stubborn.job.running,false,'caching completes once Last.fm recovers');assert.equal(stubborn.cache.groups.artists.done,true);
 // Errors that used to stop the job (redirects, unverified pages) now wait and retry too.
 const odd=await scenario([fail('Last.fm returned a different library page.'),ok,ok,ok]);
 assert.equal(odd.job.running,true);assert.equal(odd.job.error,'');await odd.tick(5000);assert.equal(odd.job.running,false);assert.equal(odd.cache.groups.artists.done,true);
 // Last.fm's own break or the request budget sets the wait time; it is not a failed attempt.
 const limited=await scenario([fail('Last.fm asked for a break.',{rateLimited:true,retryAt:Date.now()+120000}),ok,ok,ok]);
 assert.equal(limited.job.running,true);assert.ok(!limited.job.retryCount,'rate-limit cooldown is not a failed retry');
 await limited.tick(60000);assert.equal(limited.calls,1,'waits for the whole cooldown');await limited.tick(61000);assert.equal(limited.job.running,false);
 // Only Pause stops it.
 const paused=await scenario([transient,ok]);await paused.w.request('library-cache',{op:'pause'},ui);await paused.tick(60000);assert.equal(paused.calls,1,'manual pause wins');
 console.log('PASS: tab-free background caching, persistent backoff, never-ending capped retries, former stop errors retried, rate-limit waits, manual pause and saved-data preservation');
})().catch(e=>{console.error(e);process.exitCode=1});
