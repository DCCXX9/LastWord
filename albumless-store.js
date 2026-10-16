/* Separate, worker-owned records. Legacy scan/rule and XML keys are never read
   or migrated here. A saved attempt survives a tab closing after a POST. */
(() => {
  'use strict';
  const KEY = 'lfmAlbumlessV1', R = LastfmRules;
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const now = () => Math.floor(Date.now() / 1000);
  const keyFor = item => JSON.stringify([R.normalize(item.artist), R.normalize(item.track)]);
  const text = value => typeof value === 'string' && value.trim() && value.length <= 1000;
  const track = item => {
    if (!object(item) || !text(item.artist) || !text(item.track)) throw new Error('An artist and track are required.');
    return { artist: item.artist.trim(), track: item.track.trim() };
  };
  const integer = value => Number.isSafeInteger(value) && value >= 0;
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const corrupt = () => { throw new Error('The album-less records are invalid. Export a JSON backup before continuing.'); };
  function empty() {
    return { revision:0, enabled:false, rules:{}, attempts:{}, lastError:'',
      scan:{next:1,total:null,candidates:{},complete:false}, check:{next:1,watermark:now(),target:0} };
  }
  function validate(state) {
    if (!object(state) || !integer(state.revision) || typeof state.enabled !== 'boolean' ||
        !object(state.rules) || !object(state.attempts) || typeof state.lastError !== 'string') corrupt();
    for (const [id,rule] of Object.entries(state.rules)) {
      try { if (keyFor(track(rule)) !== id || !integer(rule.since)) corrupt(); } catch { corrupt(); }
    }
    const scan=state.scan, check=state.check;
    if (!object(scan) || !integer(scan.next) || !scan.next || !object(scan.candidates) ||
        typeof scan.complete !== 'boolean' || !(scan.total === null || integer(scan.total) && scan.total>0) ||
        !object(check) || !integer(check.next) || !check.next || !integer(check.watermark) || !integer(check.target)) corrupt();
    for (const [id,item] of Object.entries(scan.candidates)) {
      try { if(keyFor(track(item))!==id) corrupt(); } catch { corrupt(); }
    }
    for (const attempt of Object.values(state.attempts)) {
      if (!object(attempt) || !text(attempt.artist) || !text(attempt.track) ||
          !/^\d+$/.test(attempt.timestamp) || !text(attempt.token) ||
          !['reserved','uncertain','verified'].includes(attempt.phase)) corrupt();
    }
    return state;
  }
  async function execute(message, current, stored, extensionPage) {
    if (R.normalize(message.username) !== R.normalize(current.settings.username)) {
      throw new Error('Your connected profile changed. Refresh this page.');
    }
    const root=stored[KEY] ?? {version:1,profiles:{}};
    if (!object(root) || root.version!==1 || !object(root.profiles)) corrupt();
    const user=R.normalize(current.settings.username);
    const state=validate(has(root.profiles,user) ? structuredClone(root.profiles[user]) : empty());
    const {op}=message;
    if(op==='read') return state;
    if (!LastfmStore.FEATURES.automaticCorrections &&
        (op === 'reserve' || op === 'configure' && message.enabled === true)) {
      throw new Error('Automatic scrobble corrections are unavailable in this beta. Saved rules are preserved.');
    }
    if (['configure','delete','dismiss-attempt'].includes(op) && !extensionPage) {
      throw new Error('Use the album-less settings page for this action.');
    }
    if(op==='learn') {
      if(!Array.isArray(message.tracks) || !message.tracks.length || message.tracks.length>1000) throw new Error('Select between 1 and 1,000 tracks.');
      let added=0;
      for(const value of message.tracks) {
        const item=track(value), id=keyFor(item);
        if(!has(state.rules,id)) {state.rules[id]={...item,since:now()};added++;}
      }
      if(!added) return state;
      state.check.watermark=Math.min(state.check.watermark,now());
    } else if(op==='configure') {
      if(message.revision!==state.revision) throw new Error('Settings changed in another tab. Review them and try again.');
      if(typeof message.enabled!=='boolean') throw new Error('Choose whether future corrections are enabled.');
      state.enabled=message.enabled; state.lastError='';
    } else if(op==='delete') {
      if(!same(state.rules[message.id],message.expected)) throw new Error('This rule changed in another tab. Refresh the list.');
      delete state.rules[message.id];
    } else if(op==='discover') {
      if(!Array.isArray(message.candidates) || message.candidates.length>1000) throw new Error('Too many loaded plays to review at once.');
      for(const value of message.candidates) {const item=track(value);state.scan.candidates[keyFor(item)]=item;}
    } else if(op==='scan') {
      if(state.scan.next!==message.expectedPage || state.scan.complete) throw new Error('Scan progress changed in another tab. Resume from the saved page.');
      if(message.next!==message.expectedPage+1 || !integer(message.total) || message.total<message.expectedPage ||
          message.next>message.total+1 || !Array.isArray(message.candidates) || message.candidates.length>500) throw new Error('The scan page could not be verified.');
      for(const value of message.candidates) {const item=track(value);state.scan.candidates[keyFor(item)]=item;}
      state.scan={...state.scan,next:message.next,total:message.total,complete:message.next===message.total+1};
    } else if(op==='check') {
      if(!same(state.check,message.expected)) throw new Error('Recent-play progress changed in another tab.');
      const c=message.check;
      if(!object(c) || !integer(c.next) || !c.next || !integer(c.watermark) || !integer(c.target) ||
          c.watermark<state.check.watermark || c.watermark>now()+60 || c.target>now()+60) throw new Error('Invalid recent-play checkpoint.');
      state.check={next:c.next,watermark:c.watermark,target:c.target};
    } else if(op==='reserve') {
      const item=track(message.item), stamp=message.item.timestamp, rule=state.rules[keyFor(item)];
      if(!state.enabled || !rule || typeof stamp!=='string' || !/^\d+$/.test(stamp) ||
          Number(stamp)<=rule.since || Number(stamp)>now()+60) throw new Error('Only matching future plays can be corrected.');
      const id=JSON.stringify([keyFor(item),stamp]);
      if(has(state.attempts,id)) return {claimed:false,attempt:state.attempts[id]};
      if(Object.values(state.attempts).filter(a=>a.phase!=='verified').length>=100) throw new Error('Review unconfirmed corrections in album-less settings before continuing.');
      const token=crypto.randomUUID();
      state.attempts[id]={...item,timestamp:stamp,token,phase:'reserved',at:now()};
      const verified=Object.entries(state.attempts).filter(([,a])=>a.phase==='verified');
      for(const [old] of verified.slice(0,Math.max(0,verified.length-500))) delete state.attempts[old];
      state.revision++;
      await chrome.storage.local.set({[KEY]:{...root,profiles:{...root.profiles,[user]:state}}});
      return {claimed:true,id,token};
    } else if(op==='settle') {
      const attempt=state.attempts[message.id];
      if(!attempt || attempt.token!==message.token || !['verified','uncertain'].includes(message.phase)) throw new Error('This correction attempt is no longer current.');
      attempt.phase=message.phase;
      if(message.phase==='uncertain') {state.enabled=false;state.lastError=String(message.reason||'An edit could not be confirmed.').slice(0,500);}
    } else if(op==='dismiss-attempt') {
      if(state.attempts[message.id]?.token!==message.token) throw new Error('This correction attempt changed. Refresh the list.');
      delete state.attempts[message.id];
    } else if(op==='pause') {
      state.enabled=false; state.lastError=String(message.reason||'Future corrections paused.').slice(0,500);
    } else throw new Error('Unknown album-less request.');
    state.revision++;
    await chrome.storage.local.set({[KEY]:{...root,profiles:{...root.profiles,[user]:state}}});
    return state;
  }
  globalThis.LastfmAlbumlessStore=Object.freeze({execute});
})();
