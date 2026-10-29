const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {inputs,validate,zip,build}=require('../tools/package-beta.cjs');
const entries=inputs(),manifest=validate(entries);
assert.equal(manifest.version,'0.9.25');assert.equal(manifest.version_name,'0.9.25 beta');
assert.ok(entries.every(entry=>!entry.name.startsWith('albumless')), 'removed feature is not packaged');
assert.equal(manifest.name,'Remaster for Last.fm');
assert.throws(()=>validate(entries.filter(x=>x.name!=='store.js')),/Missing package reference/);
assert.throws(()=>validate([...entries,{name:'albumless-engine.js',data:Buffer.from('')}]), /Removed Albumless/);
const invalid=entries.map(x=>x.name==='manifest.json'?{...x,data:Buffer.from(JSON.stringify({...manifest,permissions:['storage','tabs']}))}:x);
assert.throws(()=>validate(invalid),/authority/);
assert.ok(entries.every(x=>!/(?:test|backup|\.xml$|\.log$|\.git|profile)/i.test(x.name)));
for(const page of entries.filter(x=>x.name.endsWith('.html')))
 assert.doesNotMatch(page.data.toString(),/\bv\d+\.\d+\.\d+/,page.name+' must show the manifest version through version.js');
for(const size of [16,32,48,128]){
 const png=entries.find(x=>x.name===`icons/icon${size}.png`).data;
 assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
}
const bytes=zip(entries);assert.deepEqual(bytes,zip(entries),'reproducible package bytes');
let offset=0;const found=[];
while(bytes.readUInt32LE(offset)===0x04034b50){
 const size=bytes.readUInt32LE(offset+18),length=bytes.readUInt16LE(offset+26);
 const name=bytes.subarray(offset+30,offset+30+length).toString();found.push(name);
 assert.deepEqual(bytes.subarray(offset+30+length,offset+30+length+size),entries.find(x=>x.name===name).data);
 offset+=30+length+size;
}
assert.equal(bytes.readUInt32LE(offset),0x02014b50);assert.deepEqual(found,entries.map(x=>x.name));
for(const name of ['preferences','xml-review','setup']){
 const png=fs.readFileSync(path.join(__dirname,'../release/assets',name+'.png'));
 assert.equal(png.readUInt32BE(16),1280);assert.equal(png.readUInt32BE(20),800);
}
const promo=fs.readFileSync(path.join(__dirname,'../release/assets/promo440.png'));
assert.equal(promo.readUInt32BE(16),440);assert.equal(promo.readUInt32BE(20),280);
const built=build(),site=fs.readFileSync(path.join(__dirname,'../dist/site/index.html'),'utf8');
assert.ok(site.includes(built.filename),'download page points to the newly built version');
assert.ok(site.includes('Free beta '+manifest.version));
assert.doesNotMatch(site,/lastfm-personal-library-0\.9\.13-beta/);
console.log(`PASS: ${entries.length} allowlisted files, complete references, approved local-storage permissions, unchanged identity, deterministic ZIP and store image dimensions`);
