/* Background orchestration. Every page is a paced GET in a connected profile tab. */
(() => {
 'use strict';
 const ALARM='lfm-library-cache',RETRY_ALARM=ALARM+'-retry',DELAYS=[5000,15000,30000,60000];let request,running=false,tabId;
 async function cancel(){if(tabId!==undefined)try{await chrome.tabs.sendMessage(tabId,{type:'lfm:library-cancel'})}catch{}}
 async function wake(){
  if(!request||running)return;running=true;
  try{
   for(let n=0;n<20;n++){
    const plan=await request({op:'plan'});if(!plan)break;
    if(plan.retryAt>Date.now()){await chrome.alarms.create(RETRY_ALARM,{when:plan.retryAt});break}
    let found;
    for(const tab of await chrome.tabs.query({})){try{const s=await chrome.tabs.sendMessage(tab.id,{type:'lfm:status'});if(s?.ownProfile&&s.username===plan.username){found=tab.id;break}}catch{}}
    if(found===undefined){await request({op:'state',token:plan.token,waiting:'Open your connected Last.fm profile to continue.'});break}
    tabId=found;
    try{
     const result=await chrome.tabs.sendMessage(tabId,{type:'lfm:library-page',...plan});
     if(!result?.ok){
      const active=await request({op:'plan'});if(!active||active.token!==plan.token)break;
      const count=plan.retryCount||0;
      if(result?.retryable&&!result.rateLimited&&count<DELAYS.length){
       const retryAt=Date.now()+DELAYS[count];
       await request({op:'state',token:plan.token,retryCount:count+1,retryAt,waiting:'Temporary Last.fm error. Automatic retry '+(count+1)+' of '+DELAYS.length+' in '+DELAYS[count]/1000+' seconds. Your progress is saved.'});
       await chrome.alarms.create(RETRY_ALARM,{when:retryAt});
      }else{
       const error=result?.error||'Refresh your Last.fm profile tab to continue.';
       await request({op:'state',token:plan.token,error:result?.retryable&&!result.rateLimited?error+' Paused after '+DELAYS.length+' automatic retries. Your progress is saved; choose Resume caching to try again.':error,stop:!result?.rateLimited});
      }
      break;
     }
     await request({op:'state',token:plan.token});
    }catch{await request({op:'state',token:plan.token,waiting:'Open or refresh your connected Last.fm profile to continue.'});break}
   }
  }catch(error){console.error('Library cache:',error.message)}finally{running=false;tabId=undefined}
 }
 function init(enqueue){
  if(!chrome.alarms?.create||!chrome.tabs?.query)return;
  request=enqueue;
  chrome.alarms.onAlarm.addListener(a=>{if(a.name===ALARM||a.name===RETRY_ALARM)void wake()});
  chrome.runtime.onStartup?.addListener(()=>{void chrome.alarms.create(ALARM,{periodInMinutes:0.5});void wake()});
  chrome.tabs.onUpdated?.addListener((_id,change)=>{if(change.status==='complete')void wake()});
  void chrome.alarms.create(ALARM,{periodInMinutes:0.5});
  void wake();
 }
 async function connected(username){if(!request||!username)return;await request({op:'resume'});void wake()}
 globalThis.LastfmLibraryCacheJobs=Object.freeze({init,wake,cancel,connected});
})();
