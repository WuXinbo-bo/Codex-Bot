function createPositionScheduler(options = {}) {
  if (typeof options.apply !== "function") {
    throw new TypeError("Position scheduler requires an apply function");
  }

  const interval = Math.max(0, Number(options.interval) || 16);
  const now = typeof options.now === "function" ? options.now : Date.now;
  const setTimer = options.setTimer || setTimeout;
  const clearTimer = options.clearTimer || clearTimeout;
  let timer = null;
  let latest = null;
  let hasLatest = false;
  let lastAppliedAt = null;

  function arm() {
    if (timer !== null || !hasLatest) return;
    const elapsed = lastAppliedAt === null ? interval : now() - lastAppliedAt;
    const delay = Math.max(0, interval - elapsed);
    timer = setTimer(run, delay);
  }

  function run() {
    timer = null;
    if (!hasLatest) return;

    const value = latest;
    latest = null;
    hasLatest = false;
    lastAppliedAt = now();
    options.apply(value);
    arm();
  }

  function schedule(value) {
    latest = value;
    hasLatest = true;
    arm();
  }

  function flush(value) {
    if (timer !== null) clearTimer(timer);
    timer = null;
    latest = null;
    hasLatest = false;
    lastAppliedAt = now();
    return options.apply(value);
  }

  function cancel() {
    if (timer !== null) clearTimer(timer);
    timer = null;
    latest = null;
    hasLatest = false;
  }

  return {
    schedule,
    flush,
    cancel,
    isPending: () => timer !== null || hasLatest
  };
}

module.exports = { createPositionScheduler };
