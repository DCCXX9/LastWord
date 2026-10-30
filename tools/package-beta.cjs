/* Explicit allowlist; no recursive workspace copy, dependencies or user data. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const files = JSON.parse(fs.readFileSync(path.join(__dirname, 'release-files.json'), 'utf8'));
function inputs() {
  if (new Set(files).size !== files.length) throw new Error('Duplicate release entries.');
  return [...files].sort().map(name => {
    if (!/^(?:[a-z][a-z0-9-]*\.(?:js|json|html|css)|icons\/icon(?:16|32|48|128)\.png)$/.test(name)) throw new Error('Unsafe release entry: ' + name);
    const source = path.join(root, name);
    if (!fs.lstatSync(source).isFile() || fs.lstatSync(source).isSymbolicLink()) throw new Error('Not a regular release file: ' + name);
    return {name,data:fs.readFileSync(source)};
  });
}
function validate(entries) {
  const names = new Set(entries.map(x => x.name));
  const manifest = JSON.parse(entries.find(x => x.name === 'manifest.json').data);
  if (manifest.manifest_version !== 3 || JSON.stringify(manifest.permissions) !== '["storage","unlimitedStorage","alarms"]' ||
      manifest.host_permissions || manifest.optional_permissions || manifest.key || manifest.update_url ||
      manifest.externally_connectable || manifest.web_accessible_resources) throw new Error('Unexpected manifest authority or identity change.');
  const required = [manifest.background.service_worker,manifest.options_page,manifest.action.default_popup,
    ...Object.values(manifest.icons),...manifest.content_scripts.flatMap(s=>[...(s.js||[]),...(s.css||[])])];
  if (manifest.content_scripts.some(s=>JSON.stringify(s.matches)!=='["https://www.last.fm/*"]')) throw new Error('Unexpected site access.');
  for (const entry of entries) {
    const text = /\.(?:js|html|css)$/.test(entry.name) ? entry.data.toString('utf8') : '';
    if (/\.(?:js)$/.test(entry.name) && /\beval\s*\(|new\s+Function\s*\(|import\s*\(\s*['"]https?:/.test(text)) throw new Error('Executable remote/dynamic code: ' + entry.name);
    if (entry.name.endsWith('.html')) {
      if (/<script\b[^>]*\bsrc=["']https?:|<script\b(?![^>]*\bsrc=)[^>]*>\s*\S/i.test(text)) throw new Error('Non-local script: ' + entry.name);
      for (const match of text.matchAll(/\b(?:src|href)=["']([^"'#]+)["']/g)) {
        const target = match[1];
        if (/^[a-z]+:/i.test(target)) continue;
        required.push(path.posix.normalize(path.posix.join(path.posix.dirname(entry.name),target.split(/[?#]/)[0])));
      }
    }
    if (entry.name.endsWith('.js')) for (const group of text.matchAll(/importScripts\(([^)]+)\)/g)) {
      for (const match of group[1].matchAll(/['"]([^'"]+)['"]/g)) required.push(match[1]);
    }
  }
  for (const name of required) if (!names.has(name)) throw new Error('Missing package reference: ' + name);
  if (entries.some(x => /(?:^|\/)albumless(?:[-.]|$)/i.test(x.name) ||
      (x.name.endsWith('.js') && /LastfmAlbumless|automaticCorrections/.test(x.data.toString())))) {
    throw new Error('Removed Albumless feature must not be packaged.');
  }
  if (!/username:\s*''/.test(entries.find(x=>x.name==='store.js').data.toString())) throw new Error('Fresh installs must be disconnected.');
  return manifest;
}
const table = Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(data) {let n=0xffffffff;for(const byte of data)n=table[(n^byte)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
function zip(entries) {
  const local=[],central=[];let offset=0;
  for(const {name,data} of entries) {
    const filename=Buffer.from(name),crc=crc32(data),header=Buffer.alloc(30),record=Buffer.alloc(46);
    header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);
    header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);
    header.writeUInt32LE(data.length,22);header.writeUInt16LE(filename.length,26);
    record.writeUInt32LE(0x02014b50);record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);
    record.writeUInt16LE(0x800,8);record.writeUInt16LE(33,14);record.writeUInt32LE(crc,16);
    record.writeUInt32LE(data.length,20);record.writeUInt32LE(data.length,24);record.writeUInt16LE(filename.length,28);
    record.writeUInt32LE(offset,42);local.push(header,filename,data);central.push(record,filename);
    offset+=header.length+filename.length+data.length;
  }
  const directory=Buffer.concat(central),end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);
  end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,directory,end]);
}
function build() {
  const entries=inputs(),manifest=validate(entries),version=manifest.version;
  const filename=`lastword-for-lastfm-${version}-beta.zip`,out=path.join(root,'dist');
  fs.mkdirSync(out,{recursive:true});
  const bytes=zip(entries),digest=hash(bytes);
  fs.writeFileSync(path.join(out,filename),bytes);
  fs.writeFileSync(path.join(out,filename+'.sha256'),digest+'  '+filename+'\n');
  fs.writeFileSync(path.join(out,'package-manifest.json'),JSON.stringify({version,filename,sha256:digest,
    files:entries.map(({name,data})=>({name,bytes:data.length,sha256:hash(data)}))},null,2)+'\n');
  const site=path.join(out,'site');fs.mkdirSync(path.join(site,'downloads'),{recursive:true});
  fs.mkdirSync(path.join(site,'assets'),{recursive:true});
  for(const name of ['index.html','site.css']) {
    let source=fs.readFileSync(path.join(root,'release','site',name),'utf8');
    if(name==='index.html')source=source.replace(/Free beta \d+\.\d+\.\d+/g,'Free beta '+version)
      .replace(/(?:lastfm-personal-library|lastword-for-lastfm)-\d+\.\d+\.\d+-beta\.zip/g,filename)
      .replace(/v\d+\.\d+\.\d+ beta/g,'v'+version+' beta');
    fs.writeFileSync(path.join(site,name),source);
  }
  for(const name of ['icon128.png','promo440.png','preferences.png','xml-review.png','setup.png']) {
    fs.copyFileSync(path.join(root,'release','assets',name),path.join(site,'assets',name));
  }
  fs.writeFileSync(path.join(site,'privacy.html'),fs.readFileSync(path.join(root,'privacy.html'),'utf8')
    .replaceAll('options.html','index.html').replaceAll('help.html','index.html#help')
    .replace('← Settings &amp; backup','← Beta download')
    // The hosted copy has no extension runtime, so write the version in directly.
    .replace(/<span data-version>[^<]*<\/span>/g,'v'+manifest.version).replace(/<script src="version\.js"><\/script>\r?\n/,''));
  fs.copyFileSync(path.join(root,'extension-ui.css'),path.join(site,'extension-ui.css'));
  fs.copyFileSync(path.join(out,filename),path.join(site,'downloads',filename));
  fs.copyFileSync(path.join(out,filename+'.sha256'),path.join(site,'downloads',filename+'.sha256'));
  console.log(`Built ${filename}: ${entries.length} files, ${bytes.length} bytes\nSHA-256 ${digest}`);
  return {filename,sha256:digest,files:entries.map(x=>x.name)};
}
if(require.main===module)build();
module.exports={inputs,validate,zip,build};
