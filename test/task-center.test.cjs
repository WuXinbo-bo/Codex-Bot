const test = require("node:test");
const assert = require("node:assert/strict");
const { TaskCenter } = require("../shared/task-center.cjs");
const { taskTarget } = require("../shared/task-target.cjs");
const { buildSnapshot } = require("../shared/status.cjs");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const base = Date.parse("2026-09-08T00:00:00Z");
test('reruns emit continuation once, including after acknowledgement and restart',()=>{
  const first=new TaskCenter({now:()=>base}),events=[];first.on('lifecycle',batch=>events.push(...batch));
  update(first,[task('running')]);update(first,[task('completed')]);first.action(first.view().tasks[0].key,'ack');
  const next=new TaskCenter({now:()=>base});next.saved=structuredClone(first.saved);next.on('lifecycle',batch=>events.push(...batch));
  update(next,[task('running',{turnId:'turn2'})]);update(next,[task('running',{turnId:'turn2'})]);
  assert.equal(events.filter(e=>e.turnId==='turn2').length,1);assert.equal(events.at(-1).kind,'resumed');
  update(next,[task('unknown',{turnId:'turn2'})]);update(next,[task('running',{turnId:'turn2'})]);
  assert.equal(events.filter(e=>e.turnId==='turn2').length,1);
  update(next,[task('completed',{turnId:'turn1',eventAt:new Date(base+500).toISOString()})]);
  assert.equal(next.view().tasks[0].task.turnId,'turn2');assert.equal(next.view().tasks[0].task.status,'running');
  update(next,[task('completed',{turnId:'turn2'})]);assert.equal(events.at(-1).kind,'completed');
});

test('reopening the same turn emits fresh completion without replaying poll updates',()=>{
  const center=new TaskCenter({now:()=>base}),events=[];center.on('lifecycle',batch=>events.push(...batch));
  for(const status of ['running','completed','running','running','completed','completed'])update(center,[task(status)]);
  assert.equal(events.filter(e=>e.kind==='completed').length,2);
  assert.equal(events.filter(e=>e.kind==='resumed').length,1);
  assert.equal(new Set(events.map(e=>e.id)).size,events.length);
  const restored=new TaskCenter({now:()=>base});restored.saved=structuredClone(center.saved);
  const resumed=[];restored.on('lifecycle',batch=>resumed.push(...batch));update(restored,[task('running')]);
  assert.equal(resumed.at(-1).kind,'resumed');
});
test('each genuine pause or attention recovery emits resumed, not repeated starts',()=>{
  const center=new TaskCenter({now:()=>base}),events=[];center.on('lifecycle',batch=>events.push(...batch));
  for(const status of ['running','paused','running','running','needs_attention','running','paused','running'])update(center,[task(status)]);
  assert.equal(events.filter(e=>e.kind==='resumed').length,3);
  assert.equal(events.filter(e=>e.kind==='paused').length,2);
  assert.equal(new Set(events.map(e=>e.id)).size,events.length);
});
test('inconclusive evidence retains the unanswered attention reminder until recovery',()=>{
  const center=new TaskCenter({now:()=>base});update(center,[task('needs_attention')]);
  const view=update(center,[task('unknown')]);
  assert.equal(view.tasks[0].unread,true);assert.equal(view.tasks[0].reminderStatus,'needs_attention');
  assert.equal(update(center,[task('running')]).tasks[0].unread,false);
});
test("quiet evidence restores the same known turn without duplicate lifecycle reminders", () => {
  const center = new TaskCenter({ now: () => base });
  const events = [];
  center.on('lifecycle', batch => events.push(...batch));
  update(center, [task('running')]);
  const initial = events.length;
  const view = update(center, [task('unknown', { quiet:true, lastKnownStatus:'running', lastActivityAt:new Date(base-180000).toISOString() })]);
  assert.equal(view.tasks[0].task.status, 'running');
  assert.equal(view.tasks[0].task.quiet, true);
  assert.equal(events.length, initial);
  assert.equal(view.activeCount, 1);
  const done = update(center, [task('completed')]);
  assert.equal(done.activeCount, 0);
  assert.equal(done.unreadCount, 1);
});

