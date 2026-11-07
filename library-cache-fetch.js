/* Background library page reads: paced GET requests made by the worker itself,
   so caching needs no Last.fm tab. A hidden extension page parses the HTML,
   because service workers cannot. Uses the same pauses, spacing and budget as tabs. */
(() => {
 'use strict';
 // While Last.fm pages are loading things for you (next pages, artwork), caching
 // steps aside until they have been quiet for ten seconds.
 const P=LastfmPages.pacing,C=LastfmLibraryCache,YIELD=10000;let parser,own=0;
 const wait=(ms,signal)=>new Promise((resolve,reject)=>{const t=setTimeout(resolve,ms);signal.addEventListener('abort',()=>{clearTimeout(t);reject(new DOMException('Caching paused.','AbortError'))},{once:true})});
 function ready(){
  // After a worker restart the page may already exist; that is fine.
  parser??=chrome.offscreen.createDocument({url:'offscreen.html',reasons:['DOM_PARSER'],justification:'Read names from downloaded Last.fm library pages.'})
   .catch(error=>{if(!/single offscreen|already/i.test(error.message)){parser=undefined;throw error}});
  return parser;
 }
 async function yieldToPages(){
  const last=(await chrome.storage.local.get(P.LAST))[P.LAST]||0;
  if(last>own&&Date.now()-last<YIELD)throw Object.assign(Error('Waiting while you browse Last.fm.'),{retryAt:last+YIELD});
 }
 async function page(plan,signal){
  const state=await chrome.storage.local.get([P.PAUSE,P.LAST]);
  if(P.active(state[P.PAUSE]))throw Object.assign(Error('Last.fm asked for a break.'),{retryAt:P.pauseUntil(state[P.PAUSE])});
  const budget=await P.budgetDelay();
  if(budget>0)throw Object.assign(Error('Pacing requests to Last.fm.'),{retryAt:Date.now()+budget});
  await yieldToPages();
  await wait(Math.max(0,1500-(Date.now()-(state[P.LAST]||0))),signal);
  await yieldToPages();
  const url=C.url(plan.username,plan.group,plan.page),timeout=new AbortController(),abort=()=>timeout.abort();
  signal.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,15000);
  let response,html;
  try{response=await fetch(url,{method:'GET',credentials:'include',signal:timeout.signal});html=await response.text()}
  catch(error){if(signal.aborted)throw error;throw Error(timeout.signal.aborted?'Last.fm took too long to respond.':'Could not reach Last.fm.')}
  finally{clearTimeout(timer);signal.removeEventListener('abort',abort);own=await P.remember()}
  if(response.status===429)throw Object.assign(Error('Last.fm asked for a break.'),{retryAt:(await P.stop()).until});
  if(!response.ok)throw Error('Last.fm returned HTTP '+response.status+'.');
  await ready();
  const result=await chrome.runtime.sendMessage({type:'lfm:parse-library-page',html,url:response.url,username:plan.username,group:plan.group,page:plan.page});
  if(result?.warning)throw Object.assign(Error('Last.fm asked for a break.'),{retryAt:(await P.stop()).until});
  if(!result?.ok)throw Error(result?.error||'The library page could not be read.');
  return result.data;
 }
 globalThis.LastfmLibraryFetch=Object.freeze({page});
})();
