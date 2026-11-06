/* Sole-writer operations for cache snapshots and persistent background jobs. */
(() => {
 'use strict';
 const C=LastfmLibraryCache,R=LastfmRules,JOBS='lfmLibraryJobsV1';
 async function execute(m,current,stored,sender){
  const key=R.normalize(current.settings.username),root={version:1,...stored[C.KEY],profiles:{...stored[C.KEY]?.profiles},drafts:{...stored[C.KEY]?.drafts}},jobs={...stored[JOBS]},cache=root.profiles[key],draft=root.drafts[key];let job=jobs[key]||{running:false,mode:'resume',error:'',waiting:''};
  const trusted=sender.url===`chrome-extension://${chrome.runtime.id}/background.js`;
  const ui=sender.url===`chrome-extension://${chrome.runtime.id}/itunes.html`||sender.url===`chrome-extension://${chrome.runtime.id}/popup.html`;
  const target=()=>job.mode==='rebuild'?root.drafts[key]:root.profiles[key];
  const info=()=>({username:current.settings.username,cache:C.status(root.profiles[key]),draft:C.status(root.drafts[key]),job,skipped:C.skipped(root.profiles[key]),workSkipped:C.skipped(root.drafts[key])});
  let cacheChanged=false;
  const save=()=>chrome.storage.local.set({...cacheChanged?{[C.KEY]:root}:{},[JOBS]:jobs});
  if(m.op==='active')return {username:current.settings.username,running:job.running,token:job.token};
  if(m.op==='read')return cache||null;
  if(m.op==='info')return info();
  if(m.op==='plan'&&!current.settings.username)return null;
  if(!current.settings.username)throw Error('Connect your Last.fm profile first.');
  if(['start','page'].includes(m.op)&&m.username!==current.settings.username)throw Error('Your connected profile changed.');
  if(m.op==='plan'){
   if(!trusted)throw Error('Background cache operation only.');
   const c=target();if(!job.running||!c)return null;
   const retry=job.mode==='retry',head=retry?job.remaining?.[0]:null,type=retry?head?.type:C.TYPES.find(t=>!c.groups[t].done);
   return type?{username:current.settings.username,id:c.id,token:job.token,group:type,page:retry?head.page:c.groups[type].page,retry,retryCount:job.retryCount||0,retryAt:job.retryAt||0,status:C.status(c)}:null;
  }
  if(m.op==='export'){const selected=m.draft?draft:cache;if(!ui||!selected)throw Error('No cache is available to export.');return C.exportFile(selected)}
  if(m.op==='inspect'){if(!ui)throw Error('Open the cache screen.');return C.status(C.validate(m.payload,current.settings.username))}
  if(m.op==='page'){
   const origin=new URL(sender.url).origin,c=(draft?.id===m.id?draft:cache);
   if(origin!=='https://www.last.fm'||sender.frameId!==0||!c||c.id!==m.id||job.token&&(m.token!==job.token||!job.running))throw Error('Library pages must come from your active connected Last.fm job.');
   const retry=job.mode==='retry';if(retry&&(job.remaining?.[0]?.type!==m.data.type||job.remaining[0].page!==m.data.page))throw Error('The skipped-item retry changed.');
   C.accept(c,m.data,retry);
   job={...job,retryCount:0,retryAt:0,error:'',waiting:''};
   if(retry)job.remaining.shift();
   if(retry?!job.remaining.length:C.complete(c)){
    if(draft===c){root.profiles[key]=c;delete root.drafts[key]}
    job={...job,running:false,error:'',waiting:'',finishedAt:Date.now()};
   }
   jobs[key]=job;cacheChanged=true;await save();return C.status(c);
  }
  if(!ui&&!trusted)throw Error('Open the cache screen to manage caching.');
  if(m.op==='start'){
   // Legacy callers may initialise a missing cache, never discard one.
   if(!cache){root.profiles[key]=C.create(current.settings.username);await chrome.storage.local.set({[C.KEY]:root})}return C.status(root.profiles[key]);
  }
  if(m.op==='state'){
   if(!trusted||m.token!==job.token)return null;
   job={...job,error:String(m.error||'').slice(0,600),waiting:String(m.waiting||'').slice(0,600),...(Number.isInteger(m.retryCount)&&m.retryCount>=0&&m.retryCount<=4?{retryCount:m.retryCount}:{}),...(Number.isFinite(m.retryAt)&&m.retryAt>=0?{retryAt:m.retryAt}:{}),...(m.stop?{running:false}:{})};
   jobs[key]=job;await save();return null;
  }else if(m.op==='pause')job={...job,running:false,waiting:'',error:'',retryCount:0,retryAt:0};
  else if(m.op==='resume'){
   if(!cache){root.profiles[key]=C.create(current.settings.username);cacheChanged=true}
   const mode=draft?'rebuild':job.mode==='retry'&&job.remaining?.length?'retry':'resume';
   job={...job,mode,running:true,token:crypto.randomUUID(),error:'',waiting:'',retryCount:0,retryAt:0};
   if(mode!=='retry'&&C.complete(target()))job.running=false;
  }else if(m.op==='rebuild'){
   if(m.confirm!==true||m.expectedId!==(cache?.id||null))throw Error('Confirm rebuilding the cache. Your current cache will be kept until completion.');
   root.drafts[key]=C.create(current.settings.username);cacheChanged=true;job={running:true,mode:'rebuild',token:crypto.randomUUID(),error:'',waiting:''};
  }else if(m.op==='retry'){
   if(draft)throw Error('Finish the rebuild before retrying skipped items.');
   const unique=new Map(C.skipped(cache).map(x=>[x.type+':'+x.page,{type:x.type,page:x.page}]));
   job={running:unique.size>0,mode:'retry',remaining:[...unique.values()],token:crypto.randomUUID(),error:'',waiting:''};
  }else if(m.op==='import'){
   const imported=C.validate(m.payload,current.settings.username);
   if(job.running)throw Error('Pause caching before importing a saved cache.');
   if(m.confirm!==true||m.expectedId!==(cache?.id||null)||m.expectedUpdatedAt!==(cache?.updatedAt||null))throw Error('The cache changed. Review the import again.');
   root.profiles[key]=imported;delete root.drafts[key];cacheChanged=true;job={running:false,mode:'resume',error:'',waiting:''};
  }else throw Error('Unknown library cache operation.');
  jobs[key]=job;await save();return info();
 }
 globalThis.LastfmLibraryCacheStore=Object.freeze({JOBS,execute});
})();
