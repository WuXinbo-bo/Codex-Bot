const MOTION_LEVELS = new Set(["full", "soft", "reduced"]);

function normalizeMotionPreference(value) {
  return MOTION_LEVELS.has(value) ? value : "full";
}

module.exports = { normalizeMotionPreference };
