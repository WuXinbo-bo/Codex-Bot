const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeMotionPreference } = require("../shared/motion-preference.cjs");

test("motion preference accepts supported levels and rejects malformed config", () => {
  for (const level of ["full", "soft", "reduced"]) {
    assert.equal(normalizeMotionPreference(level), level);
  }
  for (const value of [undefined, null, "", "FULL", "fast", 1, {}]) {
    assert.equal(normalizeMotionPreference(value), "full");
  }
});
