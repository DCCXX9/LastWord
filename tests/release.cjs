const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {inputs,validate,zip}=require('../tools/package-beta.cjs');
const entries=inputs(),manifest=validate(entries);
assert.equal(manifest.version,'0.8.1');assert.equal(manifest.version_name,'0.8.1 beta');
assert.equal(manifest.name,'Last.fm Personal Library');
assert.throws(()=>validate(entries.filter(x=>x.name!=='store.js')),/Missing package reference/);
const invalid=entries.map(x=>x.name==='manifest.json'?{...x,data:Buffer.from(JSON.stringify({...manifest,permissions:['storage','tabs']}))}:x);
assert.throws(()=>validate(invalid),/authority/);
assert.ok(entries.every(x=>!/(?:test|backup|\.xml$|\.log$|\.git|profile)/i.test(x.name)));
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
console.log(`PASS: ${entries.length} allowlisted files, complete references, unchanged authority/identity, deterministic ZIP and store image dimensions`);
