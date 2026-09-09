const test = require("node:test");
const assert = require("node:assert/strict");
const Rig = require("../src/m1-rig.js");
const { CLIPS, POOLS, duration } = require("../src/m1-activities.js");
const { DEFINITIONS } = require("../src/m1-accessories.js");

test("every activity has valid finite geometry, existing assets, and a bounded duration", () => {
  for (const [name, frames] of Object.entries(CLIPS)) {
    assert.ok(frames.length >= 2, name);
    assert.ok(duration(name) >= 1000 && duration(name) <= (name.startsWith('theater_')?15000:6000), name);
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
