const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { RolloutReader } = require("../bridge/codex-rollout.cjs");
const { CodexAdapter, runtimeState, resolveExecutable } = require("../bridge/codex-adapter.cjs");
const { StatusBridge } = require("../bridge/status-bridge.cjs");
const event = (type, turn = "t1") => JSON.stringify({ timestamp: new Date().toISOString(), type: "event_msg", payload: { type, turn_id: turn } }) + "\n";
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "metabot-reliability-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, "rollout.jsonl");
}
test("incremental logs preserve lifecycle across large output and partial JSON lines", async t => {
  const file = fixture(t); fs.writeFileSync(file, event("task_started"));
  const reader = new RolloutReader(); assert.equal((await reader.read(file)).status, "running");
  fs.appendFileSync(file, (JSON.stringify({ type: "response_item", payload: { type: "reasoning", text: "x".repeat(2000) } }) + "\n").repeat(200));
  const offset = reader.offset;
  assert.equal((await reader.read(file)).status, "running"); assert.ok(reader.offset > offset);
  const completion = event("task_complete"); fs.appendFileSync(file, completion.slice(0, 30));
  assert.equal((await reader.read(file)).status, "running");
  fs.appendFileSync(file, completion.slice(30));
  assert.equal((await reader.read(file)).status, "completed");
  assert.equal((await reader.read(file)).turnId, "t1");
});
test("cold-start tail lookup finds lifecycle beyond the old 256KB window", async t => {
  const file = fixture(t);
  fs.writeFileSync(file, event("task_started") + (JSON.stringify({ type: "response_item", payload: { type: "reasoning", text: "x".repeat(2000) } }) + "\n").repeat(500));
  const reader = new RolloutReader(); assert.equal((await reader.read(file)).status, "running");
  assert.equal(reader.offset, fs.statSync(file).size);
});

