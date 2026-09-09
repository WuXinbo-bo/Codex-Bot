const test = require("node:test");
const assert = require("node:assert/strict");
const Rig = require("../src/m1-rig.js");
const A = require("../src/m1-activities.js");
const { CLIPS, POOLS, duration } = A;
const { DEFINITIONS } = require("../src/m1-accessories.js");

test("every activity has valid finite geometry, existing assets, and a bounded duration", () => {
  for (const [name, frames] of Object.entries(CLIPS)) {
    assert.ok(frames.length >= 2, name);
    const type=A.Scores.meta[name]?.type;
    const limit=type==='emotion'?10200:name.startsWith('theater_')?15000:6000;
    assert.ok(duration(name) >= 1000 && duration(name) <= limit, name);
    for (const frame of frames) {
      assert.ok(Rig.EXPRESSIONS[frame.expression], name);
      for (const prop of Object.keys(frame.pose.accessories || {})) assert.ok(DEFINITIONS[prop], prop);
      const pose = Rig.merge(Rig.getExpression(frame.expression), frame.pose);
      assert.doesNotMatch(Rig.bodyPath(pose.body), /NaN|undefined/);
      for (const eye of Object.values(pose.eyes)) assert.ok(Object.values(eye.symbols).reduce((a, b) => a + b, 0) <= 1);
    }
  }
});

test("ambient work activities cannot signal completion, errors, or input requests", () => {
  for (const name of POOLS.running) for (const frame of CLIPS[name]) {
    const pose = Rig.merge(Rig.getExpression(frame.expression), frame.pose);
    assert.deepEqual(pose.effects, { complete: 0, input: 0, error: 0 });
  }
});

test('authored special expressions are reachable as paced activities',()=>{
  const reachable=new Set(Object.values(POOLS).flat());
  for(const id of Object.keys(Rig.SPECIALS)){
    assert.ok(reachable.has(id),id);assert.ok(CLIPS[id]);
    assert.ok(duration(id)>=4000&&duration(id)<=6000,id);
  }
});

test('task lifecycle has multiple authored performance variants',()=>{
  assert.equal(A.PERFORMANCES.started.length,13);
  assert.equal(A.PERFORMANCES.completed.length,17);
  assert.equal(A.PERFORMANCES.attention.length,10);
  assert.equal(A.PERFORMANCES.failed.length,9);
  assert.equal(A.PERFORMANCES.running.length,15);
  assert.equal(A.PERFORMANCES.stopped.length,6);
  for(const id of Object.values(A.PERFORMANCES).flat().map(name=>'performance_'+name)){
    assert.ok(A.CLIPS[id],id);assert.ok(A.duration(id)>=3000);assert.ok(A.duration(id)<=6000);
    assert.ok(A.CLIPS[id].slice(0,-1).every(frame=>frame.transition>=400));
    const final=Rig.merge(Rig.getExpression(A.CLIPS[id].at(-1).expression),A.CLIPS[id].at(-1).pose);
    assert.ok(Object.values(final.accessories).every(prop=>prop.opacity===0));
  }
});
