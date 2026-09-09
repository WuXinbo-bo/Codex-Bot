const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeStatus, buildSnapshot } = require("../shared/status.cjs");

test("normalizes provider statuses", () => {
  assert.equal(normalizeStatus("planning"), "running");
  assert.equal(normalizeStatus("completed"), "completed");
  assert.equal(normalizeStatus("blocked"), "failed");
  assert.equal(normalizeStatus("awaiting_input"), "needs_attention");
  assert.equal(normalizeStatus("inProgress"), "running");
  assert.equal(normalizeStatus("interrupted"), "stopped");
});

test("aggregates workbench and codex projects", () => {
  const snapshot = buildSnapshot([
    { id: "w1", source: "workbench", projectId: "p1", projectName: "工作台", title: "运行中", status: "running" },
    { id: "c1", source: "codex", projectId: "p2", projectName: "Codex", title: "已完成", status: "completed" }
  ]);
  assert.equal(snapshot.summary.running, 1);
  assert.equal(snapshot.summary.completed, 1);
  assert.equal(snapshot.projects.length, 2);
});
