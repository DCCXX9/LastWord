(() => {
  'use strict';
  const A=LastfmAdapter, S=LastfmStore, D=LastfmAlbumlessReader;
  if (!S.FEATURES.automaticCorrections) {
    globalThis.LastfmAlbumless=Object.freeze({capture() {},checkNow:async()=>{},
      status:()=>({available:false,checking:false,message:'Automatic corrections are unavailable in this beta.'})});
    return;
  }
  const INTERVAL=12000;
  let username='', generation=0, running=null, lastMessage='', currentUrl=location.href;
  const captures=new WeakMap();
  const own=()=>A.ownProfile(location.href,username)&&!document.hidden;
  const request=(op,values={})=>S.albumless(username,op,values);
  const show=text=>{lastMessage=text;document.dispatchEvent(new CustomEvent('lfm:albumless-status'));};
  function notify(text,error=false) {
    document.querySelector('[data-lfm-albumless-toast]')?.remove();
    const note=document.createElement('div');note.dataset.lfmLocalToast='';note.dataset.lfmAlbumlessToast='';
    note.dataset.kind=error?'error':'success';note.setAttribute('role',error?'alert':'status');note.append(text,' ');
    const link=document.createElement('a');link.href=chrome.runtime.getURL('albumless.html');link.target='_blank';link.rel='noopener';link.textContent='Manage album-less rules';
    const close=document.createElement('button');close.type='button';close.textContent='Dismiss';close.addEventListener('click',()=>note.remove());
    note.append(link,close);document.body.append(note);
  }
  const abort=()=>new DOMException('Album-less work cancelled.','AbortError');
  function guard(signal,user=username) {
    if(signal?.aborted || !own() || user!==username || currentUrl!==location.href) throw abort();
  }
  async function authorized(item,signal,user) {
    guard(signal,user);
    const state=await request('read'), rule=state.rules[D.key(item)];
    guard(signal,user);
    if(!state.enabled || !rule || Number(item.timestamp)<=rule.since) throw abort();
    return state;
  }
  async function correct(entry,signal,user) {
    const item=entry.fields;
    const state=await authorized(item,signal,user);
    const id=JSON.stringify([D.key(item),item.timestamp]), previous=state.attempts[id];
    if(previous?.phase==='verified') return;
    if(previous) throw new Error('An earlier correction was not confirmed. Review it in album-less settings before retrying.');
    // First POST opens Last.fm's real edit form using the native row fields.
    // Only its complete, unchanged named pairs can become a Save Edit request.
    const opened=await LastfmPages.edit(D.launcher(entry.form,user),{signal,minInterval:INTERVAL,
      beforeSend:()=>authorized(item,signal,user)});
    const form=D.dialog(opened.doc,opened.url,user,item);
    guard(signal,user);
    const claim=await request('reserve',{item});
    if(!claim.claimed) return;
    try {
      await LastfmPages.edit(form,{signal,minInterval:INTERVAL,beforeSend:()=>authorized(item,signal,user)});
      guard(signal,user);
      const result=await LastfmPages.get(D.history(user,item),{signal,minInterval:INTERVAL});
      const updated=D.played(result.doc,result.url,user,item);
      if(updated.album.trim()||updated.albumArtist.trim()) throw new Error('Last.fm did not confirm blank album fields.');
      await S.albumless(user,'settle',{id:claim.id,token:claim.token,phase:'verified'});
      show('New play confirmed album-less.');
    } catch(error) {
      // Never retry an uncertain write after a timeout, closed tab or cancellation.
      await S.albumless(user,'settle',{id:claim.id,token:claim.token,phase:'uncertain',reason:error.message}).catch(()=>{});
      throw error;
    }
  }
  async function run(signal,user) {
    let state=await request('read');
    if(!state.enabled||!Object.keys(state.rules).length||LastfmPages.status().rateLimited) return;
    let check={...state.check};
    if(!check.target) check.target=Math.max(check.watermark,Math.floor(Date.now()/1000)-30);
    for(let n=0;n<3;n++) {
      guard(signal,user);
      const url=D.library(user)+(check.next===1?'':'?page='+check.next);
      const response=await LastfmPages.get(url,{signal,minInterval:INTERVAL});
      const page=D.page(response.doc,response.url,user);
      if(page.current!==check.next) throw new Error('Last.fm returned a different recent-play page.');
      state=await request('read');
      for(const entry of page.rows) {
        const item=entry.fields, stamp=Number(item.timestamp);
        const rule=state.rules[D.key(item)];
        if(rule && stamp>rule.since && stamp>check.watermark && stamp<=check.target && (item.album.trim()||item.albumArtist.trim())) {
          await correct(entry,signal,user);
        }
      }
      guard(signal,user);
      state=await request('read');
      const finished=!page.next || page.rows.some(r=>Number(r.fields.timestamp)<=check.watermark);
      const next=finished ? {next:1,watermark:check.target,target:0} : {...check,next:check.next+1};
      state=await request('check',{expected:state.check,check:next}); check={...state.check};
      if(finished) {show('Recent plays checked. Existing older plays were left alone.');return;}
    }
    show('Recent-play catch-up saved. The next check will continue from page '+check.next+'.');
  }
  async function checkNow() {
    await ready;
    if(!own()||running) return;
    const controller=new AbortController(), user=username, current=generation;
    running=controller;
    try {
      await navigator.locks.request('lastfm-personal-library:albumless-corrections',{ifAvailable:true},async lock=>{
        if(lock) await run(controller.signal,user);
      });
    } catch(error) {
      if(error.name!=='AbortError' && current===generation) {
        await S.albumless(user,'pause',{reason:error.message}).catch(()=>{});
        show('Future corrections paused: '+error.message);
      }
    } finally {if(running===controller) running=null;}
  }
  function capture(form) {
    const checkbox=form.querySelector('[data-lfm-remember-albumless]'), pairs=A.editPairs(form);
    if(!own() || !checkbox?.checked || !pairs?.track || pairs.album.to.trim() || pairs.albumArtist.to.trim() ||
       (!pairs.album.from.trim()&&!pairs.albumArtist.from.trim())) return;
    const item={artist:pairs.artist.to,track:pairs.track.to,timestamp:D.value(form,'timestamp')};
    if(!item.artist.trim()||!item.track.trim()||!/^\d+$/.test(item.timestamp||'')) return;
    const signature=JSON.stringify(item);
    if(captures.get(form)===signature) return;
    captures.set(form,signature);
    const user=username, current=generation;
    show('Waiting for Last.fm to confirm the album-less edit…');
    setTimeout(async()=>{
      try {
        if(current!==generation||!own()) return;
        const result=await LastfmPages.get(D.history(user,item),{minInterval:INTERVAL});
        if(current!==generation||!own()) return;
        const updated=D.played(result.doc,result.url,user,item);
        if(updated.album.trim()||updated.albumArtist.trim()) throw new Error('Last.fm has not confirmed blank album fields. No rule was saved.');
        await S.albumless(user,'learn',{tracks:[item]});
        const state=await S.albumless(user,'read');
        const message='Album-less preference remembered. '+(state.enabled?'Future corrections are enabled.':'Enable future corrections in Album-less rules when ready.');
        show(message);notify(message);
      } catch(error) {show(error.message);if(current===generation&&own())notify(error.message,true);}
      finally {if(captures.get(form)===signature) captures.delete(form);}
    },1500);
  }
  function enhance() {
    if(currentUrl!==location.href){generation++;running?.abort();currentUrl=location.href;}
    if(!own()) return;
    for(const form of document.querySelectorAll('.popup_content form,.modal form,[role="dialog"] form')) {
      const pairs=A.editPairs(form);
      if(!pairs?.track || form.querySelector('[data-lfm-albumless-choice]')) continue;
      let action;try{action=new URL(form.getAttribute('action'),location.href);}catch{continue;}
      if(!A.ownProfile(action.href,username)||!/\/library\/edit-track$/.test(action.pathname)) continue;
      const label=document.createElement('label');label.dataset.lfmAlbumlessChoice='';
      label.style.cssText='display:block;margin:12px 0;font-weight:normal';
      const input=document.createElement('input');input.type='checkbox';input.dataset.lfmRememberAlbumless='';
      const automatic=form.querySelector('[name="create_automatic_edit_rule"]');
      let chosen=false;
      const sync=()=>{if(!chosen) input.checked=!!automatic?.checked &&
        !D.value(form,'album_name')?.trim()&&!D.value(form,'album_artist_name')?.trim();};
      input.addEventListener('change',()=>{chosen=true;});form.addEventListener('input',sync);sync();
      label.append(input,' Remember blank album and album artist for future plays in this browser');
      form.append(label);
    }
  }
  function accept(state) {
    if(username!==state.settings.username) {generation++;running?.abort();}
    username=state.settings.username;
    if(!own()) document.querySelectorAll('[data-lfm-albumless-choice],[data-lfm-albumless-toast]').forEach(n=>n.remove());
    enhance();
  }
  const ready=S.read().then(accept).catch(e=>show(e.message)); S.subscribe(accept);
  new MutationObserver(enhance).observe(document,{childList:true,subtree:true});
  let timer=setInterval(checkNow,5*60*1000);
  addEventListener('visibilitychange',()=>{if(document.hidden)running?.abort();else {enhance();void checkNow();}});
  addEventListener('pagehide',()=>{generation++;running?.abort();clearInterval(timer);});
  addEventListener('pageshow',event=>{if(event.persisted){clearInterval(timer);timer=setInterval(checkNow,5*60*1000);currentUrl=location.href;enhance();void checkNow();}});
  addEventListener('popstate',()=>{generation++;running?.abort();currentUrl=location.href;enhance();});
  setTimeout(checkNow,5000);
  globalThis.LastfmAlbumless=Object.freeze({capture,checkNow,status:()=>({message:lastMessage,checking:!!running})});
})();
