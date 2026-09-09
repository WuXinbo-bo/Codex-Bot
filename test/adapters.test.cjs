const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { WorkbenchAdapter } = require("../bridge/workbench-adapter.cjs");
const { StatusBridge } = require("../bridge/status-bridge.cjs");

function task(status = "running", id = "task") {
  return { id, source: "workbench", projectName: "测试", title: "状态任务", status };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}

function fixtureServer() {
  return http.createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.url === "/api/sessions") return response.end(JSON.stringify([{ id: "s1", workspaceId: "w1", title: "正在检查", status: "running", updatedAt: "2026-09-06T00:00:00.000Z", engine: "codex" }]));
    if (request.url === "/api/bootstrap") return response.end(JSON.stringify({ workspaces: [{ id: "w1", name: "演示工作区" }] }));
    response.statusCode = 404; return response.end(JSON.stringify({ error: "not found" }));
  });
}

test("workbench adapter normalizes sessions into companion tasks", async (t) => {
  const server = fixtureServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const port = server.address().port;
  const tasks = await new WorkbenchAdapter({ baseUrl: `http://127.0.0.1:${port}` }).snapshot();
  assert.equal(tasks[0].projectName, "演示工作区");
  assert.equal(tasks[0].status, "running");
});

test("status bridge degrades safely when both sources are unavailable", async () => {
  const bridge = new StatusBridge({ workbench: { baseUrl: "http://127.0.0.1:1" }, codex: { executable: "meta-bot-command-that-does-not-exist" }, intervalMs: 60_000 });
  const snapshot = await bridge.refresh();
  bridge.stop();
  assert.equal(snapshot.tasks.length, 0);
  assert.equal(snapshot.sources.workbench, "offline");
  assert.equal(snapshot.sources.codex, "offline");
});

test("status bridge loads the last successful snapshot as stale cache", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "metabot-cache-"));
  const cacheFile = path.join(dir, "snapshot.json");
  fs.writeFileSync(cacheFile, JSON.stringify({
    schemaVersion: 1,
    updatedAt: "2026-09-06T00:00:00.000Z",
    tasks: [{ id: "cached", source: "workbench", projectId: "p", projectName: "缓存项目", title: "缓存任务", status: "completed" }],
    sources: { workbench: "connected" }
  }), "utf8");
  const bridge = new StatusBridge({ cacheFile, workbench: { baseUrl: "http://127.0.0.1:1" }, codex: { executable: "meta-bot-command-that-does-not-exist" }, intervalMs: 60_000 });
  assert.equal(bridge.snapshot.tasks[0].id, "cached");
  assert.equal(bridge.snapshot.stale, true);
  bridge.stop();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("status bridge keeps cached tasks when every source is temporarily offline", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "metabot-cache-"));
  const cacheFile = path.join(dir, "snapshot.json");
  fs.writeFileSync(cacheFile, JSON.stringify({
    schemaVersion: 1,
    updatedAt: "2026-09-06T00:00:00.000Z",
    tasks: [{ id: "cached", source: "codex", projectId: "p", projectName: "缓存项目", title: "缓存任务", status: "running" }],
    sources: { codex: "connected" }
  }), "utf8");
  const bridge = new StatusBridge({ cacheFile, workbench: { baseUrl: "http://127.0.0.1:1" }, codex: { executable: "meta-bot-command-that-does-not-exist" }, intervalMs: 60_000 });
  const snapshot = await bridge.refresh();
  assert.equal(snapshot.tasks[0].id, "cached");
  assert.equal(snapshot.stale, true);
  bridge.stop();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("status bridge starts both sources concurrently and coalesces refresh requests", async () => {
  const workbench = deferred();
  const codex = deferred();
  const started = [];
  const bridge = new StatusBridge({
    adapters: {
      workbench: { snapshot: () => { started.push("workbench"); return workbench.promise; } },
      codex: { snapshot: () => { started.push("codex"); return codex.promise; } }
    }
  });

  const first = bridge.refresh();
  const second = bridge.refresh();
  assert.equal(first, second);
  assert.deepEqual(started, ["codex", "workbench"]);
  workbench.resolve([task("running", "workbench")]);
  codex.resolve([]);
  await first;
  assert.deepEqual(started, ["codex", "workbench"]);
  bridge.stop();
});

