const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../src/appearance.js');
test('appearance settings reject unsupported values and preserve false toggles',()=>{
  const a=A.normalize({skin:'bad',shape:'bad',motion:'bad',random:false,particles:false,emoji:false,extra:'bad'});
  assert.equal(a.skin,'lemon'); assert.equal(a.shape,'morph'); assert.equal(a.motion,'full');
  assert.equal(A.normalize({skin:'green'}).skin,'green');
  assert.equal(a.random,false); assert.equal(a.emoji,false); assert.equal(a.extra,undefined);
});
test('all eighteen shape paths have equal topology and finite bounded coordinates',()=>{
  assert.equal(A.SHAPES.length,18); assert.equal(Object.keys(A.SKINS).length,8);
  for(const name of A.SHAPES){const p=A.points(name);assert.equal(p.length,120);for(const v of p){assert.ok(Number.isFinite(v.x)&&Math.abs(v.x)<=1);assert.ok(Number.isFinite(v.y)&&Math.abs(v.y)<=1);}assert.ok(!A.path(name,{cx:64,cy:64,rx:52,ry:52},'circle',.5).includes('NaN'));}
});

test('eye style defaults to authored auto and every fixed style survives persistence',()=>{
  assert.equal(A.normalize({eyeStyle:'invalid'}).eyeStyle,'auto');
  assert.equal(A.EYE_STYLES.length,9);
  for(const eyeStyle of A.EYE_STYLES)assert.equal(A.normalize(JSON.parse(JSON.stringify({eyeStyle}))).eyeStyle,eyeStyle);
});
