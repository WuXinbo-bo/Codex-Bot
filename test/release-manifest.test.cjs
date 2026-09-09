const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
test('release manifest uses an existing space-free public asset name',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'codex-release-'));
  const folder=path.join(root,'src-tauri/target/release/bundle/nsis');fs.mkdirSync(folder,{recursive:true});
  const config=require('../src-tauri/tauri.conf.json'),name=`${config.productName}_${config.version}_x64-setup.exe`;
  fs.writeFileSync(path.join(folder,name),'fixture installer');fs.writeFileSync(path.join(folder,name+'.sig'),'fixture signature');fs.writeFileSync(path.join(root,'CHANGELOG.md'),'# Changelog\n\n## '+config.version+'\n\nTest release');
  try{
    cp.execFileSync(process.execPath,[path.resolve('scripts/release-manifest.cjs')],{cwd:root});
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'release-artifacts/latest.json')));
    const basename=new URL(manifest.platforms['windows-x86_64'].url).pathname.split('/').at(-1);
    assert.match(basename,/^[A-Za-z0-9_.-]+$/);assert.ok(fs.existsSync(path.join(root,'release-artifacts',basename)));
    assert.equal(fs.readFileSync(path.join(root,'release-artifacts',basename+'.sig'),'utf8'),'fixture signature');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
