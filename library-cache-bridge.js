(() => {
 'use strict';const C=LastfmLibraryCache,S=LastfmStore;let controller=null;
 chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(!['lfm:library-page','lfm:library-cancel'].includes(m?.type))return;
  const origin=`chrome-extension://${chrome.runtime.id}`;
  if(sender.id!==chrome.runtime.id||!(sender.url===origin+'/background.js'||sender.url===origin+'/itunes.html'||!sender.url&&sender.origin===origin)){reply({ok:false,error:'Open the cache screen to manage caching.'});return}
  if(m.type==='lfm:library-cancel'){controller?.abort();reply({ok:true});return}
  (async()=>{
   if(controller)throw Object.assign(Error('A library page is already loading.'),{retryable:true,busy:true});controller=new AbortController();
   try{
    // Leaving the profile in this tab (Last.fm navigates in-page) means "wait", not a
    // failure. The worker also refuses cache requests from a tab off the profile.
    const here=()=>{if(!LastfmAdapter.ownProfile(location.href,m.username))throw Object.assign(Error('Keep your connected Last.fm profile open while caching.'),{away:true})};
    const store=async(op,values)=>{here();try{return await S.cacheLibrary(op,values)}catch(error){here();throw error}};
    const guard=async()=>{const state=await store('active');if(state.username!==m.username)throw Error('Your connected profile changed.');if(m.token&&(!state.running||state.token!==m.token))throw new DOMException('Caching paused.','AbortError')};
    await guard();const r=await LastfmPages.get(C.url(m.username,m.group,m.page),{signal:controller.signal,beforeSend:guard});await guard();const data=C.parse(r.doc,r.url,m.username,m.group,m.page);return await store('page',{username:m.username,id:m.id,token:m.token,data});
   }finally{controller=null}
  })().then(value=>reply({ok:true,value}),error=>reply({ok:false,error:error.message,rateLimited:!!error.rateLimited,retryable:!!error.retryable,away:!!error.away,busy:!!error.busy}));return true;
 });
})();
