const STATUS_ORDER = ["needs_attention", "failed", "running", "queued", "paused", "unknown", "completed", "stopped", "idle", "offline"];

function normalizeStatus(value) {
  const raw = String(value || "").toLowerCase();
  if (["running", "active", "in_progress", "inprogress", "planning", "integrating"].includes(raw)) return "running";
  if (["queued", "pending", "ready", "retry_wait"].includes(raw)) return "queued";
  if (["paused", "pause_requested"].includes(raw)) return "paused";
  if (["completed", "complete", "done", "success", "succeeded"].includes(raw)) return "completed";
  if (["needs_attention", "needs-attention", "action_required", "awaiting_input", "waiting_for_user"].includes(raw)) return "needs_attention";
  if (["stopped", "canceled", "cancelled", "interrupted"].includes(raw)) return "stopped";
  if (["failed", "error", "blocked", "systemerror"].includes(raw)) return "failed";
  if (raw === "idle") return "idle";
  if (["notloaded", "unknown"].includes(raw)) return "unknown";
  return "offline";
}

function statusPriority(status) {
  const index = STATUS_ORDER.indexOf(status);
  return index < 0 ? STATUS_ORDER.length : index;
}

function aggregateStatus(tasks) {
  if (!tasks.length) return "offline";
  return tasks.reduce((current, task) => statusPriority(task.status) < statusPriority(current) ? task.status : current, "offline");
}

function summarize(tasks) {
  return tasks.reduce((summary, task) => {
    summary.total += 1;
    summary[task.status] = (summary[task.status] || 0) + 1;
    return summary;
  }, { total: 0, running: 0, queued: 0, paused: 0, completed: 0, failed: 0, needs_attention: 0, offline: 0 });
}

function groupByProject(tasks) {
  const groups = new Map();
  for (const task of tasks) {
    const key = task.projectId || `${task.source}:standalone`;
    const group = groups.get(key) || { id: key, name: task.projectName || "未命名项目", source: task.source, tasks: [] };
    group.tasks.push(task);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({ ...group, status: aggregateStatus(group.tasks), summary: summarize(group.tasks) }));
}

function buildSnapshot(tasks, meta = {}) {
  const cleanTasks = tasks.map((task) => ({
    id: String(task.id),
    source: task.source === "codex" ? "codex" : "workbench",
    projectId: task.projectId || null,
    projectName: task.projectName || "未命名项目",
    title: task.title || "未命名任务",
    status: normalizeStatus(task.status),
    updatedAt: task.updatedAt || new Date().toISOString(),
    deepLink: task.deepLink || null,
    detail: task.detail || "",
    turnId: task.turnId || "", eventAt: task.eventAt || null, observedAt: task.observedAt || null,
    quiet: Boolean(task.quiet), lastActivityAt: task.lastActivityAt || null, lastKnownStatus: task.lastKnownStatus || null,
    waitReason: task.waitReason || null, evidence: task.evidence || null, stale: Boolean(task.stale), trackedActive: task.status === "unknown" && task.trackedActive === true
  }));
  return {
    schemaVersion: 1,
    updatedAt: meta.updatedAt || new Date().toISOString(),
    tasks: cleanTasks,
    summary: summarize(cleanTasks),
    projects: groupByProject(cleanTasks),
    sources: meta.sources || {},
    sourceHealth: meta.sourceHealth || {},
    stale: Boolean(meta.stale),
    staleSince: meta.staleSince || null
  };
}

module.exports = { normalizeStatus, aggregateStatus, summarize, groupByProject, buildSnapshot };
