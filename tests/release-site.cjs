const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL,fileURLToPath}=require('node:url');
const {chromium}=require('playwright');
const {build}=require('../tools/package-beta.cjs');
(async()=>{
 build();
 const root=path.resolve(__dirname,'..'),site=path.join(root,'dist','site');
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
 try {
  const page=await browser.newPage(),errors=[],network=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>{network.push(r.request().url());return r.abort();});
  for(const width of [1280,390]) {
   await page.setViewportSize({width,height:900});
   for(const file of ['index.html','privacy.html']) {
    await page.goto(pathToFileURL(path.join(site,file)).href);
    assert.equal(await page.locator('h1').count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${file} fits ${width}px`);
    const resources=await page.locator('a[href],img[src],link[href]').evaluateAll(nodes=>nodes.map(n=>n.href||n.src));
    for(const url of resources)if(url.startsWith('file:'))assert.ok(fs.existsSync(fileURLToPath(new URL(url))),`missing site target ${url}`);
    assert.equal(await page.locator('img').evaluateAll(nodes=>nodes.every(n=>n.complete&&n.naturalWidth>0)),true,'site images load');
    await page.screenshot({path:path.join(root,'test-results',`beta-${file.slice(0,-5)}-${width}.png`),fullPage:true});
   }
  }
  assert.deepEqual(errors,[]);assert.deepEqual(network,[],'static site has no external dependencies or analytics');
  console.log('PASS: assembled download/privacy site at desktop/mobile widths, local links/assets, loaded images and no external requests');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
