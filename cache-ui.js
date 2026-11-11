/* Cache controls never modify display preferences or Last.fm data. */
(() => {
 'use strict';const S=LastfmStore,C=LastfmLibraryCache,$=id=>document.getElementById(id);
 let info,action,skipPage=1,generation=0;
 const total=s=>s?Object.values(s.groups).reduce((n,g)=>n+g.count,0):0;
 const note=(text='',error=false)=>{ $('cache-message').textContent=text;$('cache-message').dataset.tone=error?'error':'' };
 function drawSkipped(){
  const rows=info?.draft?info.workSkipped:info?.skipped||[],pages=Math.max(1,Math.ceil(rows.length/100));skipPage=Math.min(Math.max(1,skipPage),pages);
  $('cache-skipped').hidden=!rows.length;$('cache-skipped-summary').textContent=rows.length.toLocaleString()+(rows.length===1?' skipped item':' skipped items');$('cache-skipped-list').replaceChildren();
  for(const x of rows.slice((skipPage-1)*100,skipPage*100)){const li=document.createElement('li'),a=document.createElement('a');a.href=x.href;a.textContent=x.name+(x.artist?' · '+x.artist:'');a.target='_blank';a.rel='noopener';li.append(a,document.createTextNode(' — '+x.reason));$('cache-skipped-list').append(li)}
  $('skipped-page').textContent=`Page ${skipPage} of ${pages}`;$('skipped-previous').disabled=skipPage===1;$('skipped-next').disabled=skipPage===pages;$('cache-retry').disabled=!!info?.job.running||!!info?.draft;
 }
 async function refresh(){
  const id=++generation,next=await S.cacheLibrary('info');if(id!==generation)return;info=next;
  const work=next.draft||next.cache,running=next.job.running,kind=next.draft?'Rebuilding':next.job.mode==='retry'?'Retrying skipped items':'Caching';
  $('cache-status').textContent=running?kind:next.cache?.complete?'Complete':!next.cache?'Waiting for profile':'Paused';
  $('cache-step-status').textContent=$('cache-status').textContent;
  let detail=work?total(work).toLocaleString()+' names cached · '+work.skipped.toLocaleString()+' skipped':'Not cached yet.';
  if(work){const t=C.TYPES.find(t=>!work.groups[t].done);if(t)detail+=' · '+({tracks:'Songs',albums:'Albums',artists:'Artists'}[t])+' page '+work.groups[t].page+(work.groups[t].total?' of '+work.groups[t].total:'')}
  if(work&&!work.complete)$('cache-step-status').textContent=$('cache-status').textContent+' · '+total(work).toLocaleString()+' names';
  $('cache-detail').textContent=detail+(next.job.waiting?' · '+next.job.waiting:'');$('cache-error').textContent=next.job.error||'';
  $('cache-resume').hidden=running;$('cache-resume').disabled=!next.username||!!next.cache?.complete&&!next.draft&&!next.job.remaining?.length;$('cache-pause').hidden=!running;
  $('cache-export').disabled=!next.cache;$('cache-import').disabled=!!running||!next.username;$('cache-import').title=running?'Pause caching before importing.':'';$('cache-rebuild').disabled=!!running||!next.username;
  $('cache-export-draft').hidden=!next.draft;drawSkipped();window.dispatchEvent(new CustomEvent('lfm-cache-changed',{detail:next}));
 }
 async function operation(op,values={}){try{await S.cacheLibrary(op,values);note();await refresh()}catch(e){note(e.message,true)}}
 $('cache-resume').addEventListener('click',()=>operation('resume'));
 $('cache-pause').addEventListener('click',()=>operation('pause'));
 $('cache-retry').addEventListener('click',()=>operation('retry'));
 function confirm(op,payload,heading,detail,label){action={op,payload};$('cache-confirm-heading').textContent=heading;$('cache-confirm-detail').textContent=detail;$('cache-confirm').textContent=label;$('cache-confirm-dialog').showModal();$('cache-cancel').focus()}
 $('cache-rebuild').addEventListener('click',()=>confirm('rebuild',{confirm:true,expectedId:info.cache?.id||null},'Rebuild your Last.fm cache?','This downloads your library again. Accounts with over 50,000 scrobbles can take over 30 minutes; large libraries can take several hours. Your current '+total(info.cache).toLocaleString()+' cached names remain available until the new download completes.','Start rebuild'));
 $('cache-cancel').addEventListener('click',()=>$('cache-confirm-dialog').close());
 $('cache-confirm-dialog').addEventListener('close',()=>{action=null});
 $('cache-confirm').addEventListener('click',async()=>{if(!action)return;const a=action;$('cache-confirm-dialog').close();await operation(a.op,a.payload)});
 async function download(draft=false){try{const file=await S.cacheLibrary('export',{draft}),blob=new Blob([JSON.stringify(file)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lastfm-cache-'+file.cache.username+'-'+new Date().toISOString().slice(0,10)+(draft?'-rebuild':'')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);note('Cache exported. Keep this file private.')}catch(e){note(e.message,true)}}
 $('cache-export').addEventListener('click',()=>download());$('cache-export-draft').addEventListener('click',()=>download(true));
 $('cache-import').addEventListener('change',async()=>{
  const file=$('cache-import').files[0];if(!file)return;
  try{if(file.size>128*1024*1024)throw Error('Cache files must be 128 MiB or smaller.');const payload=JSON.parse(await file.text()),s=await S.cacheLibrary('inspect',{payload});await refresh();confirm('import',{payload,confirm:true,expectedId:info.cache?.id||null,expectedUpdatedAt:info.cache?.updatedAt||null},'Import this saved cache?',s.username+' · '+total(s).toLocaleString()+' cached names · '+s.skipped+' skipped · '+(s.complete?'Complete':'Partial — caching can resume')+' · Saved '+new Date(s.updatedAt).toLocaleString()+'. This replaces the current local cache. Display preferences and scrobbles stay unchanged.','Import cache')}catch(e){note('Could not import: '+e.message,true)}finally{$('cache-import').value=''}
 });
 $('skipped-previous').addEventListener('click',()=>{skipPage--;drawSkipped()});$('skipped-next').addEventListener('click',()=>{skipPage++;drawSkipped()});
 let timer;chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes[C.KEY]||changes.lfmLibraryJobsV1||changes.settings)){clearTimeout(timer);timer=setTimeout(()=>void refresh().catch(e=>note(e.message,true)),100)}});
 void refresh().catch(e=>note(e.message,true));
})();