test("only previously active uncertain turns stay in the active view", () => {
  const center = new TaskCenter({ now: () => base });
  update(center, [task("running")]);
  let view = update(center, [task("unknown"), task("unknown", { id: "history", turnId: "old" })]);
  assert.equal(view.activeCount, 1);
  assert.equal(view.tasks.find(e => e.task.id === "a").active, true);
  assert.equal(view.tasks.find(e => e.task.id === "history").active, false);
  assert.equal(view.indicator.status, "unknown");
  assert.equal(view.unreadCount, 0);
  view = update(center, [task("completed")]);
  assert.equal(view.activeCount, 0); assert.equal(view.unreadCount, 1);
  view = update(center, [task("unknown", { turnId: "new" })]);
  assert.equal(view.activeCount, 0);
});

test("tracked uncertain state survives snapshot serialization and restart", () => {
  const first = new TaskCenter({ now: () => base });
  update(first, [task("running")]);
  update(first, [task("unknown")]);
  const snapshot = JSON.parse(JSON.stringify(first.snapshot));
  const resumed = new TaskCenter({ now: () => base + 5000 });
  resumed.update(buildSnapshot(snapshot.tasks, { sources: snapshot.sources }));
  assert.equal(resumed.view().activeCount, 1);
  assert.equal(resumed.view().indicator.status, "unknown");
});

test("an active task drives the ball ahead of an unread terminal reminder", () => {
  const center = new TaskCenter({ now: () => base });
  const view = update(center, [task("completed"), task("running", { id: "live", turnId: "live-turn" })]);
  assert.equal(view.unreadCount, 1);
  assert.equal(view.activeCount, 1);
  assert.equal(JSON.parse(view.primaryKey)[1], "live");
  assert.equal(view.indicator.status, "running");
});
function task(status, extra = {}) { return { source: "codex", id: "a", status, title: "Task A", turnId: "turn1", eventAt: new Date(base + 100).toISOString(), ...extra }; }
function update(center, tasks, sources = { codex: "connected" }) { center.update(buildSnapshot(tasks, { sources })); return center.view(); }

test("short completed turns notify without requiring an observed running snapshot", () => {
  const center = new TaskCenter({ now: () => base });
  const view = update(center, [task("completed")]);
  assert.equal(view.unreadCount, 1);
  assert.equal(view.indicator.status, "idle");
  assert.equal(view.indicator.count, 0);
  center.action(view.primaryKey, "ack");
  assert.equal(update(center, [task("completed")]).unreadCount, 0);
  assert.equal(update(center, [task("completed", { turnId: "turn2" })]).unreadCount, 1);
});
test("old terminal records remain in history without startup alerts", () => {
  const center = new TaskCenter({ now: () => base });
  const view = update(center, [task("stopped", { eventAt: new Date(base - 1000).toISOString() })]);
  assert.equal(view.tasks.length, 1); assert.equal(view.unreadCount, 0); assert.equal(view.indicator.status, "idle");
});
test("source-scoped identity prevents Codex and workbench task collisions", () => {
  const center = new TaskCenter({ now: () => base });
  const view = update(center, [task("running"), task("running", { source: "workbench" })], { codex: "connected", workbench: "connected" });
  assert.equal(view.tasks.length, 2); assert.equal(view.activeCount, 2);
});
test("cached-to-fresh attention triggers once; routine starts never pop a panel", () => {
  const center = new TaskCenter({ now: () => base }); const notifications = [];
  center.on("update", (_view, notify) => notifications.push(notify));
  update(center, [task("running")]);
  update(center, [task("needs_attention", { stale: true })], { codex: "offline" });
  assert.equal(center.view().unreadCount, 0);
  update(center, [task("needs_attention")]);
  update(center, [task("needs_attention")]);
  assert.deepEqual(notifications, [false, false, true, false]);
});
test("snooze yields to other work, survives refresh, and expires after five minutes", () => {
  let now = base; const center = new TaskCenter({ now: () => now });
  let view = update(center, [task("needs_attention"), task("running", { id: "b" })]);
  center.action(view.primaryKey, "snooze");
  view = update(center, [task("needs_attention"), task("running", { id: "b" })]);
  assert.equal(JSON.parse(view.primaryKey)[1], "b");
  now += 300001; center.tick();
  assert.equal(center.view().indicator.status, "needs_attention");
});
test("acknowledging attention stops reminders without pretending the task is completed", () => {
  const center = new TaskCenter({ now: () => base });
  const view = update(center, [task("needs_attention")]); center.action(view.primaryKey, "ack");
  assert.equal(center.view().indicator.status, "needs_attention");
  assert.equal(center.view().indicator.quiet, true);
});

