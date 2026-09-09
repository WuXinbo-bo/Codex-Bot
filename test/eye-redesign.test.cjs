const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../src/appearance.js');
const R=require('../src/m1-rig.js');

test('fifteen eye presets have eight base designs and seven contextual looks',()=>{
  assert.deepEqual(A.EYE_STYLES.slice(0,2),['classic','anime']);
  assert.equal(A.EYE_STYLES.length,15);
  assert.equal(Object.values(A.EYE_PRESETS).filter(v=>v.group==='base').length,8);
  assert.equal(Object.values(A.EYE_PRESETS).filter(v=>v.group==='emotion').length,7);
  for(const [old,next] of Object.entries(A.LEGACY_EYES))assert.equal(A.normalize({eyeStyle:old}).eyeStyle,next);
  for(const id of ['__proto__','constructor','toString','invalid'])assert.equal(A.normalize({eyeStyle:id}).eyeStyle,'auto');
  for(const artStyle of Object.keys(A.ART_STYLES))assert.ok(A.EYE_PRESETS[A.eyeConfig('neutral',{artStyle}).baseId]);
});

test('retired eye selections migrate to automatic without changing supported art or proud poses',()=>{
  for(const eyeStyle of ['pixel','manga','smug','ink'])for(const schemaVersion of [1,2]){
    assert.ok(!A.EYE_STYLES.includes(eyeStyle));
    const next=A.migrate({schemaVersion,eyeStyle,artStyle:'clay',skin:'pink',shape:'star'});
    assert.equal(next.eyeStyle,'auto');assert.equal(next.artStyle,'clay');
    assert.equal(next.skin,'pink');assert.equal(next.shape,'star');
    assert.deepEqual(A.migrate(next),next);
  }
  assert.ok(R.EXPRESSIONS.special_smug);assert.ok(R.EXPRESSIONS.proud_soft);
  for(const art of Object.values(A.ART_STYLES))if(art.eye)assert.ok(A.EYE_PRESETS[art.eye]);
  for(const preset of Object.values(A.EYE_PRESETS))if(preset.base)assert.ok(A.EYE_PRESETS[preset.base]);
  for(const name of Object.keys(R.EXPRESSIONS)){
    const pose=R.getExpression(name),config=A.eyeConfig(name,{},pose.eyeStyle);
    assert.ok(!['pixel','manga','smug'].includes(pose.eyeStyle),name);
    if(config.emotion)assert.ok(A.EYE_PRESETS[config.emotion],name);
  }
  let seed=73;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const director=A.createDirector({eyeStyle:'auto'},{random});const seen=new Set();
  for(let i=0;i<2000;i++){
    const result=director.sample({force:true});seen.add(result.eyeStyle);
    assert.ok(A.EYE_PRESETS[result.eyeStyle]);assert.ok(!['pixel','manga','smug'].includes(result.eyeStyle));
  }
  assert.equal(seen.size,8);
});

test('classic and anime preserve original neutral eyes and anime highlights',()=>{
  for(const eyeStyle of ['classic','anime']){
    const pose=R.getExpression('neutral'),styled=R.styleEyes(pose,A.eyeConfig('neutral',{eyeStyle}));
    assert.deepEqual(styled.eyes,pose.eyes);assert.deepEqual(styled.pupils,pose.pupils);
    assert.equal(styled.eyeDesign.anime,eyeStyle==='anime'?1:0);
    assert.equal(styled.eyeDesign.secondary,eyeStyle==='anime'?1:0);
  }
});

test('every eye design and expression maps to finite geometry without mutating authored poses',()=>{
  for(const name of Object.keys(R.EXPRESSIONS))for(const eyeStyle of A.EYE_STYLES){
    const pose=R.getExpression(name),original=JSON.stringify(pose),config=A.eyeConfig(name,{eyeStyle},pose.eyeStyle);
    const result=R.styleEyes(pose,config);
    assert.equal(JSON.stringify(pose),original);
    for(const side of ['left','right']){
      const eye=result.eyes[side];assert.ok(eye.rx>0&&eye.ry>0);
      assert.ok(!/NaN|undefined|Infinity/.test(R.eyePath(eye)));
      assert.ok(result.pupils[side].rx<eye.rx&&result.pupils[side].ry<eye.ry);
    }
    assert.ok(A.EYE_PRESETS[config.id]);
  }
});

test('context changes eye attitude, not the selected base identity',()=>{
  assert.equal(A.eyeConfig('deep_focus',{eyeStyle:'auto'}).emotion,'focus');
  assert.equal(A.eyeConfig('neutral',{eyeStyle:'auto'}).emotion,undefined);
  assert.equal(A.eyeConfig('emotion_setback_1',{eyeStyle:'auto'}).emotion,'tender');
  const fixed=A.eyeConfig('special_covert',{eyeStyle:'anime'},'asymmetric');
  assert.equal(fixed.baseId,'anime');assert.equal(fixed.emotion,'curious');
  assert.equal(A.eyeConfig('neutral',{eyeStyle:'sleepy'}).tempo,1.7);
});
