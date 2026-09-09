const test = require("node:test");
const assert = require("node:assert/strict");
const { pointInsideCircle } = require("../shared/bubble-hit-test.cjs");

test("circle hit test tracks the visual ball in DIP coordinates", () => {
  const ball = { x: 20, y: 30, width: 128, height: 128 };
  assert.equal(pointInsideCircle({ x: 84, y: 94 }, ball), true);
  assert.equal(pointInsideCircle({ x: 20, y: 30 }, ball), false);
  assert.equal(pointInsideCircle({ x: 147, y: 157 }, ball), false);
  assert.equal(pointInsideCircle({ x: NaN, y: 94 }, ball), false);
});
