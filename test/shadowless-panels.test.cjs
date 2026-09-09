const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('production surfaces do not reintroduce shadows or backdrop blur',()=>{
  for(const file of ['src/style.css','src/completions.css','src/lifecycle-toast.css']){
    const css=fs.readFileSync(file,'utf8');
    assert.doesNotMatch(css,/(?:box-shadow|text-shadow|backdrop-filter)\s*:/,file);
    assert.doesNotMatch(css,/drop-shadow\s*\(/,file);
  }
  assert.match(fs.readFileSync('src-tauri/src/main.rs','utf8'),/\.shadow\(false\)/);
});
