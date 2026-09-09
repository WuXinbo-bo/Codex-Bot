import { RolloutReader } from "../bridge/codex-rollout.cjs";
import { normalizeStatus } from "../shared/status.cjs";
const pathKey = (file) => String(file).replace(/^\\\\\?\\/, "").replace(/\\/g, "/").toLowerCase();
export class NativeCodex {
  constructor(call, config, changed) {
    this.call = call;
    this.config = config;
    this.changed = changed;
    this.readers = new Map();
    this.catalog = new Map();
    this.paths = new Set();
    this.runtime = new Map();
    this.nextCursor = null;
    this.pageCursor = undefined;
    this.database = true;
    this.watching = false;
    this.watchError = null;
    this.history = new Map();
    this.coverage = {};
    this.repairAt = Date.now() + 300000;
  }
  rpc(method, params) {
    return this.call("rpc", { method, params });
  }
  notification(message) {
    const p = message.params || {};
    if (!p.threadId) return;
    if (message.method === "thread/status/changed") {
      if (p.status?.type === "notLoaded") this.runtime.delete(p.threadId);
      else
        this.runtime.set(p.threadId, {
          ...this.runtimeState(p.status),
          observedAt: new Date().toISOString(),
        });
    } else if (["turn/started", "turn/completed"].includes(message.method)) {
      this.runtime.set(p.threadId, {
        status: normalizeStatus(p.turn?.status),
        turnId: p.turn?.id,
        eventAt: new Date().toISOString(),
        observedAt: new Date().toISOString(),
      });
    } else return;
    this.changed();
  }
  runtimeState(state = {}) {
    const flags = state.activeFlags || [];
    return flags.includes("waitingOnApproval")
      ? { status: "needs_attention", waitReason: "approval" }
      : flags.includes("waitingOnUserInput")
        ? { status: "needs_attention", waitReason: "input" }
        : { status: normalizeStatus(state.type), waitReason: null };
  }
  async read(file) {
    file = pathKey(file);
    const delta = await this.call("log", { file, reset: !this.readers.has(file) });
    let reader = this.readers.get(file);
    if (!reader || delta.reset) {
      reader = new RolloutReader();
      this.readers.set(file, reader);
    }
    for (const entry of delta.entries) reader.consume(entry);
    const now = Date.now();
    // Windows can keep mtime unchanged while the writer's handle is open.
    // Only actual file-size growth (not unread backlog) is a live observation.
    if (delta.appended) reader.growthAt = now;
    for (const at of [delta.latestEventAt, ...delta.entries.map(e => e.timestamp)]) {
      const time = Date.parse(at);
      if (Number.isFinite(time) && time > 0 && time <= now + 5000)
        reader.growthAt = Math.max(reader.growthAt, Math.min(time, now));
    }
    const quiet = reader.status === "running" && Date.now() - reader.growthAt > 120000;
    const status =
      delta.pending ||
      (quiet && reader.observedRunningTurn !== reader.turnId)
        ? "unknown"
        : reader.status || "unknown";
    if (status === "running") reader.observedRunningTurn = reader.turnId;
    if (delta.pending) this.changed();
    return {
      metadata: delta.metadata,
      modified: delta.modified,
      pending: delta.pending,
      quiet: quiet && !delta.pending,
      lastActivityAt: reader.growthAt ? new Date(reader.growthAt).toISOString() : null,
      lastKnownStatus: reader.status,
      status,
      trackedActive:
        status === "unknown" &&
        reader.status === "running" &&
        reader.observedRunningTurn === reader.turnId,
      turnId: reader.turnId,
      eventAt: reader.eventAt,
      waitReason: reader.waitReason,
      evidence: "rollout",
      observedAt: new Date().toISOString(),
    };
  }
  async snapshot() {
    if (!this.watching) {
      try {
        this.watching = await this.call("watch");
        this.watchError = null;
      } catch (e) {
        this.watchError = String(e);
      }
    }
    const limit = Math.min(500, Math.max(1, Number(this.config.limit || 100)));
    const params = {
      cursor: null,
      limit,
      sortKey: "updated_at",
      sortDirection: "desc",
      archived: Boolean(this.config.includeArchived),
      sourceKinds: ["cli", "vscode", "appServer"],
    };
    const repair = Date.now() >= this.repairAt;
    if (this.database && !repair) params.useStateDbOnly = true;
    let result;
    try {
      result = await this.rpc("thread/list", params);
    } catch (error) {
      if (
        !this.database ||
        !/-32602|useStateDbOnly|unknown field|invalid param/i.test(
          String(error),
        )
      ) {
        this.runtime.clear();
        throw error;
      }
      this.database = false;
      delete params.useStateDbOnly;
      result = await this.rpc("thread/list", params);
    }
    if (repair) this.repairAt = Date.now() + 300000;
    this.nextCursor =
      this.pageCursor === undefined ? result.nextCursor : this.pageCursor;
    const threads = new Map();
    const alternatives = new Map();
    for (const raw of result.data || []) {
      const id = String(raw.id);
      const t = { ...raw, path: raw.path ? pathKey(raw.path) : null };
      if (!alternatives.has(id)) alternatives.set(id, new Set());
      if (t.path) alternatives.get(id).add(t.path);
      threads.set(id, t);
      const previous = this.catalog.get(id);
      if (previous?.path) alternatives.get(id).add(previous.path);
    }
    for (const [id, t] of this.history)
      if (!threads.has(id)) threads.set(id, t);
    for (const [id, t] of this.catalog)
      if (
        !threads.has(id) &&
        ["running", "needs_attention", "paused", "queued"].includes(
          this.readers.get(t.path)?.status,
        )
      )
        threads.set(id, t);
    const changed = [...new Set([...this.paths].map(pathKey))];
    this.paths.clear();
    const loaded = new Map();
    for (const file of changed) {
      try {
        const activity = await this.read(file);
        loaded.set(file, activity);
        const id = activity.metadata?.id;
        if (id) {
          if (!alternatives.has(String(id))) alternatives.set(String(id), new Set());
          alternatives.get(String(id)).add(file);
        }
        if (id && !threads.has(String(id)))
          threads.set(String(id), {
            ...threads.get(String(id)),
            ...this.catalog.get(String(id)),
            id,
            cwd: activity.metadata.cwd,
            path: file,
            updatedAt: Date.now(),
          });
      } catch {
        /* Watch events can arrive before the first complete line. Polling retries. */
      }
    }
    // Database rows and filesystem notifications may name different rollouts
    // for the same task. Resolve by actual modification time, not list order.
    for (const [id, files] of alternatives) {
      if (files.size < 2) continue;
      let newest = null;
      for (const file of files) {
        try {
          const activity = loaded.get(file) || await this.read(file);
          loaded.set(file, activity);
          if (!newest || activity.modified > newest.modified) newest = { file, modified: activity.modified };
        } catch { /* A moved rollout can disappear between discovery and read. */ }
      }
      if (newest && threads.has(id)) threads.get(id).path = newest.file;
    }
    this.catalog = threads;
    const tasks = [];
    let index = 0;
    let background = 5;
    let pending = 0;
    let unknown = 0;
    for (const thread of threads.values()) {
      let activity = this.runtimeState(thread.status);
      if (
        thread.path &&
        (index < Number(this.config.hydrateLimit ?? 25) ||
          this.readers.has(thread.path) ||
          loaded.has(thread.path) ||
          this.history.has(String(thread.id)) ||
          background-- > 0)
      ) {
        try {
          activity = loaded.get(thread.path) || (await this.read(thread.path));
        } catch {
          activity = { status: "unknown", evidence: "unavailable-log" };
        }
      }
      const live = this.runtime.get(String(thread.id));
      if (live && Date.now() - Date.parse(live.observedAt) < 120000)
        activity = { ...activity, ...live, quiet: false };
      else if (!activity.evidence && thread.status?.type && thread.status.type !== "notLoaded")
        activity = { ...activity, ...this.runtimeState(thread.status) };
      if (activity.pending) pending++;
      if (activity.status === "unknown") unknown++;
      const cwd = String(thread.cwd || thread.gitInfo?.cwd || "");
      const numeric = Number(thread.updatedAt);
      const updatedAt =
        Number.isFinite(numeric) && numeric > 0
          ? new Date(numeric < 1e10 ? numeric * 1000 : numeric).toISOString()
          : thread.updatedAt;
      const { metadata, ...state } = activity;
      tasks.push({
        id: String(thread.id),
        source: "codex",
        projectId: cwd || "codex:unknown",
        projectName: cwd.split(/[\\/]/).filter(Boolean).at(-1) || "Codex",
        title: String(thread.name || thread.preview || "Codex task"),
        updatedAt,
        ...state,
        detail: cwd,
      });
      index++;
    }
    const paths = new Set([...threads.values()].map((t) => t.path));
    for (const file of this.readers.keys())
      if (!paths.has(file)) this.readers.delete(file);
    this.coverage = { pending, unknown, checked: threads.size, hasMore: Boolean(this.nextCursor) };
    return tasks;
  }
  async loadMore() {
    if (!this.nextCursor) return false;
    const result = await this.rpc("thread/list", {
      cursor: this.nextCursor,
      limit: 100,
      sortKey: "updated_at",
      sortDirection: "desc",
      archived: Boolean(this.config.includeArchived),
      sourceKinds: ["cli", "vscode", "appServer"],
      ...(this.database ? { useStateDbOnly: true } : {}),
    });
    for (const t of result.data || []) this.history.set(String(t.id), { ...t, path: t.path ? pathKey(t.path) : null });
    this.pageCursor = result.nextCursor;
    this.nextCursor = result.nextCursor;
    return true;
  }
}