test("status bridge emits complete refresh lifecycle including recovery", async () => {
  let workbenchMode = "online";
  let codexMode = "online";
  const adapter = (source, mode) => ({ snapshot: async () => {
    if (mode() === "offline") throw new Error(`${source} unavailable`);
    return source === "workbench" ? [task("completed", source)] : [];
  } });
  const bridge = new StatusBridge({
    adapters: {
      workbench: adapter("workbench", () => workbenchMode),
      codex: adapter("codex", () => codexMode)
    }
  });
  const states = [];
  const outcomes = [];
  bridge.on("refresh", (detail) => {
    states.push(detail.state);
    if (detail.outcome) outcomes.push(detail.outcome);
  });

  await bridge.refresh();
  codexMode = "offline";
  await bridge.refresh();
  workbenchMode = "offline";
  await bridge.refresh();
  workbenchMode = "online";
  await bridge.refresh();

  assert.deepEqual(states, ["start", "success", "start", "partial", "start", "offline", "start", "recovered"]);
  assert.deepEqual(outcomes, ["success", "partial", "offline", "partial"]);
  bridge.stop();
});

test("status bridge adapts active, idle, and repeated-offline intervals", async () => {
  let status = "running";
  let online = true;
  const bridge = new StatusBridge({
    intervalMs: 2_000,
    idleIntervalMs: 12_000,
    maxOfflineIntervalMs: 8_000,
    adapters: {
      workbench: { snapshot: async () => {
        if (!online) throw new Error("offline");
        return [task(status)];
      } },
      codex: { snapshot: async () => {
        if (!online) throw new Error("offline");
        return [];
      } }
    }
  });

  await bridge.refresh();
  assert.equal(bridge.nextIntervalMs(), 2_000);
  status = "completed";
  await bridge.refresh();
  assert.equal(bridge.nextIntervalMs(), 12_000);
  online = false;
  const delays = [];
  for (let index = 0; index < 4; index += 1) {
    await bridge.refresh();
    delays.push(bridge.nextIntervalMs());
  }
  assert.deepEqual(delays, [2_000, 4_000, 8_000, 8_000]);
  bridge.stop();
});

test("status bridge schedules each source independently after its refresh completes", async () => {
  const pending = deferred();
  const scheduled = [];
  const bridge = new StatusBridge({
    intervalMs: 2_000,
    idleIntervalMs: 4_000,
    adapters: {
      workbench: { snapshot: () => pending.promise },
      codex: { snapshot: async () => [] }
    },
    timers: {
      setTimeout: (callback, delay) => { scheduled.push({ callback, delay }); return scheduled.length; },
      clearTimeout: () => {}
    }
  });

  bridge.start();
  assert.equal(scheduled.length, 0);
  pending.resolve([task("running")]);
  await bridge.requestInFlight;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(scheduled.length, 2);
  assert.deepEqual(scheduled.map(s => s.delay).sort((a,b) => a-b), [2000, 4000]);
  bridge.stop();
});

test("manual refresh waits for a newer pass when a task starts during an in-flight query", async () => {
  const first = deferred();
  let calls = 0;
  const bridge = new StatusBridge({
    workbench: { enabled: false },
    adapters: {
      workbench: { snapshot: async () => [] },
      codex: { snapshot: async () => ++calls === 1 ? first.promise : [{ id: "new", title: "刚进入运行", status: "running" }] }
    }
  });
  const automatic = bridge.refreshSource("codex");
  const manual = bridge.refresh();
  first.resolve([]);
  await Promise.all([automatic, manual]);
  assert.equal(calls, 2);
  assert.equal(bridge.snapshot.tasks[0].id, "new");
  assert.equal(bridge.snapshot.tasks[0].status, "running");
  bridge.stop();
});
