/* Store handoff assets only; never copies a browser profile or personal data. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {build,zip}=require('./package-beta.cjs');
const root=path.resolve(__dirname,'..');
function buildStore(){
 const built=build(),version=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))).version;
 const paths=[['dist/'+built.filename,built.filename],['dist/'+built.filename+'.sha256',built.filename+'.sha256'],['dist/package-manifest.json','package-manifest.json'],['release/STORE-LISTING.md','STORE-LISTING.md'],['release/PUBLISHING.md','PUBLISHING.md'],['release/NOTES.md','NOTES.md']];
 for(const file of ['icon128.png','promo440.png','setup.png','preferences.png','xml-review.png'])paths.push(['release/assets/'+file,'assets/'+file]);
 for(const file of ['index.html','privacy.html','site.css','extension-ui.css'])paths.push(['dist/site/'+file,'site/'+file]);
 for(const file of [built.filename,built.filename+'.sha256'])paths.push(['dist/site/downloads/'+file,'site/downloads/'+file]);
 for(const file of ['icon128.png','promo440.png','setup.png','preferences.png','xml-review.png'])paths.push(['dist/site/assets/'+file,'site/assets/'+file]);
 const entries=paths.map(([source,name])=>({name,data:fs.readFileSync(path.join(root,source))}));
 const audit=entries.map(e=>({name:e.name,bytes:e.data.length,sha256:crypto.createHash('sha256').update(e.data).digest('hex')}));
 entries.push({name:'submission-manifest.json',data:Buffer.from(JSON.stringify({version,runtimeSha256:built.sha256,files:audit},null,2)+'\n')});
 const bytes=zip(entries),filename='chrome-web-store-'+version+'-submission.zip',sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 fs.writeFileSync(path.join(root,'dist',filename),bytes);fs.writeFileSync(path.join(root,'dist',filename+'.sha256'),sha256+'  '+filename+'\n');
 console.log('Built '+filename+': '+entries.length+' files, '+bytes.length+' bytes\nSHA-256 '+sha256);return {filename,sha256};
}
if(require.main===module)buildStore();module.exports={buildStore};
