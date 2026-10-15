(() => {
  'use strict';
  const S=LastfmStore, $=id=>document.getElementById(id);
  let username='',state,busy=false,revision=0;
  const selected=new Set();
  const message=(text,error=false)=>{$('message').textContent=text;$('message').dataset.tone=error?'error':'success';};
  const ordered=items=>Object.entries(items).sort(([,a],[,b])=>a.artist.localeCompare(b.artist)||a.track.localeCompare(b.track));
  const encode=value=>encodeURIComponent(value).replace(/%20/g,'+');
  function ruleRows() {
    const query=$('rule-search').value.toLowerCase();$('rules').replaceChildren();
    for(const [id,rule] of ordered(state.rules)) {
      if(!(rule.artist+' '+rule.track).toLowerCase().includes(query))continue;
      const row=document.createElement('tr');
      for(const value of [rule.artist,rule.track,new Date(rule.since*1000).toLocaleString()]) {const cell=document.createElement('td');cell.textContent=value;row.append(cell);}
      const cell=document.createElement('td'),button=document.createElement('button');button.type='button';button.textContent='Delete';
      button.setAttribute('aria-label',`Delete ${rule.track} by ${rule.artist}`);button.disabled=busy;
      button.addEventListener('click',()=>mutate(scoped=>scoped('delete',{id,expected:rule}),'Rule deleted. Existing scrobbles were left alone.'));
      cell.append(button);row.append(cell);$('rules').append(row);
    }
  }
  function render() {
    if(!state)return;
    $('profile-status').textContent='Profile: '+username;
    $('correction-status').textContent=state.lastError?'Paused: '+state.lastError:state.enabled?'Future corrections enabled.':'Future corrections disabled.';
    $('toggle-corrections').textContent=state.enabled?'Disable future corrections':'Enable future corrections';
    $('toggle-corrections').disabled=busy;
    $('library-link').href=`https://www.last.fm/user/${encode(username)}/library#lfm-albumless`;
    const count=Object.keys(state.rules).length;
    $('rule-count').textContent=count+(count===1?' rule':' rules');ruleRows();
    const scan=state.scan;
    $('scan-summary').textContent=`${scan.next-1}${scan.total?' of '+scan.total:''} pages checked${scan.complete?' · Discovery complete':''}.`;
    $('candidates').replaceChildren();
    for(const [id,item] of ordered(scan.candidates)) {
      if(state.rules[id])continue;
      const label=document.createElement('label');label.className='check-label';
      const box=document.createElement('input');box.type='checkbox';box.value=id;box.checked=selected.has(id);box.disabled=busy;
      box.addEventListener('change',()=>{if(box.checked)selected.add(id);else selected.delete(id);});
      label.append(box,`${item.artist} — ${item.track}`);$('candidates').append(label);
    }
    $('apply-candidates').disabled=busy||!$('candidates').childElementCount;
    $('select-all').disabled=busy;$('select-none').disabled=busy;
    $('attempts').replaceChildren();
    const pending=Object.entries(state.attempts).filter(([,a])=>a.phase!=='verified');
    $('attempt-section').hidden=!pending.length;
    for(const [id,a] of pending) {
      const line=document.createElement('p'),link=document.createElement('a'),button=document.createElement('button');
      link.href=`https://www.last.fm/user/${encode(username)}/library/music/+noredirect/${encode(a.artist)}/_/${encode(a.track)}`;
      link.target='_blank';link.rel='noopener';link.textContent=`${a.artist} — ${a.track} (${new Date(Number(a.timestamp)*1000).toLocaleString()})`;
      button.type='button';button.textContent='Allow another attempt';button.disabled=busy;
      button.addEventListener('click',()=>{if(confirm('Check this exact play on Last.fm first. Allow one new attempt only if both album fields still need clearing?'))void mutate(scoped=>scoped('dismiss-attempt',{id,token:a.token}),'A new attempt is allowed. Enable future corrections when ready.');});
      line.append(link,' ',button);$('attempts').append(line);
    }
  }
  async function refresh() {
    const current=++revision;
    try {const snapshot=await S.read(),user=snapshot.settings.username;const next=await S.albumless(user,'read');if(current!==revision)return;if(user!==username)selected.clear();username=user;state=next;render();}
    catch(error){message(error.message,true);}
  }
  async function mutate(operation,success) {
    if(busy)return;busy=true;render();
    const user=username;
    try {state=await operation((op,values)=>S.albumless(user,op,values));message(success);}
    catch(error){message(error.message,true);}
    finally {busy=false;await refresh();}
  }
  $('toggle-corrections').addEventListener('click',()=>mutate(scoped=>scoped('configure',{enabled:!state.enabled,revision:state.revision}),'Future-correction setting saved.'));
  $('rule-search').addEventListener('input',()=>{if(state)ruleRows();});
  $('select-all').addEventListener('click',()=>{$('candidates').querySelectorAll('input').forEach(b=>{selected.add(b.value);b.checked=true;});});
  $('select-none').addEventListener('click',()=>{selected.clear();$('candidates').querySelectorAll('input').forEach(b=>b.checked=false);});
  $('apply-candidates').addEventListener('click',()=>mutate(async scoped=>{
    const tracks=[...selected].filter(id=>state.scan.candidates[id]&&!state.rules[id]).map(id=>state.scan.candidates[id]);
    if(!tracks.length)throw new Error('Select at least one candidate.');
    let latest=state;
    for(let i=0;i<tracks.length;i+=1000) latest=await scoped('learn',{tracks:tracks.slice(i,i+1000)});
    selected.clear();return latest;
  },'Selected tracks remembered for future plays only.'));
  $('add-rule').addEventListener('submit',event=>{event.preventDefault();void mutate(scoped=>scoped('learn',{tracks:[{artist:$('artist').value,track:$('track').value}]}),'Track remembered for future plays only.');});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.lfmAlbumlessV1||changes.settings))void refresh();});
  void refresh();
})();
