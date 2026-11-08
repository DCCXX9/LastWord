/* Background library page reads: paced GET requests made by the worker itself,
   so caching needs no Last.fm tab. A hidden extension page parses the HTML,
   because service workers cannot. Uses the same pauses, spacing and budget as tabs. */
(() => {
 'use strict';
 // While Last.fm pages are loading things for you (next pages, artwork), caching
 // steps aside until they have been quiet for ten seconds.
 const P=LastfmPages.pacing,C=LastfmLibraryCache,YIELD=10000;let parser,closed=false;
 const paused=()=>new DOMException('Caching paused.','AbortError');
 const wait=(ms,signal)=>new Promise((resolve,reject)=>{if(signal.aborted){reject(paused());return}const t=setTimeout(resolve,ms);signal.addEventListener('abort',()=>{clearTimeout(t);reject(paused())},{once:true})});
 function ready(){
  // After a worker restart the page may already exist; that is fine.
  closed=false;
  parser??=chrome.offscreen.createDocument({url:'offscreen.html',reasons:['DOM_PARSER'],justification:'Read names from downloaded Last.fm library pages.'})
   .catch(error=>{if(!/single offscreen|already/i.test(error.message)){parser=undefined;throw error}});
  return parser;
 }
 // Called when nothing is left to cache: the hidden page is not kept loaded.
 async function close(){if(closed)return;closed=true;parser=undefined;try{await chrome.offscreen.closeDocument()}catch{}}
 async function check(signal){
  if(signal.aborted)throw paused();
  const state=await chrome.storage.local.get([P.PAUSE,P.LAST,P.ACTIVITY]),now=Date.now();
  if(P.active(state[P.PAUSE]))throw Object.assign(Error('Last.fm asked for a break.'),{retryAt:P.pauseUntil(state[P.PAUSE])});
  const page=state[P.ACTIVITY]||0;
  if(now-page<YIELD)throw Object.assign(Error('Waiting while Last.fm pages load.'),{retryAt:page+YIELD});
  return state;
 }
 async function page(plan,signal){
  const state=await check(signal);
  const budget=await P.budgetDelay();
  if(budget>0)throw Object.assign(Error('Pacing requests to Last.fm.'),{retryAt:Date.now()+budget});
  await wait(Math.max(0,1500-(Date.now()-(state[P.LAST]||0))),signal);
  await check(signal);
  // Mark the start, so Last.fm pages space their own requests after this one.
  await chrome.storage.local.set({[P.LAST]:Date.now()});
  if(signal.aborted)throw paused();
  const url=C.url(plan.username,plan.group,plan.page),timeout=new AbortController(),abort=()=>timeout.abort();
  signal.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,15000);
  let response,html;
  try{response=await fetch(url,{method:'GET',credentials:'include',signal:timeout.signal});html=await response.text()}
  catch(error){if(signal.aborted)throw paused();throw Error(timeout.signal.aborted?'Last.fm took too long to respond.':'Could not reach Last.fm.')}
  finally{clearTimeout(timer);signal.removeEventListener('abort',abort);await P.remember()}
  if(response.status===429)throw Object.assign(Error('Last.fm asked for a break.'),{retryAt:(await P.stop()).until});
  if(!response.ok)throw Error('Last.fm returned HTTP '+response.status+'.');
  let result;
  try{await ready();result=await chrome.runtime.sendMessage({type:'lfm:parse-library-page',html,url:response.url,username:plan.username,group:plan.group,page:plan.page})}
  // The hidden page may have closed or crashed: open a fresh one on the next try.
  catch(error){parser=undefined;throw Error('The library reader was not ready.')}
  if(result?.warning)throw Object.assign(Error('Last.fm asked for a break.'),{retryAt:(await P.stop()).until});
  if(!result?.ok){if(!result)parser=undefined;throw Error(result?.error||'The library page could not be read.')}
  return result.data;
 }
 globalThis.LastfmLibraryFetch=Object.freeze({page,close});
})();