test("cold-start tail scanning does not make an old large log look freshly running", async t => {
  const file = fixture(t);
  const entry = JSON.parse(event("task_started")); entry.timestamp = new Date(Date.now() - 180000).toISOString();
  fs.writeFileSync(file, "\n".repeat(300000) + JSON.stringify(entry) + "\n");
  const old = new Date(Date.now() - 180000); fs.utimesSync(file, old, old);
  const reader = new RolloutReader();
  assert.equal((await reader.read(file)).status, "unknown");
});
test("frozen mtime does not hide a fresh start or a later appended turn", async t => {
  const file = fixture(t);
  const old = new Date(Date.now()-14400000);
  fs.writeFileSync(file, event('task_started'));
  fs.utimesSync(file,old,old);
  const reader = new RolloutReader();
  assert.equal((await reader.read(file)).status, 'running');
  fs.appendFileSync(file, event('task_complete') + event('task_started','second'));
  fs.utimesSync(file,old,old);
  const next = await reader.read(file);
  assert.equal(next.status,'running');
  assert.equal(next.turnId,'second');
  assert.ok(Date.parse(next.lastActivityAt) > old.getTime());
});
test("log truncation resets the turn, stale completion cannot finish a newer turn", async t => {
  const file = fixture(t); fs.writeFileSync(file, event("task_started") + event("task_complete"));
  const reader = new RolloutReader(); await reader.read(file);
  fs.writeFileSync(file, event("task_started", "t2"));
  assert.equal((await reader.read(file)).turnId, "t2");
  fs.appendFileSync(file, event("task_complete", "t1"));
  assert.equal((await reader.read(file)).status, "running");
  fs.appendFileSync(file, event("turn_aborted", "t2"));
  assert.equal((await reader.read(file)).status, "stopped");
});
test("explicit user input and approval produce attention rather than running", async t => {
  assert.deepEqual(runtimeState({ type: "active", activeFlags: ["waitingOnApproval"] }), { status: "needs_attention", waitReason: "approval" });
  assert.equal(runtimeState({ type: "active", activeFlags: ["waitingOnUserInput"] }).waitReason, "input");
  assert.equal(runtimeState({ type: "idle" }).status, "idle");
  const file = fixture(t); fs.writeFileSync(file, event("task_started") + JSON.stringify({ type: "response_item", payload: { type: "function_call", name: "request_user_input", call_id: "c1" } }) + "\n");
  const reader = new RolloutReader(); assert.equal((await reader.read(file)).waitReason, "input");
  fs.appendFileSync(file, JSON.stringify({ type: "response_item", payload: { type: "function_call_output", call_id: "c1" } }) + "\n");
  assert.equal((await reader.read(file)).status, "running");
});
test("known running turn stays running while quiet; unobserved old turns remain uncertain", async t => {
  const file = fixture(t); fs.writeFileSync(file, event("task_started"));
  const reader = new RolloutReader(); await reader.read(file);
  const uncertain = await reader.read(file, Date.now() + 180000);
  assert.equal(uncertain.status, "running"); assert.equal(uncertain.quiet, true);
  const cold = new RolloutReader();
  assert.equal((await cold.read(file, Date.now() + 180000)).trackedActive, false);
  fs.appendFileSync(file, event("task_complete"));
  const done = await reader.read(file);
  assert.equal(done.status, "completed"); assert.equal(done.trackedActive, false);
});
test("duplicate thread rows choose fresh log before hydration", async t => {
  const fresh = fixture(t), old = fresh + "-old";
  fs.writeFileSync(fresh, event("task_started", "new")); fs.writeFileSync(old, event("turn_aborted", "old"));
  fs.utimesSync(old, new Date(0), new Date(0));
  const adapter = new CodexAdapter();
  adapter.request = async () => ({ data: [fresh, old].map(file => ({ id: "a", path: file, status: { type: "notLoaded" } })) });
  const tasks = await adapter.snapshot(); assert.equal(tasks.length, 1); assert.equal(tasks[0].status, "running"); assert.equal(tasks[0].turnId, "new");
  adapter.close();
});
test("database query falls back only for incompatible parameters", async () => {
  const adapter = new CodexAdapter(); const calls = [];
  adapter.request = async (_method, params) => { calls.push(params.useStateDbOnly); if (calls.length === 1) { const e = Error("unknown field useStateDbOnly"); e.code = -32602; throw e; } return { data: [] }; };
  await adapter.snapshot(); assert.deepEqual(calls, [true, undefined]); assert.equal(adapter.stateDbOnly, false);
  const failure = new CodexAdapter(); let count = 0; failure.request = async () => { count++; throw Error("request timeout"); };
  await assert.rejects(failure.snapshot()); assert.equal(count, 1);
});
test("runtime notifications retain wait flags and notLoaded clears stale runtime state", () => {
  const adapter = new CodexAdapter();
  adapter.receive(JSON.stringify({ method: "thread/status/changed", params: { threadId: "a", status: { type: "active", activeFlags: ["waitingOnApproval"] } } }));
  assert.equal(adapter.runtime.get("a").waitReason, "approval");
  adapter.receive(JSON.stringify({ method: "thread/status/changed", params: { threadId: "a", status: { type: "notLoaded" } } }));
  assert.equal(adapter.runtime.has("a"), false); adapter.close();
});

