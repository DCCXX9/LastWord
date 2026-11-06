const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createMockWorker}=require('./harness.cjs');
const ui={id:'test',url:'chrome-extension://test/itunes.html'},bg={id:'test',url:'chrome-extension://test/background.js'},own={id:'test',url:'https://www.last.fm/user/DCCXX/library',frameId:0};
async function scenario(responses){
 const seed={settings:{username:'DCCXX'},rules:{artists:{a:{from:'A',to:'a'}},tracks:{},albums:{},albumArtists:{}},itunesImportUndo:{id:'keep'},legacyScan:{page:1000},lfmNetworkPause:{until:123}};
 const w=createMockWorker(seed);await w.request('library-cache',{op:'resume'},ui);
 let now=Date.now(),calls=0,onAlarm;const alarms=new Map();
 const chrome={alarms:{create:async(name,value)=>alarms.set(name,value),clear:async name=>alarms.delete(name),onAlarm:{addListener(fn){onAlarm=fn}}},runtime:{},tabs:{query:async()=>[{id:1}],sendMessage:async(_id,m)=>{
  if(m.type==='lfm:status')return {ownProfile:true,username:'DCCXX'};
  if(m.type==='lfm:library-cancel')return {ok:true};
  calls++;const result=responses.shift()||{ok:false,error:'Stop test'};
  if(result.ok)await w.request('library-cache',{op:'page',username:m.username,id:m.id,token:m.token,data:{type:m.group,page:m.page,total:m.page,done:true,items:[m.group==='artists'?{name:'Artist'}:{name:'Song',artist:'Artist'}],skipped:[]}},own);
  return result;
 }}};
 const context=vm.createContext({chrome,console,Date:{now:()=>now}});
 vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../library-cache-job.js'),'utf8'),context);
 context.LastfmLibraryCacheJobs.init(m=>w.request('library-cache',m,bg));
 const settle=async()=>{for(let n=0;n<20;n++)await new Promise(setImmediate)};await settle();
 return {w,seed,alarms,get calls(){return calls},get job(){return w.data.lfmLibraryJobsV1.dccxx},wake:async()=>{await context.LastfmLibraryCacheJobs.wake();await settle()},tick:async(ms)=>{now+=ms;onAlarm({name:'lfm-library-cache'});await settle()},restart:async()=>{vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../library-cache-job.js'),'utf8'),context);context.LastfmLibraryCacheJobs.init(m=>w.request('library-cache',m,bg));await settle()}};
}
(async()=>{
 const transient={ok:false,error:'Last.fm returned HTTP 503. Loading stopped.',retryable:true};
 const s=await scenario([transient,{ok:true},{ok:true},{ok:true}]);
 assert.match(s.job.waiting,/retry 1 of 4/i,'temporary failures must announce a bounded automatic retry');
 assert.equal(s.job.running,true);assert.equal(s.calls,1);assert.equal(s.w.data.lfmLibraryCacheV1.profiles.dccxx.groups.tracks.page,1);
 await s.wake();assert.equal(s.calls,1,'extra wakeups cannot bypass retry delay');
 await s.restart();assert.equal(s.calls,1,'worker restart preserves retry deadline');
 await s.tick(4999);assert.equal(s.calls,1);await s.tick(1);assert.equal(s.calls,4);assert.equal(s.job.running,false);assert.equal(s.job.error,'');assert.equal(s.job.retryCount,0);
 for(const key of Object.keys(s.seed))assert.deepEqual(s.w.data[key],s.seed[key],key+' preserved');
 const exhausted=await scenario(Array(6).fill(transient));for(const ms of [5000,15000,30000,60000])await exhausted.tick(ms);
 assert.equal(exhausted.calls,5,'initial attempt plus four retries');assert.equal(exhausted.job.running,false);assert.match(exhausted.job.error,/4.*retr|retr.*4/i);assert.match(exhausted.job.error,/saved|kept/i);await exhausted.tick(120000);assert.equal(exhausted.calls,5);
 const paused=await scenario([transient,{ok:true}]);await paused.w.request('library-cache',{op:'pause'},ui);await paused.tick(60000);assert.equal(paused.calls,1,'manual pause wins');
 const denied=await scenario([{ok:false,error:'Last.fm redirected away from your library. Check your sign-in.'}]);assert.equal(denied.job.running,false);await denied.tick(60000);assert.equal(denied.calls,1);
 const limited=await scenario([{ok:false,error:'Rate pause',rateLimited:true}]);assert.equal(limited.job.running,true);assert.ok(!limited.job.retryCount,'rate-limit cooldown remains separate');
 console.log('PASS: automatic recovery, persistent backoff, four-retry limit, manual pause, permanent errors, rate-limit separation and saved-data preservation');
})().catch(e=>{console.error(e);process.exitCode=1});
