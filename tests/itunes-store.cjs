const assert = require('node:assert/strict');
const { createMockWorker, libraryCache } = require('./harness.cjs');
const empty = () => ({artists:{},albums:{},tracks:{},albumArtists:{}});
const entry = (name, expected = null, type = 'artists', artist) => ({
  type, id: JSON.stringify(type === 'tracks' || type === 'albums'
    ? [artist.toLowerCase(),name.toLowerCase()] : [name.toLowerCase()]),
  rule:{from:name.toLowerCase(),to:name,...(artist?{artist}:{}),exact:true},expected
});
(async()=>{
 const rules=empty(); rules.artists['["bladee"]']={from:'Bladee',to:'BLADEE'};
 const guarded=createMockWorker({settings:{username:'DCCXX'}});
 const origin='chrome-extension://test/itunes.html';
 const started=await guarded.request('library-cache',{op:'start',username:'DCCXX'},{id:'test',url:origin});
 const pageData={type:'tracks',page:1,total:1,done:true,items:[{name:'Song',artist:'Artist'}]};
 for(const sender of [{id:'test',url:origin},{id:'test',url:'https://www.last.fm/user/DCCXX/library',frameId:1},{id:'test',url:'https://www.last.fm/user/Friend/library',frameId:0},{id:'test',url:'https://www.last.fm/user/DCCXX/library',frameId:0}]){
  await assert.rejects(guarded.request('library-cache',{op:'page',username:'DCCXX',id:started.id,data:pageData},sender),/connected|Library pages/);
 }
 await guarded.request('library-cache',{op:'page',username:'DCCXX',id:started.id,data:pageData},{id:'test',url:'chrome-extension://test/background.js'});
 assert.equal((await guarded.request('library-cache',{op:'read'})).groups.tracks.page,2);
 const settings={username:'DCCXX',infiniteScroll:true};
 const worker=createMockWorker({settings,rules,legacyScan:{page:93}});
 const apply=async entries=>{
   const fixture=libraryCache('DCCXX',entries), old=worker.data.lfmLibraryCacheV1?.profiles.dccxx;
   if(old) for(const type of ['artists','albums','tracks']) fixture.profiles.dccxx.groups[type].items={...old.groups[type].items,...fixture.profiles.dccxx.groups[type].items};
   await worker.externalSet({lfmLibraryCacheV1:fixture});
   return worker.request('itunes-apply',{entries,username:'DCCXX',cacheId:'test-library'});
 };
 const result=await apply([entry('bladee',rules.artists['["bladee"]']),entry('ecco2k'),entry('Hold Me',null,'tracks','Ecco2k')]);
 assert.equal(result.applied,3);
 assert.equal((await worker.request('read')).rules.artists['["bladee"]'].to,'bladee');
 assert.equal(worker.data.rules.artists['["ecco2k"]'].exact,true,'lowercase names remain explicit display rules');
 const reopened=createMockWorker(worker.data);
 assert.equal((await reopened.request('itunes-status')).batch.id,result.batch.id,'revert survives reopening/restart');
 await worker.request('mutate',{operations:[{op:'put',type:'artists',from:'ecco2k',to:'ECCO2K'}]});
 await worker.request('mutate',{operations:[{op:'put',type:'artists',from:'ecco2k',to:'ecco2k'}]});
 const reverted=await worker.request('itunes-revert',{id:result.batch.id});
 assert.equal(reverted.reverted,2); assert.equal(reverted.kept,1);
 assert.deepEqual(worker.data.rules.artists['["bladee"]'],rules.artists['["bladee"]']);
 assert.equal(worker.data.rules.artists['["ecco2k"]'].to,'ecco2k','later same-value edit survives revert');
 assert.deepEqual(worker.data.rules.tracks,{}); assert.equal(worker.data.legacyScan.page,93);
 await assert.rejects(worker.request('itunes-revert',{id:result.batch.id}),/latest/);
 const before=structuredClone(worker.data);
 await assert.rejects(apply([entry('New'),entry('bladee')]),/another tab/);
 assert.deepEqual({...worker.data,lfmLibraryCacheV1:undefined},{...before,lfmLibraryCacheV1:undefined},'conflict means no partial preference apply');
 await assert.rejects(apply([entry('New'),entry('New')]),/duplicate/);
 const invalid=entry('Wrong'); invalid.rule.from='other';
 await assert.rejects(apply([invalid]),/invalid|casing/);
 await assert.rejects(worker.request('itunes-apply',{entries:[entry('New')],username:'Friend'}),/profile changed/);
 await assert.rejects(worker.request('itunes-apply',{entries:[entry('Not Scrobbled')],username:'DCCXX',cacheId:'test-library'}),/exact spelling/);
 await assert.rejects(worker.request('itunes-apply',{entries:[entry('New')],username:'DCCXX',cacheId:'stale'}),/comparing/);
 await assert.rejects(worker.request('mutate',{operations:[{op:'put',type:'tracks',artist:'Artist',from:'Song (feat. Guest)',to:'Song'}]}),/Only letter casing/);
 const denied={id:'test',url:'https://www.last.fm/user/DCCXX/library'};
 await assert.rejects(worker.request('itunes-apply',{entries:[entry('New')],username:'DCCXX'},denied),/connected/);
 const first=await apply([entry('First')]);
 const noop=await apply([entry('First',worker.data.rules.artists['["first"]'])]);
 assert.equal(noop.applied,0); assert.equal(noop.batch.id,first.batch.id);
 const second=await apply([entry('Second')]);
 await assert.rejects(worker.request('itunes-revert',{id:first.batch.id}),/latest/);
 await worker.request('itunes-revert',{id:second.batch.id});
 assert.ok(worker.data.rules.artists['["first"]'],'only latest import reverts');
 const many=await apply(Array.from({length:2500},(_,n)=>entry('song '+n,null,'tracks','artist')));
 assert.equal(many.applied,2500);
 const backup=await worker.request('backup');
 assert.ok(backup.extraStorage.itunesImportUndo);
 const fresh=createMockWorker();
 await fresh.request('replace',{backup,expectedSnapshot:await fresh.request('read')});
 assert.equal(fresh.data.rules.tracks['["artist","song 2499"]'].exact,true);
 assert.equal((await fresh.request('itunes-status')).batch,null,'full backup restore must not revive an old XML undo action');
 await assert.rejects(fresh.request('itunes-revert',{id:many.batch.id}),/latest/);
 assert.equal(Object.keys(fresh.data.rules.tracks).length,2500);
 await worker.request('replace',{backup,expectedSnapshot:await worker.request('read')});
 assert.equal((await worker.request('itunes-status')).batch,null,'full restore also invalidates an existing active undo action');
 const failure=createMockWorker({settings,lfmLibraryCacheV1:libraryCache('DCCXX',[entry('Test')])});
 failure.chrome.storage.local.set=async()=>{throw new Error('QUOTA_BYTES quota exceeded');};
 const failedBefore=structuredClone(failure.data);
 await assert.rejects(failure.request('itunes-apply',{entries:[entry('Test')],username:'DCCXX',cacheId:'test-library'}),/storage/);
 assert.deepEqual(failure.data,failedBefore,'failed storage write leaves rules and undo untouched');
 console.log('PASS: exact casing, atomic import, persistent selective revert, later edits, conflicts, 2500 tracks, backup and quota failure');
})().catch(error=>{console.error(error);process.exitCode=1});
