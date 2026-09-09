const test = require("node:test");
const assert = require("node:assert/strict");
const Rig = require("../src/m1-rig.js");

test("M1 catalog exposes 24 semantic mouthless core expressions", () => {
  assert.equal(Rig.CORE_EXPRESSION_NAMES.length, 24);
  assert.equal(new Set(Rig.CORE_EXPRESSION_NAMES).size, 24);
  assert.ok(Rig.CORE_EXPRESSION_NAMES.includes("neutral"));
  assert.ok(Rig.CORE_EXPRESSION_NAMES.includes("deep_focus"));
  assert.ok(Rig.CORE_EXPRESSION_NAMES.includes("complete"));
  for (const name of Rig.CORE_EXPRESSION_NAMES) {
    const serialized = JSON.stringify(Rig.getExpression(name));
    assert.equal(serialized.includes("mouth"), false, name);
  }
});

test("M1 palette and body geometry enforce the product silhouette", () => {
  assert.equal(Rig.COLORS.body, "#02AD45");
  assert.equal(Rig.COLORS.eyes, "#F3F6F2");
  const path = Rig.bodyPath(Rig.getExpression("neutral").body);
  assert.match(path, /^M /);
  assert.match(path, / C /);
  assert.equal(path.includes("stroke"), false);
});

test("M1 interpolation preserves numeric geometry and switches semantic poses", () => {
  const neutral = Rig.getExpression("neutral");
  const tense = Rig.getExpression("tense");
  const middle = Rig.interpolate(neutral, tense, 0.5);
  assert.equal(middle.body.curve, (neutral.body.curve + tense.body.curve) / 2);
  assert.equal(Rig.interpolate("none", "brace", 0.25), "none");
  assert.equal(Rig.interpolate("none", "brace", 0.75), "brace");
});

test("M1 eye paths remain finite for every core and interaction pose", () => {
  for (const [name, pose] of Object.entries(Rig.EXPRESSIONS)) {
    for (const side of ["left", "right"]) {
      const path = Rig.eyePath(pose.eyes[side]);
      assert.equal(path.includes("NaN"), false, `${name}:${side}`);
      assert.equal(path.includes("undefined"), false, `${name}:${side}`);
    }
  }
});

test("pupils fit inside round eyes throughout all expression transitions and gaze extremes", () => {
  const poses = Object.values(Rig.EXPRESSIONS);
  for (const from of poses) for (const to of poses) {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const pose = Rig.interpolate(from, to, t);
      for (const side of ["left", "right"]) {
        const e = pose.eyes[side];
        assert.ok(e.ry >= 16 && e.rx >= 16);
        for (const gaze of [{ x: 1, y: 1 }, { x: -1, y: -1 }, pose.gaze]) {
          const p = Rig.constrainPupil(e, pose.pupils[side], gaze);
          for (let angle = 0; angle < 360; angle += 15) {
            const r = angle * Math.PI / 180;
            const x = (p.cx + Math.cos(r) * p.rx - e.cx) / e.rx;
            const y = (p.cy + Math.sin(r) * p.ry - e.cy) / e.ry;
            assert.ok(x * x + y * y < 1, "pupil must retain an eye-white margin");
          }
        }
      }
      assert.ok(Math.abs(pose.body.rx * pose.body.ry / (52 * 52) - 1) < 0.08);
    }
  }
});

test("gestures and effects interpolate continuously rather than switching strings", () => {
  const from = Rig.getExpression("neutral");
  const to = Rig.getExpression("complete");
  const pose = Rig.interpolate(from, to, 0.5);
  assert.equal(pose.arms.right.opacity, 0.5);
  assert.equal(pose.arms.right.y, (from.arms.right.y + to.arms.right.y) / 2);
  assert.equal(pose.effects.complete, 0.5);
});
