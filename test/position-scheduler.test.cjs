const test = require("node:test");
const assert = require("node:assert/strict");
const { createPositionScheduler } = require("../shared/position-scheduler.cjs");

function fakeClock() {
  let time = 0;
  const timers = [];

  return {
    now: () => time,
    setTimer(fn, delay) {
      const timer = { fn, at: time + delay, cancelled: false };
      timers.push(timer);
      return timer;
    },
    clearTimer(timer) {
      timer.cancelled = true;
    },
    runNext() {
      const timer = timers
        .filter((candidate) => !candidate.cancelled)
        .sort((left, right) => left.at - right.at)[0];
      assert.ok(timer, "expected a scheduled timer");
      timer.cancelled = true;
      time = timer.at;
      timer.fn();
    },
    pendingCount: () => timers.filter((timer) => !timer.cancelled).length
  };
}

test("position scheduler applies only the latest value once per interval", () => {
  const clock = fakeClock();
  const applied = [];
  const scheduler = createPositionScheduler({
    apply: (value) => applied.push({ value, at: clock.now() }),
    interval: 16,
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer
  });

  scheduler.schedule({ x: 1, y: 1 });
  scheduler.schedule({ x: 2, y: 2 });
  assert.equal(clock.pendingCount(), 1);

  clock.runNext();
  assert.deepEqual(applied, [{ value: { x: 2, y: 2 }, at: 0 }]);

  scheduler.schedule({ x: 3, y: 3 });
  scheduler.schedule({ x: 4, y: 4 });
  clock.runNext();
  assert.deepEqual(applied[1], { value: { x: 4, y: 4 }, at: 16 });
});

test("flush cancels stale work and applies the final position immediately", () => {
  const clock = fakeClock();
  const applied = [];
  const scheduler = createPositionScheduler({
    apply: (value) => applied.push(value),
    interval: 16,
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer
  });

  scheduler.schedule({ x: 10, y: 20 });
  scheduler.flush({ x: 30, y: 40 });

  assert.deepEqual(applied, [{ x: 30, y: 40 }]);
  assert.equal(clock.pendingCount(), 0);
  assert.equal(scheduler.isPending(), false);
});

test("cancel drops a queued position", () => {
  const clock = fakeClock();
  const applied = [];
  const scheduler = createPositionScheduler({
    apply: (value) => applied.push(value),
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer
  });

  scheduler.schedule({ x: 1, y: 2 });
  scheduler.cancel();

  assert.equal(clock.pendingCount(), 0);
  assert.equal(scheduler.isPending(), false);
  assert.deepEqual(applied, []);
});
