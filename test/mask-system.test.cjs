const test = require("node:test"),
  assert = require("node:assert/strict");
const M = require("../src/mask-system.js"),
  A = require("../src/appearance.js");
test('theater interruption clears immediately while ordinary removal keeps its exit',()=>{
  let t=0;const c=M.createController({now:()=>t,random:()=>0});
  c.preview('shy','classic');t=1800;assert.ok(c.tick().visible);
  c.clear();assert.ok(c.state().current);
  c.clear(true);assert.equal(c.state().current,null);assert.equal(c.tick().visible,false);
});
test("24 masks, six finite bounded timelines and semantic pools", () => {
  assert.equal(M.names.length, 24);
  assert.equal(M.CHAINS.length, 6);
  for (const pool of Object.values(M.POOLS))
    for (const id of pool) assert.ok(M.MASKS[id]);
  for (const chain of M.CHAINS) {
    const phases = new Set();
    for (let t = 0; t <= 5300; t += 25) {
      const s = M.sample(t, chain);
      phases.add(s.phase);
      for (const k of ["x", "y", "scale", "rotate", "cover"])
        assert.ok(Number.isFinite(s[k]));
    }
    assert.equal(phases.size, 8);
  }
});
test("mask lifecycle dedup, priority, settings and random cooldown", () => {
  let t = 0;
  const c = M.createController({ now: () => t, random: () => 0.1 });
  c.configure(A.normalize({}));
  c.status("running");
  assert.ok(M.POOLS.running.includes(c.state().current.id));
  c.lifecycle("failed", ["one"]);
  assert.ok(M.POOLS.failed.includes(c.state().current.id));
  const at = c.state().current.at;
  t = 200;
  c.lifecycle("failed", ["one"]);
  assert.equal(c.state().current.at, at);
  c.interact("click");
  assert.equal(c.state().current.priority, 6);
  t = 6000;
  c.tick();
  assert.equal(c.state().current, null);
  c.configure(A.normalize({ maskAuto: false }));
  t = 100000;
  c.tick();
  assert.equal(c.state().current, null);
  assert.equal(c.preview("bad"), false);
  assert.equal(c.preview("cat", "flip"), true);
  assert.equal(c.state().current.chain, "flip");
  c.configure(A.normalize({ masks: false }));
  assert.equal(c.preview("cat"), false);
  assert.equal(c.tick().visible, false);
});
test("reduced motion and persisted mask options", () => {
  assert.equal(M.sample(400, "flip", true).rotate, 0);
  const a = A.normalize({
    maskAuto: false,
    maskStyle: "paper",
    maskFrequency: "rare",
  });
  assert.equal(a.maskAuto, false);
  assert.equal(a.maskStyle, "paper");
  assert.equal(a.maskFrequency, "rare");
  assert.equal(A.normalize({ maskStyle: "bad" }).maskStyle, "sticker");
});
test('drag pauses playback, lifecycle resumes, random avoids recent masks',()=>{
 let t=0;const c=M.createController({now:()=>t,random:()=>0});c.configure(A.normalize({}));c.status('running');
 t=500;c.interact('drag-start');t=2000;assert.equal(c.tick().visible,false);c.lifecycle('failed',['drag-failure']);c.interact('drag-end');assert.equal(c.tick().phase,'pull_mask');
 t=8000;c.tick();assert.equal(c.state().current.semantic,'failed');
 c.configure(A.normalize({maskAuto:false}));c.preview('happy');t+=100;c.clear();assert.equal(c.tick().phase,'remove_mask');t+=1100;assert.equal(c.tick().visible,false);
 c.configure(A.normalize({}));t+=100000;c.status('idle');const first=c.state().current.id;t+=30000;c.tick();assert.notEqual(c.state().current.id,first);
});
