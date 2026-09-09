const test = require("node:test");
const assert = require("node:assert/strict");
const { CoordinateSystem } = require("../shared/coordinate-system.cjs");

test("getDragThreshold scales with DPI", () => {
  const mockScreen = {
    getPrimaryDisplay: () => ({ scaleFactor: 2.0 })
  };
  const coords = new CoordinateSystem(mockScreen);
  assert.equal(coords.getDragThreshold(6), 12);
});

test("normalizePoint rounds to integers", () => {
  const coords = new CoordinateSystem(null);
  assert.deepEqual(coords.normalizePoint({ x: 10.7, y: 20.3 }), { x: 11, y: 20 });
  assert.equal(coords.normalizePoint({ x: NaN, y: 10 }), null);
});

test("isValidPoint rejects invalid coordinates", () => {
  const coords = new CoordinateSystem(null);
  assert.equal(coords.isValidPoint({ x: 10, y: 20 }), true);
  assert.equal(coords.isValidPoint({ x: NaN, y: 20 }), false);
  // normalizePoint returns null for invalid input, which is falsy
  assert.equal(Boolean(coords.normalizePoint(null)), false);
  assert.equal(Boolean(coords.normalizePoint(undefined)), false);
  assert.equal(Boolean(coords.normalizePoint({})), false);
});
