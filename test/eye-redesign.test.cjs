const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../src/appearance.js');
const R=require('../src/m1-rig.js');

test('eighteen eye presets have ten base designs and eight contextual looks',()=>{
  assert.deepEqual(A.EYE_STYLES.slice(0,2),['classic','anime']);
  assert.equal(A.EYE_STYLES.length,18);
  assert.equal(Object.values(A.EYE_PRESETS).filter(v=>v.group==='base').length,10);
  for(const [old,next] of Object.entries(A.LEGACY_EYES))assert.equal(A.normalize({eyeStyle:old}).eyeStyle,next);
  for(const id of ['__proto__','constructor','toString','invalid'])assert.equal(A.normalize({eyeStyle:id}).eyeStyle,'auto');
  for(const artStyle of Object.keys(A.ART_STYLES))assert.ok(A.EYE_PRESETS[A.eyeConfig('neutral',{artStyle}).baseId]);
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
  assert.equal(fixed.baseId,'anime');assert.equal(fixed.emotion,null);
  assert.equal(A.eyeConfig('neutral',{eyeStyle:'sleepy'}).tempo,1.7);
});
