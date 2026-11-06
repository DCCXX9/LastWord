/* Background orchestration. Every page is a paced GET in a connected profile tab. */
(() => {
 'use strict';
 const ALARM='lfm-library-cache';let request,running=false,tabId;
 async function cancel(){if(tabId!==undefined)try{await chrome.tabs.sendMessage(tabId,{type:'lfm:library-cancel'})}catch{}}
 async function wake(){
  if(!request||running)return;running=true;
  try{
   for(let n=0;n<20;n++){
    const plan=await request({op:'plan'});if(!plan)break;
    let found;
    for(const tab of await chrome.tabs.query({})){try{const s=await chrome.tabs.sendMessage(tab.id,{type:'lfm:status'});if(s?.ownProfile&&s.username===plan.username){found=tab.id;break}}catch{}}
    if(found===undefined){await request({op:'state',token:plan.token,waiting:'Open your connected Last.fm profile to continue.'});break}
    tabId=found;
    try{
     const result=await chrome.tabs.sendMessage(tabId,{type:'lfm:library-page',...plan});
     if(!result?.ok){const active=await request({op:'plan'});if(!active||active.token!==plan.token)break;await request({op:'state',token:plan.token,error:result?.error||'Refresh your Last.fm profile tab to continue.',stop:!result?.rateLimited&&!result?.retryable});break}
     await request({op:'state',token:plan.token});
    }catch{await request({op:'state',token:plan.token,waiting:'Open or refresh your connected Last.fm profile to continue.'});break}
   }
  }catch(error){console.error('Library cache:',error.message)}finally{running=false;tabId=undefined}
 }
 function init(enqueue){
  if(!chrome.alarms?.create||!chrome.tabs?.query)return;
  request=enqueue;
  chrome.alarms.onAlarm.addListener(a=>{if(a.name===ALARM)void wake()});
  chrome.runtime.onStartup?.addListener(()=>{void chrome.alarms.create(ALARM,{periodInMinutes:0.5});void wake()});
  chrome.tabs.onUpdated?.addListener((_id,change)=>{if(change.status==='complete')void wake()});
  void chrome.alarms.create(ALARM,{periodInMinutes:0.5});
  void wake();
 }
 async function connected(username){if(!request||!username)return;await request({op:'resume'});void wake()}
 globalThis.LastfmLibraryCacheJobs=Object.freeze({init,wake,cancel,connected});
})();
