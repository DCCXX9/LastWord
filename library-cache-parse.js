/* Hidden extension page: turns a library page the worker downloaded into names.
   It makes no requests of its own and stores nothing. */
(() => {
 'use strict';
 const warning=/you[’']?re requesting (?:too many|a lot of) pages/i; // same check as pages.js
 chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(m?.type!=='lfm:parse-library-page')return;
  if(sender.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL('background.js')){reply({ok:false,error:'Unknown sender.'});return}
  try{
   const doc=new DOMParser().parseFromString(m.html,'text/html');
   if(warning.test(doc.body?.textContent||''))reply({ok:false,warning:true});
   else reply({ok:true,data:LastfmLibraryCache.parse(doc,m.url,m.username,m.group,m.page)});
  }catch(error){reply({ok:false,error:error.message})}
 });
})();
