const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mockExtension, loadScripts } = require('./harness.cjs');

(async () => {
 const browser = await chromium.launch({headless:true,
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const page = await browser.newPage();
  await page.route('https://www.last.fm/**', r=>r.fulfill({contentType:'text/html',body:`
   <div class="popup_content"><form method="post" action="/user/DCCXX/library/edit-album" data-modal-form>
   <input name="album_name_original" value="ALBUM" readonly><input name="album_name" value="Album">
   <input name="album_artist_name_original" value="Artist" readonly><input name="album_artist_name" value="Artist">
   <button type="submit" class="btn-primary"><span class="btn-inner">Save edit</span></button></form></div>`}));
  await page.goto('https://www.last.fm/user/DCCXX/library');
  await mockExtension(page,{settings:{username:'DCCXX',infiniteScroll:false}},{artworkLookups:false});
  await loadScripts(page,['rules.js','store.js','adapter.js','native-edit.js']);
  await page.addStyleTag({path:'lfm-ui.css'});
  await page.evaluate(()=>document.addEventListener('click',e=>{
   if(e.target.closest('[data-lfm-local-toast]'))window.toastClickEscaped=true;
  }));
  const save=page.locator('[data-lfm-save-casing]'), toast=page.locator('[data-lfm-local-toast]');
  await save.click(); await toast.waitFor();
  assert.equal(await page.locator('[data-lfm-case-confirmation]').count(),0,'only the top-right confirmation');
  assert.equal(await toast.count(),1);
  assert.equal(await toast.locator('p').textContent(),'Case-sensitive changes saved locally.');
  const actions=toast.locator('[data-lfm-toast-actions]');
  assert.equal(await actions.locator('a').textContent(),'Manage preferences');
  assert.equal(await actions.locator('button').textContent(),'Dismiss');
  assert.match(await actions.locator('a').getAttribute('href'),/preferences.html$/);
  const layout=await toast.evaluate(t=>{const p=t.querySelector('p'),[a,b]=t.querySelector('[data-lfm-toast-actions]').children;
   return {position:getComputedStyle(t).position,animation:getComputedStyle(t).animationName,
    beneath:a.getBoundingClientRect().top>=p.getBoundingClientRect().bottom,
    sameLine:a.getBoundingClientRect().top===b.getBoundingClientRect().top,
    colors:[a,b].map(x=>getComputedStyle(x).backgroundColor)};});
  assert.equal(layout.position,'fixed'); assert.equal(layout.animation,'lfm-toast-in');
  assert.equal(layout.beneath,true); assert.equal(layout.sameLine,true);
  assert.deepEqual(layout.colors,['rgb(188, 234, 203)','rgb(188, 234, 203)']);
  // Use the real timer once, including its animated exit.
  await page.waitForTimeout(4600); assert.equal(await toast.count(),1);
  await toast.waitFor({state:'detached',timeout:1500});
  await page.locator('.popup_content form').evaluate(f=>{
   const error=document.createElement('p');error.setAttribute('role','alert');
   error.textContent='Your edit doesn’t contain any real changes. We cannot accept casing changes.';f.append(error);
  });
  await page.waitForTimeout(100);
  assert.equal(await toast.count(),0,'removing the toast does not lose the already-saved form guard');
  // Replacement resets expiry; the old toast's timer cannot remove the new one.
  await save.click(); await toast.waitFor(); await page.waitForTimeout(2800);
  await save.click(); await page.waitForTimeout(2600);
  assert.equal(await toast.count(),1,'new save survives the previous expiry');
  await actions.getByRole('button',{name:'Dismiss'}).click();
  assert.equal(await page.evaluate(()=>Boolean(window.toastClickEscaped)),false,'toast controls do not trigger native outside-dialog click handling');
  assert.equal(await toast.getAttribute('data-leaving'),'');
  await toast.waitFor({state:'detached',timeout:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:320,height:700});
  await save.click(); await toast.waitFor();
  assert.equal(await toast.evaluate(t=>getComputedStyle(t).animationName),'none');
  assert.equal(await actions.evaluate(t=>{const [a,b]=t.children;return a.getBoundingClientRect().top===b.getBoundingClientRect().top}),true);
  await actions.getByRole('button',{name:'Dismiss'}).click();
  await toast.waitFor({state:'detached',timeout:500});
  console.log('PASS: single success toast, separate green action row, slide animations, five-second expiry, replacement, dismiss and reduced motion');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
