const test=require('node:test'),assert=require('node:assert/strict');
const Rig=require('../src/m1-rig.js'),A=require('../src/m1-activities.js'),Props=require('../src/m1-accessories.js');
test('all sixty emotional performances are production reachable and distinct',()=>{
  assert.equal(Object.keys(Rig.EMOTIONS).length,60);
  const reachable=new Set([...Object.values(A.POOLS),...Object.values(A.REACTIONS),...Object.values(A.LIFECYCLE)].flat());
  const poses=new Set();
  for(const id of Object.keys(Rig.EMOTIONS)){assert.ok(reachable.has(id),id);assert.ok(A.CLIPS[id]);poses.add(JSON.stringify(Rig.getExpression(id)));}
  assert.equal(poses.size,60);
});
test('all twenty new prop routines are reachable and end with clean hands',()=>{
  const reachable=new Set([...Object.values(A.POOLS),...Object.values(A.LIFECYCLE)].flat());
  for(const prop of ['notebook','pencil','hourglass','stamp','flag']){
    assert.ok(Rig.ACCESSORIES.includes(prop)&&Props.DEFINITIONS[prop]);
    const clips=Object.entries(A.CLIPS).filter(([id,frames])=>!A.THEATERS[id]&&!A.NARRATIVES[id]&&!id.startsWith('performance_')&&frames.some(f=>f.pose.accessories?.[prop]));
    assert.equal(clips.length,4);
    for(const [id,frames] of clips){assert.ok(reachable.has(id),id);const end=Rig.merge(Rig.getExpression(frames.at(-1).expression),frames.at(-1).pose);assert.ok(Object.values(end.accessories).every(p=>p.opacity===0));}
  }
});
