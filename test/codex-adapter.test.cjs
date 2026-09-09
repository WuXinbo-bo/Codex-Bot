const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { CodexAdapter } = require("../bridge/codex-adapter.cjs");
const { RolloutReader } = require("../bridge/codex-rollout.cjs");

test("codex adapter hydrates notLoaded threads and uses the last turn status", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "metabot-snapshot-"));
  const file = path.join(dir, "rollout.jsonl");
  fs.writeFileSync(file, `${JSON.stringify({ timestamp: new Date().toISOString(), type: "event_msg", payload: { type: "task_started" } })}\n`, "utf8");
  const adapter = new CodexAdapter({ limit: 10, hydrateLimit: 10 });
  const calls = [];
  adapter.request = async (method, params) => {
    calls.push([method, params]);
    if (method === "thread/list") return { data: [{ id: "active", name: "活动任务", cwd: "C:\\work", path: file, status: { type: "notLoaded" }, updatedAt: 1788699000 }] };
    throw new Error(`unexpected method ${method}`);
  };
  const tasks = await adapter.snapshot();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].status, "running");
  assert.equal(tasks[0].projectName, "work");
  assert.deepEqual(calls.map(([method]) => method), ["thread/list"]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("codex adapter preserves completed and interrupted turn states", async () => {
  assert.equal(CodexAdapter.turnStatus({ status: { type: "notLoaded" }, turns: [{ status: "completed" }] }), "completed");
  assert.equal(CodexAdapter.turnStatus({ status: { type: "notLoaded" }, turns: [{ status: "interrupted" }] }), "interrupted");
  assert.equal(CodexAdapter.turnStatus({ status: { type: "notLoaded" }, turns: [] }), "notLoaded");
});

test("codex adapter recognizes a fresh cross-process rollout as running", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "metabot-rollout-"));
  const file = path.join(dir, "rollout.jsonl");
  fs.writeFileSync(file, `${JSON.stringify({ timestamp: new Date().toISOString(), type: "event_msg", payload: { type: "task_started" } })}\n${JSON.stringify({ type: "response_item", payload: { type: "reasoning" } })}\n`, "utf8");
  const reader = new RolloutReader();
  assert.equal((await reader.read(file)).status, "running");
  fs.appendFileSync(file, `${JSON.stringify({ type: "response_item", payload: { type: "reasoning" } })}\n`, "utf8");
  assert.equal((await reader.read(file)).status, "running");
  fs.appendFileSync(file, `${JSON.stringify({ type: "event_msg", payload: { type: "task_complete" } })}\n`, "utf8");
  assert.equal((await reader.read(file)).status, "completed");
  fs.rmSync(dir, { recursive: true, force: true });
});