test("refresh at snooze expiry notifies even before the timer tick", () => {
  let now = base; const center = new TaskCenter({ now: () => now });
  const view = update(center, [task("needs_attention")]); center.action(view.primaryKey, "snooze");
  const notifications = [];
  center.on("update", (_view, notify) => notifications.push(notify));
  now += 300001; update(center, [task("needs_attention")]); center.tick();
  assert.deepEqual(notifications, [true]);
  assert.equal(center.view().tasks[0].snoozedUntil, 0);
});
test("task target uses desktop Codex protocol and validates identifiers", () => {
  assert.equal(taskTarget(task("running")), "codex://threads/a");
  assert.throws(() => taskTarget(task("running", { id: "a/../../evil" })));
  assert.throws(() => taskTarget(task("running", { source: "workbench" })));
  const url = new URL(taskTarget(task("running", { source: "workbench" }), { workbench: { webUrl: "http://localhost:4338/" } }));
  assert.equal(url.searchParams.get("session"), "a");
  assert.throws(() => taskTarget(task("running", { source: "workbench" }), { workbench: { webUrl: "javascript:alert(1)" } }));
});

test("disabling a source removes its reminders and cannot leave a live indicator", () => {
  const center = new TaskCenter({ now: () => base });
  update(center, [task("needs_attention")]);
  const view = update(center, [], { codex: "disabled" });
  assert.equal(view.unreadCount, 0); assert.equal(view.indicator.status, "offline");
});

test("unread reminders and acknowledgements survive restart", t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "metabot-notices-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "notices.json");
  const first = new TaskCenter({ file, now: () => base });
  update(first, [task("completed")]);
  const resumed = new TaskCenter({ file, now: () => base + 60000 });
  const view = update(resumed, [task("completed")]); assert.equal(view.unreadCount, 1);
  resumed.action(view.primaryKey, "ack");
  const acknowledged = new TaskCenter({ file, now: () => base + 120000 });
  assert.equal(update(acknowledged, [task("completed")]).unreadCount, 0);
});

test("restart restores only the same event's unexpired snooze", t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "metabot-snooze-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "notices.json");
  const first = new TaskCenter({ file, now: () => base });
  const view = update(first, [task("needs_attention")]);
  first.action(view.primaryKey, "snooze");
  const resumed = new TaskCenter({ file, now: () => base + 60000 });
  const notifications = [];
  resumed.on("update", (_view, notify) => notifications.push(notify));
  assert.equal(update(resumed, [task("needs_attention")]).tasks[0].snoozedUntil, base + 300000);
  assert.deepEqual(notifications, [false]);
  const expired = new TaskCenter({ file, now: () => base + 300001 });
  assert.equal(update(expired, [task("needs_attention")]).tasks[0].snoozedUntil, 0);
  assert.equal(update(resumed, [task("needs_attention", { turnId: "turn2" })]).tasks[0].snoozedUntil, 0);
});
