const test = require("node:test");
const assert = require("node:assert/strict");
const { TaskCenter } = require("../shared/task-center.cjs");
const { buildSnapshot } = require("../shared/status.cjs");
const base = Date.parse("2026-09-08T00:00:00Z");
const task = (id, status, turnId = "one") => ({ source: "codex", id, title: id, status, turnId, eventAt: new Date(base + 100).toISOString() });
function setup() {
  const center = new TaskCenter({ now: () => base });
  const events = [];
  center.on("lifecycle", batch => events.push(...batch));
  const update = (tasks, sources = { codex: "connected" }) => center.update(buildSnapshot(tasks, { sources }));
  return { center, events, update };
}
test("cold join, new starts, per-turn completions are independent of the primary", () => {
  const { center, events, update } = setup();
  update([task("a", "running")]);
  assert.deepEqual(events.map(e => e.kind), ["joined"]);
  update([task("a", "running"), task("b", "running")]);
  update([task("a", "completed"), task("b", "running")]);
  assert.deepEqual(events.map(e => e.kind), ["joined", "started", "completed"]);
  assert.equal(center.view().indicator.status, "running");
  assert.equal(center.view().indicator.count, 1);
  update([task("a", "completed"), task("b", "completed")]);
  assert.equal(center.view().indicator.status, "idle");
  assert.equal(center.view().indicator.count, 0);
  assert.equal(center.view().unreadCount, 2);
  update([task("a", "running", "two")]);
  assert.equal(events.at(-1).kind, "started");
});
test("timestamp churn, disappearance, reconnection and reordering do not replay events", () => {
  const { events, update } = setup();
  const a = task("a", "running");
  update([a]);
  update([{ ...a, eventAt: new Date(base + 500).toISOString() }]);
  update([], { codex: "offline" });
  update([a]);
  assert.equal(events.length, 1);
  update([task("a", "completed")]);
  update([task("a", "completed")]);
  assert.equal(events.length, 2);
});
test("stale cache is silent; first fresh snapshot joins once, history stays silent", () => {
  const { events, update } = setup();
  update([{ ...task("a", "running"), stale: true }], { codex: "offline" });
  assert.equal(events.length, 0);
  update([task("a", "running"), { ...task("old", "completed"), eventAt: new Date(base - 10000).toISOString() }]);
  assert.deepEqual(events.map(e => e.kind), ["joined"]);
});

test("acknowledged and snoozed attention remain silent on restart", () => {
  for (const action of ["ack", "snooze"]) {
    const first = setup();
    first.update([task("a", "needs_attention")]);
    first.center.action(first.center.view().primaryKey, action);
    const second = setup();
    second.center.saved = first.center.saved;
    second.update([task("a", "needs_attention")]);
    assert.equal(second.events.length, 0, action);
  }
});

test("same task and turn identifiers in different sources remain distinct", () => {
  const { events, update } = setup();
  update([task("a", "running"), { ...task("a", "running"), source: "workbench" }], { codex: "connected", workbench: "connected" });
  assert.equal(events.length, 2);
  assert.notEqual(events[0].id, events[1].id);
});
