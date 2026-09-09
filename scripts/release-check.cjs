const fs=require('node:fs'),cp=require('node:child_process');
const p=require('../package.json'),t=require('../src-tauri/tauri.conf.json'),u=require('../release/update.json');
if(p.version!==t.version||!fs.readFileSync('src-tauri/Cargo.toml','utf8').includes(`version = "${p.version}"`))throw Error('Version mismatch');
if(!/^[\w.-]+\/[\w.-]+$/.test(u.repository)||!u.pubkey)throw Error('Missing update trust configuration');
if(t.plugins.updater.pubkey!==u.pubkey||t.plugins.updater.endpoints[0]!==`https://github.com/${u.repository}/releases/latest/download/latest.json`)throw Error('Updater trust configuration mismatch');
if(!fs.readFileSync('LICENSE','utf8').includes('Apache License'))throw Error('Missing Apache license');
if(process.env.GITHUB_REF_TYPE==='tag'&&process.env.GITHUB_REF_NAME!==`v${p.version}`)throw Error('Tag/version mismatch');
const files=cp.execFileSync('git',['ls-files','-z']).toString().split('\0').filter(Boolean);
const patterns=[/gh[pousr]_[A-Za-z0-9]{30,}/,/github_pat_[A-Za-z0-9_]{30,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
const unsafe=[];
for(const file of files){
  if(/(?:^|\/)(?:\.env(?:\.|$)|config\.local\.json$)|\.key$/.test(file)){unsafe.push(file);continue;}
  const data=fs.readFileSync(file);if(data.includes(0))continue;
  if(patterns.some(p=>p.test(data.toString())))unsafe.push(file);
}
if(unsafe.length)throw Error('Potential credentials in: '+unsafe.join(', '));
console.log(`Release configuration and ${files.length} tracked files checked`);
