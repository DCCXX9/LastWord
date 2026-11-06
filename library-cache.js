/* Local, exact-name library cache. This module never submits Last.fm forms. */
(() => {
  'use strict';
  const R = LastfmRules, TYPES = ['tracks', 'albums', 'artists'], KEY = 'lfmLibraryCacheV1';
  const spelling = R.sameSpelling;
  const linkedSpelling = (a, b) => spelling(a, b) || typeof b === 'string' && spelling(a, b.replace(/%2b/gi, '+'));
  const complete = cache => !!cache && TYPES.every(t => cache.groups[t].done);
  const skipped = cache => TYPES.flatMap(t => cache?.groups[t]?.skipped || []);
  function create(username) {
    return {id:crypto.randomUUID(),username,startedAt:Date.now(),updatedAt:Date.now(),groups:Object.fromEntries(TYPES.map(t=>[t,{page:1,total:0,done:false,items:{},skipped:[]}]))};
  }
  function status(cache) {
    return cache && {id:cache.id,username:cache.username,updatedAt:cache.updatedAt,complete:complete(cache),skipped:skipped(cache).length,
      groups:Object.fromEntries(TYPES.map(t=>{const g=cache.groups[t];return [t,{page:g.page,total:g.total,done:g.done,count:Object.keys(g.items).length,skipped:(g.skipped||[]).length}]}))};
  }
  function url(user,type,page) {
    if(!TYPES.includes(type)||!Number.isSafeInteger(page)||page<1)throw Error('Invalid library page.');
    return `https://www.last.fm/user/${encodeURIComponent(user)}/library/${type}?date_preset=ALL&page=${page}`;
  }
  function safeLink(value,fallback) {
    try {const u=new URL(value,fallback);if(u.origin==='https://www.last.fm'&&(u.pathname.startsWith('/music/')||u.pathname===new URL(fallback).pathname))return u.href;}catch{}
    return fallback;
  }
  function parse(doc,address,user,type,page) {
    const target=new URL(url(user,type,page)),returned=new URL(address);
    if(returned.origin!==target.origin||returned.pathname!==target.pathname||(returned.searchParams.get('date_preset')||'ALL')!=='ALL'||Number(returned.searchParams.get('page')||1)!==page||[...returned.searchParams.keys()].some(k=>!['page','date_preset'].includes(k)))throw Error('Last.fm returned a different library page.');
    const root=doc.querySelector('.col-main')||doc,items=[],missed=[];
    const rows=[...root.querySelectorAll('tr.chartlist-row')].filter(r=>!r.matches('.chartlist__placeholder-row'));
    for(const [index,row]of rows.entries()) {
      const cell=row.querySelector('.chartlist-name'),link=cell?.querySelector('a[href]');
      if(!cell)continue;
      const name=(link?.textContent||cell.textContent||'').trim().normalize('NFC');
      const artist=row.querySelector('.chartlist-artist a[href]')?.textContent.trim().normalize('NFC');
      let item;try{item=link&&LastfmAdapter.musicItem(new URL(link.getAttribute('href'),address).href,'https://www.last.fm/')}catch{}
      if(!item||item.type!==type||!name||name.length>500||!linkedSpelling(name,item.name)||type!=='artists'&&(!artist||artist.length>500||!linkedSpelling(artist,item.artist))) {
        missed.push({type,page,index,name:(name||'Unreadable name').slice(0,500),artist:(artist||'').slice(0,500),href:safeLink(link?.getAttribute('href'),address),reason:'Displayed name or artist could not be verified against its link.'});continue;
      }
      items.push({name,...(type!=='artists'?{artist}:{})});
    }
    if(!items.length&&!missed.length&&!root.querySelector('.library-empty,.chartlist-empty,.empty-library'))throw Error('Last.fm returned no verifiable library list. Check your sign-in.');
    const next=root.querySelector('nav.pagination .pagination-next a[href],nav.pagination a[rel=next],nav.pagination a.pagination-next[href]');
    let total=page;
    for(const a of root.querySelectorAll('nav.pagination a[href]')){const u=new URL(a.getAttribute('href'),address),n=Number(u.searchParams.get('page'));if(u.origin===target.origin&&u.pathname===target.pathname&&Number.isSafeInteger(n))total=Math.max(total,n)}
    if(next){const u=new URL(next.getAttribute('href'),address);if(u.origin!==target.origin||u.pathname!==target.pathname||Number(u.searchParams.get('page'))!==page+1||[...u.searchParams.keys()].some(k=>!['page','date_preset'].includes(k))||u.searchParams.has('date_preset')&&u.searchParams.get('date_preset')!=='ALL')throw Error('The next library page could not be verified.');}
    else if(total>page)throw Error('Last.fm omitted a library page.');
    return {type,page,total,done:!next,items,skipped:missed};
  }
  function accept(cache,data,retry=false) {
    const g=cache.groups[data.type],missed=data.skipped||[];
    if(!g||!Number.isSafeInteger(data.page)||data.page<1||!retry&&(g.done||g.page!==data.page)||!Number.isSafeInteger(data.total)||data.total<data.page||typeof data.done!=='boolean'||!Array.isArray(data.items)||data.items.length>500||!Array.isArray(missed)||missed.length>500||!data.done&&!data.items.length&&!missed.length)throw Error('The library cache changed. Resume caching.');
    for(const x of data.items){if(typeof x.name!=='string'||!x.name||x.name.length>500||data.type!=='artists'&&(typeof x.artist!=='string'||!x.artist||x.artist.length>500))throw Error('Invalid cached library name.');const id=R.idFor(data.type,x.name,x.artist),old=g.items[id];g.items[id]={name:x.name,...(data.type!=='artists'?{artist:x.artist}:{}),...(old&&(old.name!==x.name||old.ambiguous)?{ambiguous:true}:{})}}
    for(const x of missed)if(x.type!==data.type||x.page!==data.page||typeof x.name!=='string'||x.name.length>500||typeof x.reason!=='string'||x.reason.length>500||!Number.isSafeInteger(x.index)||x.index<0||safeLink(x.href,url(cache.username,data.type,data.page))!==x.href)throw Error('Invalid skipped-item record.');
    g.skipped=[...(g.skipped||[]).filter(x=>x.page!==data.page),...missed];
    if(!retry){g.page++;g.total=data.total;g.done=data.done}cache.updatedAt=Date.now();return cache;
  }
  function compare(scan,cache,rules) {
    if(!cache?.groups)throw Error('Cache your Last.fm library before reviewing changes.');
    const candidates=[];
    for(const c of scan.candidates){const source=cache.groups[c.type]?.items[c.id];if(!source||source.ambiguous)continue;const existing=rules[c.type]?.[c.id],before=existing&&spelling(source.name,existing.to)?existing.to:source.name,variants=c.variants.filter(to=>spelling(source.name,to));if(!variants.length||variants.every(to=>to===before))continue;candidates.push({...c,from:R.normalize(source.name),source:source.name,before,variants,to:variants[0],artist:source.artist||undefined})}
    return {...scan,candidates};
  }
  function validate(payload,user) {
    if(payload?.format!=='lastfm-personal-library-cache'||payload.version!==1||!payload.cache||R.normalize(payload.cache.username)!==R.normalize(user))throw Error('Choose a LastWord for Last.fm cache for your connected Last.fm profile.');
    const input=payload.cache,out=create(user);let count=0;
    if(!Number.isSafeInteger(input.updatedAt)||input.updatedAt<0)throw Error('Invalid cache date.');
    out.updatedAt=input.updatedAt;out.startedAt=Number.isSafeInteger(input.startedAt)?input.startedAt:input.updatedAt;
    for(const type of TYPES){const g=input.groups?.[type];if(!g||!Number.isSafeInteger(g.page)||g.page<1||g.page>1000000||!Number.isSafeInteger(g.total)||g.total<0||g.total>1000000||g.total&&g.page>g.total+1||typeof g.done!=='boolean'||!g.items||typeof g.items!=='object'||Array.isArray(g.items))throw Error('Invalid cache progress.');const dest=out.groups[type];Object.assign(dest,{page:g.page,total:g.total,done:g.done});for(const [id,x]of Object.entries(g.items)){if(++count>300000||!x||typeof x.name!=='string'||!x.name||x.name.length>500||type!=='artists'&&(typeof x.artist!=='string'||!x.artist||x.artist.length>500)||id!==R.idFor(type,x.name,x.artist)||x.ambiguous!==undefined&&typeof x.ambiguous!=='boolean')throw Error('Invalid cached name or artist.');dest.items[id]={name:x.name,...(type!=='artists'?{artist:x.artist}:{}),...(x.ambiguous?{ambiguous:true}:{})}}const misses=g.skipped||[];if(!Array.isArray(misses)||misses.length>300000)throw Error('Invalid skipped-item list.');for(const x of misses){if(++count>300000||x.type!==type||!Number.isSafeInteger(x.page)||x.page<1||x.page>=g.page||!Number.isSafeInteger(x.index)||x.index<0||x.index>499||typeof x.name!=='string'||x.name.length>500||typeof x.artist!=='string'||x.artist.length>500||typeof x.reason!=='string'||x.reason.length>500||typeof x.href!=='string'||safeLink(x.href,url(user,type,x.page))!==x.href)throw Error('Invalid skipped-item record.');dest.skipped.push({type,page:x.page,index:x.index,name:x.name,artist:x.artist,href:x.href,reason:x.reason})}}
    return out;
  }
  const exportFile=cache=>({format:'lastfm-personal-library-cache',version:1,exportedAt:Date.now(),cache});
  globalThis.LastfmLibraryCache=Object.freeze({KEY,TYPES,spelling,create,status,complete,skipped,url,parse,accept,compare,validate,exportFile});
})();
