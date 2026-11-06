const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');const{chromium}=require('playwright');const{mockExtension,loadScripts,libraryCache}=require('./harness.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});try{
 const p=await browser.newPage();await p.goto('about:blank');await p.setContent(fs.readFileSync(path.join(__dirname,'../itunes.html'),'utf8').replace(/<script[^>]*><\/script>/g,''));
 const entry={type:'tracks',id:'["artist","song"]',rule:{from:'song',to:'Song',artist:'Artist',exact:true}};
 const w=await mockExtension(p,{settings:{username:'DCCXX'},rules:{artists:{},albums:{},tracks:{},albumArtists:{}},lfmLibraryCacheV1:libraryCache('DCCXX',[entry])},{senderUrl:'chrome-extension://test/itunes.html'});
 await loadScripts(p,['rules.js','store.js','library-casing.js','itunes-parser.js','library-cache.js','cache-ui.js','itunes.js']);
 await p.waitForFunction(()=>!document.querySelector('#xml-file').disabled&&document.querySelector('#cache-step-status').textContent==='Complete');
 assert.equal(await p.locator('details.workflow-step').count(),3);assert.equal(await p.locator('#step-cache').evaluate(e=>e.open),false);assert.equal(await p.locator('#step-xml').evaluate(e=>e.open),true);
 assert.match(await p.locator('.xml-instructions').innerText(),/File → Library → Export Library/);
 await p.locator('#step-cache').evaluate(e=>e.open=true);await p.locator('.cache-advanced').evaluate(e=>e.open=true);assert.match(await p.locator('.cache-warning').innerText(),/50,000.*30 minutes/);
 const file={name:'Library.xml',mimeType:'text/xml',buffer:Buffer.from('<plist><dict><key>Tracks</key><dict><key>1</key><dict><key>Name</key><string>Song</string><key>Artist</key><string>Artist</string></dict></dict></dict></plist>')};
 await p.locator('#xml-file').setInputFiles(file);await p.locator('#compare').click();await p.locator('#review').waitFor();
 assert.equal(await p.locator('#step-review').evaluate(e=>e.open),true);
 await p.evaluate(()=>{const send=chrome.runtime.sendMessage;chrome.runtime.sendMessage=async m=>{if(m.action==='itunes-apply'){window.applyCalls=(window.applyCalls||0)+1;await new Promise(resolve=>window.finishSave=resolve);if(window.failSave)throw Error('Storage unavailable');}return send(m)}});
 async function begin(){await p.locator('#apply').click();await p.locator('#confirm').click();await p.waitForFunction(()=>!!window.finishSave);}
 await begin();assert.equal(await p.locator('#save-title').innerText(),'Saving changes…');assert.equal(await p.locator('#save-progress').isVisible(),true);assert.equal(await p.locator('#apply').isDisabled(),true);assert.equal(await p.locator('#xml-file').isDisabled(),true);assert.equal(await p.locator('#review').getAttribute('aria-busy'),'true');assert.equal(await p.locator('#candidates input').isDisabled(),true);assert.equal(Object.keys(w.data.rules.tracks).length,0,'no premature Complete or storage change');
 await p.evaluate(()=>{window.failSave=true;window.finishSave()});await p.locator('#save-title').filter({hasText:'Could not save changes.'}).waitFor();
 assert.equal(await p.locator('#candidates input').isChecked(),true,'failed save retains review selection');assert.equal(Object.keys(w.data.rules.tracks).length,0);assert.equal(await p.locator('#save-progress').isHidden(),true);
 await p.locator('#refresh-review').click();await p.locator('#apply:enabled').waitFor();await p.evaluate(()=>{window.failSave=false;window.finishSave=null});await begin();await p.evaluate(()=>window.finishSave());
 await p.getByText('Complete — 1 display preferences saved.',{exact:true}).waitFor();assert.equal(w.data.rules.tracks[entry.id].to,'Song');assert.equal(await p.locator('#review-step-status').innerText(),'Complete');assert.equal(await p.locator('#save-progress').isHidden(),true);assert.equal(await p.locator('#revert').isVisible(),true);assert.equal(await p.evaluate(()=>window.applyCalls),2,'each confirmation sends only one request');
 console.log('PASS: numbered collapsible steps, export instructions, rebuild warning, delayed-save spinner, duplicate prevention, retained failure selections, committed Complete and undo');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
