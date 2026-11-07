/* Background orchestration. The worker reads each page itself: no Last.fm tab is needed. */
(() => {
 'use strict';
 // Caching never gives up on its own: failures wait and retry, at most every five
 // minutes, until the library is complete or the user chooses Pause.
 const ALARM='lfm-library-cache',RETRY_ALARM=ALARM+'-retry',DELAYS=[5000,15000,30000,60000,300000];let request,running=false,controller;
 const later=ms=>ms<60000?Math.ceil(ms/1000)+' seconds':Math.ceil(ms/60000)+(ms>60000?' minutes':' minute');
 function cancel(){controller?.abort()}
 async function wake(){
  if(!request||running)return;running=true;
  try{
   for(let n=0;n<20;n++){
    const plan=await request({op:'plan'});if(!plan)break;
    if(plan.retryAt>Date.now()){await chrome.alarms.create(RETRY_ALARM,{when:plan.retryAt});break}
    controller=new AbortController();
    try{
     const data=await LastfmLibraryFetch.page(plan,controller.signal);
     await request({op:'page',username:plan.username,id:plan.id,token:plan.token,data});
    }catch(error){
     if(controller.signal.aborted)break;
     const active=await request({op:'plan'});if(!active||active.token!==plan.token)break;
     const count=plan.retryCount||0,now=Date.now();
     // Last.fm's own break and the request budget set their own time; they are not failures.
     const retryAt=error.retryAt>now?error.retryAt:now+DELAYS[Math.min(count,DELAYS.length-1)];
     await request({op:'state',token:plan.token,retryCount:error.retryAt>now?count:count+1,retryAt,
      waiting:(error.retryAt>now?error.message:'Last.fm problem: '+error.message)+' Trying again in '+later(retryAt-now)+'. Your progress is saved.'});
     await chrome.alarms.create(RETRY_ALARM,{when:retryAt});break;
    }finally{controller=undefined}
   }
  }catch(error){console.error('Library cache:',error.message)}finally{running=false}
 }
 function init(enqueue){
  if(!chrome.alarms?.create)return;
  request=enqueue;
  chrome.alarms.onAlarm.addListener(a=>{if(a.name===ALARM||a.name===RETRY_ALARM)void wake()});
  chrome.runtime.onStartup?.addListener(()=>{void chrome.alarms.create(ALARM,{periodInMinutes:0.5});void wake()});
  void chrome.alarms.create(ALARM,{periodInMinutes:0.5});
  void wake();
 }
 async function connected(username){if(!request||!username)return;await request({op:'resume'});void wake()}
 globalThis.LastfmLibraryCacheJobs=Object.freeze({init,wake,cancel,connected});
})();
