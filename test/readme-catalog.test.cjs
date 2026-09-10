const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {buildCatalog}=require('../scripts/readme-catalog.cjs');
const A=require('../src/m1-activities'),R=require('../src/m1-rig'),P=require('../src/appearance'),M=require('../src/mask-system');
const c=buildCatalog();
test('README atlas covers every current activity once with bounded pages',()=>{
  const ids=c.pages.flatMap(p=>p.entries.map(e=>e.id));assert.equal(ids.length,Object.keys(A.CLIPS).length);assert.equal(new Set(ids).size,ids.length);assert.deepEqual(new Set(ids),new Set(Object.keys(A.CLIPS)));
  assert.ok(c.pages.every(p=>p.entries.length>0&&p.entries.length<=12));assert.equal(c.sheets.length,23);assert.equal(c.counts.featured,207);
});
test('all curated and full-gallery frames reference real assets and Chinese labels',()=>{
  for(const s of [...c.sheets,...c.pages])for(const e of s.entries){
    assert.match(e.label,/\p{Script=Han}/u,e.id);
    if(e.kind==='activity'){assert.ok(A.CLIPS[e.id][e.index]);assert.equal(e.duration,A.duration(e.id));}
    if(e.kind==='expression')assert.ok(R.EXPRESSIONS[e.id]);
    if(e.kind==='mask')assert.ok(M.MASKS[e.id]);
    if(e.kind==='symbol')assert.ok(R.SYMBOLS.includes(e.id));
    if(e.appearance?.eyeStyle&&e.appearance.eyeStyle!=='auto')assert.ok(P.EYE_PRESETS[e.appearance.eyeStyle]);
    if(e.appearance?.artStyle)assert.ok(P.ART_STYLES[e.appearance.artStyle]);
  }
});
test('checked-in catalog, gallery pages and media correspond to current source',()=>{
  assert.deepEqual(require('../docs/gallery/catalog.json'),c);
  for(const [folder,list] of [['readme',c.sheets],['atlas',c.pages]])for(const s of list){
    const image=path.join(__dirname,'../docs/assets',folder,s.id+'.webp');assert.ok(fs.existsSync(image),image);assert.ok(fs.statSync(image).size<250*1024,image);
    if(folder==='atlas'){const md=fs.readFileSync(path.join(__dirname,'../docs/gallery',s.id+'.md'),'utf8');for(const e of s.entries)assert.ok(md.includes('`'+e.id+'`'));}
  }
});