test("fresh runtime progress clears an older log's waiting reason", async t => {
  const file = fixture(t);
  fs.writeFileSync(file, event("task_started") + event("approval_requested"));
  const adapter = new CodexAdapter();
  const thread = { id: "a", path: file, status: { type: "notLoaded" } };
  assert.equal((await adapter.hydrate(thread)).activity.waitReason, "approval");
  adapter.receive(JSON.stringify({ method: "thread/status/changed", params: { threadId: "a", status: { type: "active", activeFlags: [] } } }));
  const active = await adapter.hydrate(thread);
  assert.equal(active.activity.status, "running"); assert.equal(active.activity.waitReason, null);
  adapter.receive(JSON.stringify({ method: "turn/completed", params: { threadId: "a", turn: { id: "t1", status: "completed" } } }));
  const done = await adapter.hydrate(thread);
  assert.equal(done.activity.status, "completed"); assert.equal(done.activity.waitReason, null);
  adapter.close();
});
test("explicit executable configuration is preserved", () => assert.equal(resolveExecutable("D:/custom/codex.exe"), "D:/custom/codex.exe"));
test("fast source publishes before slow source and partial disconnect preserves stale tasks", async () => {
  let release; let online = true;
  const slow = new Promise(resolve => release = resolve);
  const bridge = new StatusBridge({ adapters: {
    workbench: { snapshot: () => slow },
    codex: { snapshot: async () => { if (!online) throw Error("lost"); return [{ id: "a", status: "running" }]; } }
  } });
  const events = []; bridge.on("update", s => events.push(s));
  const pending = bridge.refresh(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(events.at(-1).tasks[0].id, "a");
  release([]); await pending; online = false; await bridge.refresh();
  assert.equal(bridge.snapshot.tasks[0].stale, true); assert.equal(bridge.snapshot.sources.codex, "offline");
  assert.equal(bridge.snapshot.sources.workbench, "connected"); bridge.stop();
});
test("disabled sources are not queried and stop suppresses late publication", async () => {
  let release, calls = 0;
  const bridge = new StatusBridge({ workbench: { enabled: false }, adapters: { workbench: { snapshot: async () => { calls++; return []; } }, codex: { snapshot: () => new Promise(resolve => release = resolve) } } });
  let updates = 0; bridge.on("update", () => updates++); const pending = bridge.refresh(); bridge.stop(); release([]); await pending;
  assert.equal(calls, 0); assert.equal(updates, 0);
});

test("file watcher discovers a short task outside the current list page", async t => {
  const file = fixture(t), dir = path.dirname(file), sessions = path.join(dir, "sessions"); fs.mkdirSync(sessions);
  const adapter = new CodexAdapter({ codexHome: dir });
  adapter.request = async () => ({ data: [] }); adapter.startMonitoring();
  t.after(() => adapter.close());
  const changed = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error("watcher did not publish")), 3000);
    adapter.once("change", () => { clearTimeout(timer); resolve(); });
  });
  const at = performance.now();
  fs.writeFileSync(path.join(sessions, "short.jsonl"), JSON.stringify({ type: "session_meta", payload: { id: "short", cwd: dir } }) + "\n" + event("task_started") + event("task_complete"));
  await changed;
  const tasks = await adapter.snapshot();
  assert.equal(tasks[0].id, "short"); assert.equal(tasks[0].status, "completed");
  t.diagnostic(`watch-to-snapshot ${Math.round(performance.now() - at)}ms`);
  adapter.close();
});

test("loading older pages retains unique threads and advances the cursor", async () => {
  const adapter = new CodexAdapter({ hydrateNotLoaded: false });
  adapter.request = async (_method, params) => params.cursor ? { data: [{ id: "old", status: { type: "idle" } }], nextCursor: null } : { data: [{ id: "new", status: { type: "active" } }], nextCursor: "page2" };
  await adapter.snapshot(); assert.equal(adapter.diagnostics().hasMore, true);
  await adapter.loadMore(); const tasks = await adapter.snapshot();
  assert.deepEqual(tasks.map(t => t.id), ["new", "old"]); assert.equal(adapter.diagnostics().hasMore, false);
  adapter.close();
});

test("attention outside the recent page stays tracked through completion", async t => {
  const file = fixture(t);
  fs.writeFileSync(file, event("task_started") + JSON.stringify({ type: "response_item", payload: { type: "function_call", name: "request_user_input", call_id: "c1" } }) + "\n");
  const adapter = new CodexAdapter();
  let data = [{ id: "waiting", path: file, status: { type: "notLoaded" } }];
  adapter.request = async () => ({ data });
  assert.equal((await adapter.snapshot())[0].status, "needs_attention");
  data = [];
  assert.equal((await adapter.snapshot())[0].status, "needs_attention");
  fs.appendFileSync(file, event("task_complete"));
  assert.equal((await adapter.snapshot())[0].status, "completed");
  adapter.close();
});

test("explicitly loaded history is hydrated beyond the first-page hydration limit", async t => {
  const file = fixture(t); fs.writeFileSync(file, event("task_complete"));
  const adapter = new CodexAdapter({ hydrateLimit: 0 });
  adapter.request = async (_method, params) => params.cursor ? { data: [{ id: "old", path: file, status: { type: "notLoaded" } }], nextCursor: null } : { data: [], nextCursor: "page2" };
  await adapter.snapshot(); await adapter.loadMore();
  assert.equal((await adapter.snapshot())[0].status, "completed");
  adapter.close();
});
