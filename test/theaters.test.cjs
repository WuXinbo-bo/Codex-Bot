const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/m1-activities.js'),Rig=require('../src/m1-rig.js');

test('three acting variants preserve duration, cleanup and immutable source stories',()=>{
  for(const name of Object.keys(A.THEATERS)){
    const source=JSON.stringify(A.CLIPS[name]);
    for(const variant of [0,1,2]){
      const frames=A.theaterFrames(name,variant);
      assert.equal(frames.reduce((sum,f)=>sum+f.duration,0),15000);
      assert.deepEqual(frames.at(-1),A.CLIPS[name].at(-1));
      assert.ok(frames.every(f=>Number.isFinite(Rig.merge(Rig.getExpression(f.expression),f.pose).body.rotate)));
    }
    assert.equal(JSON.stringify(A.CLIPS[name]),source);
    assert.notDeepEqual(A.theaterFrames(name,1),A.theaterFrames(name,2));
  }
});

test('forty-four ambient fifteen-second stories have valid stages and clean exits',()=>{
  assert.equal(Object.keys(A.THEATERS).length,44);
  for(const [id,story] of Object.entries(A.THEATERS)){
    const frames=A.CLIPS[id];
    assert.equal(A.duration(id),15000,id);
    assert.ok(frames.length>=5,id);
    assert.ok(['running','idle','queued','paused','retained'].includes(story.route));
    for(const f of frames){
      assert.ok(Rig.EXPRESSIONS[f.expression],id+': '+f.expression);
      assert.ok(f.duration>0&&f.duration<4000,id);
      const pose=Rig.merge(Rig.getExpression(f.expression),f.pose);
      assert.ok(!pose.effects.complete&&!pose.effects.input&&!pose.effects.error,id);
    }
    const end=Rig.merge(Rig.getExpression(frames.at(-1).expression),frames.at(-1).pose);
    assert.ok(Object.values(end.accessories).every(p=>p.opacity===0),id);
  }
});

test('prop substitutions never mutate original short routines',()=>{
  assert.ok(A.CLIPS.balance.some(f=>f.pose.accessories?.cube));
  assert.ok(A.CLIPS.toss.some(f=>f.pose.accessories?.cube));
  for(const id of ['theater_pen','theater_airplane'])assert.ok(A.CLIPS[id].every(f=>!f.pose.accessories?.cube));
  const masks=A.CLIPS.theater_masks.filter(f=>f.mask);
  assert.equal(masks.length,2);
  assert.equal(A.CLIPS.theater_masks.at(-1).mask,null);
});

test('investigation keeps its lens through intermediate reactions until cleanup',()=>{
  let introduced=false;
  for(const frame of A.CLIPS.theater_investigate.slice(0,-1)){
    const pose=Rig.merge(Rig.getExpression(frame.expression),frame.pose);
    if(pose.accessories.lens.opacity>0)introduced=true;
    if(introduced)assert.ok(pose.accessories.lens.opacity>0);
  }
  assert.ok(introduced);
});
