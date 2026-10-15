(() => {
  'use strict';
  const A=LastfmAdapter, S=LastfmStore, D=LastfmAlbumlessReader;
  const BATCH=20;
  let username='', state, panel, output, scanButton, pauseButton, resumeButton, controller, note='';
  const own=()=>A.ownProfile(location.href,username)&&A.libraryView(location.href)==='scrobbles'&&
    [...new URL(location.href).searchParams.keys()].every(k=>k==='page');
  const request=(op,values={})=>S.albumless(username,op,values);
  function render() {
    if(!panel) return;
    const scan=state?.scan;
    output.textContent=note || (scan?.complete ? 'Discovery complete. Review the candidate tracks before applying rules.' :
      `Scanned ${Math.max(0,(scan?.next||1)-1)}${scan?.total?' of '+scan.total:''} pages. Candidates are saved for review.`);
    scanButton.hidden=!!scan?.complete;
    scanButton.disabled=!!controller;
    scanButton.textContent=(scan?.next||1)>1 ? 'Resume scan' : 'Find album-less tracks';
    pauseButton.hidden=!controller;
    resumeButton.hidden=!LastfmPages.status().rateLimited;
    resumeButton.disabled=!!controller;
  }
  async function begin() {
    if(controller||!own()) return;
    const active=new AbortController();controller=active;const user=username;
    note='Reading saved discovery progress…';render();
    try {
      await navigator.locks.request('lastfm-personal-library:albumless-discovery',{ifAvailable:true},async lock=>{
        if(!lock) throw new Error('Discovery is running in another Last.fm tab.');
        state=await request('read');
        for(let n=0;n<BATCH&&!state.scan.complete;n++) {
          if(active.signal.aborted||!own()||user!==username) throw new DOMException('Discovery paused.','AbortError');
          if(LastfmPages.status().rateLimited) throw new Error('Last.fm requested a break. Discovery stays paused until you explicitly resume requests after a break.');
          const pageNumber=state.scan.next;
          note=`Reading page ${pageNumber}${state.scan.total?' of '+state.scan.total:''}…`;render();
          const url=D.library(user)+(pageNumber===1?'':'?page='+pageNumber);
          const response=await LastfmPages.get(url,{signal:active.signal,minInterval:12000});
          const page=D.page(response.doc,response.url,user);
          if(page.current!==pageNumber) throw new Error('Last.fm returned a different page. Nothing was skipped.');
          if(active.signal.aborted||!own()||user!==username) throw new DOMException('Discovery paused.','AbortError');
          const candidates=page.rows.filter(({fields:f})=>!f.album.trim()&&!f.albumArtist.trim()).map(({fields:f})=>({artist:f.artist,track:f.track}));
          state=await request('scan',{expectedPage:pageNumber,next:pageNumber+1,total:page.total,candidates});
        }
        note=state.scan.complete ? 'Discovery complete. Review and apply your candidate tracks in Album-less rules.' :
          `Batch complete: ${state.scan.next-1} of ${state.scan.total} pages checked. Take a break before resuming another ${BATCH}.`;
      });
    } catch(error) {note=error.name==='AbortError'?'Discovery paused. Your confirmed pages and candidates are saved.':'Scan paused: '+error.message;}
    finally {if(controller===active)controller=null;render();}
  }
  async function loaded() {
    if(!own()||controller) return;
    try {
      const page=D.page(document,location.href,username);
      const candidates=page.rows.filter(({fields:f})=>!f.album.trim()&&!f.albumArtist.trim()).map(({fields:f})=>({artist:f.artist,track:f.track}));
      state=await request('discover',{candidates});
      note=`${candidates.length} blank-album plays found in the loaded rows. Review the distinct tracks before applying rules.`;render();
    } catch(error){note=error.message;render();}
  }
  function mount() {
    if(!own()) {controller?.abort();panel?.remove();panel=null;return;}
    if(location.hash!=='#lfm-albumless'&&!panel) return;
    if(panel?.isConnected) return;
    panel=document.createElement('section');panel.dataset.lfmAlbumlessPanel='';
    panel.className='lfm-albumless-panel';panel.setAttribute('aria-label','Album-less discovery');
    const title=document.createElement('strong');title.textContent='Album-less discovery';
    const description=document.createElement('p');description.textContent=`Read-only batches of up to ${BATCH} pages, at least 12 seconds apart. Review candidates before saving future-only rules. Older plays stay unchanged.`;
    output=document.createElement('p');output.dataset.lfmAlbumlessMessage='';output.setAttribute('role','status');
    scanButton=document.createElement('button');scanButton.type='button';scanButton.addEventListener('click',begin);
    pauseButton=document.createElement('button');pauseButton.type='button';pauseButton.textContent='Pause scan';pauseButton.addEventListener('click',()=>controller?.abort());
    resumeButton=document.createElement('button');resumeButton.type='button';resumeButton.textContent='Resume requests after a break';
    resumeButton.addEventListener('click',async()=>{
      if(controller||!own())return;
      try {await LastfmPages.resume();note='Requests resumed. Start or resume discovery when ready.';}
      catch(error){note=error.message;}
      render();
    });
    const learn=document.createElement('button');learn.type='button';learn.textContent='Review loaded plays';learn.addEventListener('click',loaded);
    const check=document.createElement('button');check.type='button';check.textContent='Check recent plays now';check.addEventListener('click',async()=>{await globalThis.LastfmAlbumless?.checkNow();note=globalThis.LastfmAlbumless?.status().message||'Enable future corrections in Album-less rules first.';render();});
    const review=document.createElement('a');review.href=chrome.runtime.getURL('albumless.html');review.target='_blank';review.rel='noopener';review.textContent='Review rules and candidates';
    const close=document.createElement('button');close.type='button';close.textContent='Close';close.addEventListener('click',()=>{controller?.abort();panel.remove();panel=null;history.replaceState(history.state,'',location.pathname+location.search);});
    const actions=document.createElement('div');actions.className='lfm-albumless-actions';actions.append(scanButton,pauseButton,resumeButton,learn,check,review,close);
    panel.append(title,description,output,actions);document.body.append(panel);render();
  }
  S.read().then(async snapshot=>{username=snapshot.settings.username;state=await request('read');mount();}).catch(error=>{note=error.message;});
  S.subscribe(snapshot=>{if(username!==snapshot.settings.username)controller?.abort();username=snapshot.settings.username;mount();});
  addEventListener('hashchange',mount);addEventListener('popstate',mount);
  addEventListener('pagehide',()=>controller?.abort());
  addEventListener('visibilitychange',()=>{if(document.hidden)controller?.abort();});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.lfmNetworkPause)render();});
  new MutationObserver(()=>{if(panel&&!panel.isConnected)mount();}).observe(document,{childList:true,subtree:true});
})();
