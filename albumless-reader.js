(() => {
  'use strict';
  const A=LastfmAdapter, R=LastfmRules;
  const encode=value=>encodeURIComponent(value).replace(/%20/g,'+');
  const key=item=>JSON.stringify([R.normalize(item.artist),R.normalize(item.track)]);
  const library=user=>`${location.origin}/user/${encode(user)}/library`;
  const history=(user,item)=>`${library(user)}/music/+noredirect/${encode(item.artist)}/_/${encode(item.track)}`;
  const value=(form,name)=>{
    const fields=[...form.elements].filter(f=>f.name===name);
    return fields.length===1 ? fields[0].value : null;
  };
  function page(doc,url,user) {
    const u=new URL(url), base=new URL(library(user));
    if(!A.ownProfile(url,user) || u.pathname.toLowerCase()!==base.pathname.toLowerCase() ||
       [...u.searchParams.keys()].some(k=>k!=='page')) throw new Error('Open the unfiltered Scrobbles library for discovery.');
    const current=Number(u.searchParams.get('page')||1);
    if(!Number.isSafeInteger(current)||current<1) throw new Error('The library page number is invalid.');
    const root=doc.querySelector('.col-main')||doc, rows=[];
    for(const row of root.querySelectorAll('table.chartlist tr.chartlist-row')) {
      if(row.matches('.chartlist-row--now-scrobbling')) continue;
      const forms=row.querySelectorAll('form[data-edit-scrobble]');
      const fields=forms.length===1 && A.editRow(forms[0],url,user,true);
      if(!fields || !Number.isSafeInteger(Number(fields.timestamp)) || Number(fields.timestamp)<=0) {
        throw new Error(`Page ${current} has a scrobble whose edit fields could not be verified. Nothing was skipped.`);
      }
      rows.push({form:forms[0],fields});
    }
    if(!rows.length) throw new Error(`Page ${current} returned no editable scrobbles. Progress is saved; nothing was skipped.`);
    for(let i=1;i<rows.length;i++) if(Number(rows[i].fields.timestamp)>Number(rows[i-1].fields.timestamp)) {
      throw new Error(`Page ${current} changed order during discovery. Nothing was skipped.`);
    }
    const next=A.nextPage(doc,url);
    if(next && Number(new URL(next).searchParams.get('page'))!==current+1) throw new Error('The next library page could not be verified.');
    let total=current;
    for(const link of root.querySelectorAll('nav.pagination a[href]')) {
      const target=new URL(link.getAttribute('href'),url), n=Number(target.searchParams.get('page'));
      if(target.origin===u.origin && target.pathname===u.pathname &&
         [...target.searchParams.keys()].every(k=>k==='page') && Number.isSafeInteger(n) && n>total) total=n;
    }
    if(!next && total>current) throw new Error('Last.fm omitted the next page before the end. Progress is saved.');
    return {rows,next,total,current};
  }
  function played(doc,url,user,item) {
    const returned=A.musicItem(url);
    if(!A.ownProfile(url,user) || returned?.type!=='tracks' ||
       R.normalize(returned.artist)!==R.normalize(item.artist) || R.normalize(returned.name)!==R.normalize(item.track)) {
      throw new Error('Last.fm returned a different track history.');
    }
    const matches=[...doc.querySelectorAll('tr.chartlist-row form[data-edit-scrobble]')]
      .map(form=>A.editRow(form,url,user,true)).filter(f=>f && key(f)===key(item) && f.timestamp===item.timestamp);
    if(matches.length!==1) throw new Error('This exact play could not be verified in the recent track history.');
    return matches[0];
  }
  function dialog(doc,url,user,item) {
    const forms=[...doc.querySelectorAll('form')].filter(form=>{
      let target;try{target=new URL(form.getAttribute('action'),url);}catch{return false;}
      return form.method==='post' && A.ownProfile(target.href,user) && /\/library\/edit-track$/.test(target.pathname) && A.editPairs(form);
    });
    if(forms.length!==1) throw new Error('Last.fm did not return a supported native edit dialog. Future corrections have paused.');
    const form=forms[0], pairs=A.editPairs(form);
    const values={artist:item.artist,track:item.track,album:item.album,albumArtist:item.albumArtist};
    if(value(form,'timestamp')!==item.timestamp || Object.entries(values).some(([name,v])=>!pairs[name] || pairs[name].from!==v || pairs[name].to!==v)) {
      throw new Error('The play changed before editing. Its album details were left alone.');
    }
    const allowed=new Set(['csrfmiddlewaretoken','timestamp','submit','edit_all','create_automatic_edit_rule',
      ...['artist_name','track_name','album_name','album_artist_name'].flatMap(n=>[n,n+'_original'])]);
    if([...form.elements].some(f=>f.name&&!allowed.has(f.name))) throw new Error('Last.fm added an unknown edit field. Future corrections have paused.');
    form.action=new URL(form.getAttribute('action'),url).href;
    form.querySelector('[name="album_name"]').value='';
    form.querySelector('[name="album_artist_name"]').value='';
    // Absence is intentional: never edit older matches or create a Last.fm rule.
    form.querySelectorAll('[name="edit_all"],[name="create_automatic_edit_rule"]').forEach(f=>f.remove());
    return form;
  }
  function launcher(original,user) {
    if(!A.editRow(original,location.href,user,true)) throw new Error('The native scrobble launcher could not be verified.');
    const form=original.cloneNode(true);
    form.action=new URL(original.getAttribute('action'),location.href).href;
    const allowed=new Set(['csrfmiddlewaretoken','artist_name','track_name','album_name','album_artist_name','timestamp']);
    for(const field of [...form.elements]) if(!allowed.has(field.name)) field.remove();
    return form;
  }
  globalThis.LastfmAlbumlessReader=Object.freeze({key,library,history,value,page,played,dialog,launcher});
})();
