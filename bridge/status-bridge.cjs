const path = require("node:path");
const fs = require("node:fs");
const { EventEmitter } = require("node:events");
const { WorkbenchAdapter } = require("./workbench-adapter.cjs");
const { CodexAdapter } = require("./codex-adapter.cjs");
const { buildSnapshot } = require("../shared/status.cjs");
const ACTIVE_STATUSES = new Set(["running", "queued", "paused", "needs_attention"]);
const isActiveTask = task => ACTIVE_STATUSES.has(task.status) || (task.status === "unknown" && task.trackedActive === true);
const interval = (v, fallback, min = 500) => Number.isFinite(Number(v)) ? Math.max(min, Number(v)) : fallback;

class StatusBridge extends EventEmitter {
  constructor(config = {}) {
    super();
    this.workbench = config.adapters?.workbench || new WorkbenchAdapter(config.workbench || {});
    this.codex = config.adapters?.codex || new CodexAdapter(config.codex || {});
    this.intervalMs = interval(config.intervalMs, 1500);
    this.idleIntervalMs = interval(config.idleIntervalMs, 2000);
    this.maxOfflineIntervalMs = interval(config.maxOfflineIntervalMs, 30000, this.intervalMs);
    this.cacheFile = config.cacheFile || null;
    this.setTimeout = config.timers?.setTimeout || setTimeout;
    this.clearTimeout = config.timers?.clearTimeout || clearTimeout;
    this.requestInFlight = null; this.started = false; this.closed = false; this.offlineStreak = 0; this.wasOffline = false;
    this.snapshot = this.readCache() || buildSnapshot([]);
    this.sources = new Map(["codex", "workbench"].map(name => [name, {
      adapter: this[name], enabled: config[name]?.enabled !== false && (name !== "workbench" || Boolean(config.adapters?.workbench || config.workbench?.baseUrl || config.workbench?.enabled)),
      tasks: this.snapshot.tasks.filter(t => t.source === name).map(t => ({ ...t, stale: true })),
      health: { state: "offline", lastSuccessAt: this.snapshot.sourceHealth?.[name]?.lastSuccessAt || (this.snapshot.tasks.some(t => t.source === name) ? this.snapshot.updatedAt : null), lastError: null, durationMs: null },
      flight: null, timer: null, streak: 0, dirty: false, lastStart: 0
    }]));
    for (const [name, source] of this.sources) {
      if (!source.enabled) { source.health.state = "disabled"; source.tasks = []; }
      source.adapter.on?.("change", () => {
        if (!this.started || !source.enabled) return;
        if (source.flight) { source.dirty = true; return; }
        this.scheduleSource(name, Math.max(150, 500 - (Date.now() - source.lastStart)));
      });
    }
    this.publish(false);
  }
  readCache() {
    if (!this.cacheFile) return null;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.cacheFile, "utf8"));
      if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.tasks)) return null;
      return buildSnapshot(parsed.tasks.map(t => ({ ...t, stale: true })), { ...parsed, stale: true });
    } catch { return null; }
  }
  writeCache(snapshot) {
    if (!this.cacheFile) return;
    try {
      fs.mkdirSync(path.dirname(this.cacheFile), { recursive: true });
      fs.writeFileSync(`${this.cacheFile}.tmp`, JSON.stringify(snapshot), "utf8");
      fs.renameSync(`${this.cacheFile}.tmp`, this.cacheFile);
    } catch (error) { this.emit("diagnostic", { source: "cache", message: error.message }); }
  }
  publish(emit = true) {
    const entries = [...this.sources];
    const connected = entries.some(([, s]) => s.health.state === "connected");
    const health = Object.fromEntries(entries.map(([name, s]) => [name, { ...s.health, ...s.adapter.diagnostics?.() }]));
    this.snapshot = buildSnapshot(entries.flatMap(([, s]) => s.tasks), {
      updatedAt: connected ? new Date().toISOString() : this.snapshot.updatedAt,
      sources: Object.fromEntries(entries.map(([name, s]) => [name, s.health.state])), sourceHealth: health,
      stale: !connected, staleSince: connected ? null : this.snapshot.staleSince || this.snapshot.updatedAt
    });
    if (emit && !this.closed) {
      this.emit("update", this.snapshot);
      if (connected) this.writeCache(this.snapshot);
    }
    return this.snapshot;
  }
  refreshSource(name, ensureFresh = false) {
    const source = this.sources.get(name);
    if (!source?.enabled || this.closed) return Promise.resolve();
    if (source.flight) {
      // A manual refresh must include one pass newer than the in-flight sample.
      if (ensureFresh) source.dirty = true;
      return source.flight;
    }
    source.flight = (async () => {
      if (ensureFresh && typeof source.adapter.prepareRefresh === "function") await source.adapter.prepareRefresh();
      let passes = 0;
      do {
        source.dirty = false;
        source.lastStart = Date.now();
        try {
          const tasks = await source.adapter.snapshot();
          if (this.closed || !source.enabled) return;
          source.tasks = tasks.map(t => ({ ...t, source: name, stale: false }));
          source.health = { state: "connected", lastSuccessAt: new Date().toISOString(), lastError: null, durationMs: Date.now() - source.lastStart };
          source.streak = 0;
        } catch (error) {
          if (this.closed || !source.enabled) return;
          source.tasks = source.tasks.map(t => ({ ...t, stale: true }));
          source.health = { ...source.health, state: "offline", lastError: error.message, durationMs: Date.now() - source.lastStart };
          source.streak++;
          this.emit("diagnostic", { source: name, message: error.message });
        }
        passes++;
      } while (source.dirty && passes < 3 && !this.closed && source.enabled);
      this.publish();
    })().finally(() => {
      source.flight = null;
      if (this.started && source.enabled) {
        const dirty = source.dirty; source.dirty = false;
        this.scheduleSource(name, dirty ? 150 : this.sourceInterval(source));
      }
    });
    return source.flight;
  }
  sourceInterval(source) {
    if (source.streak) return Math.min(this.maxOfflineIntervalMs, this.intervalMs * 2 ** Math.min(10, source.streak - 1));
    return source.tasks.some(isActiveTask) ? this.intervalMs : this.idleIntervalMs;
  }
  scheduleSource(name, delay) {
    const source = this.sources.get(name);
    if (source.timer) this.clearTimeout(source.timer);
    source.timer = this.setTimeout(() => { source.timer = null; void this.refreshSource(name); }, delay);
  }
  refresh() {
    if (this.requestInFlight) return this.requestInFlight;
    this.emit("refresh", { state: "start" });
    this.requestInFlight = Promise.all([...this.sources].filter(([, s]) => s.enabled).map(([name]) => this.refreshSource(name, true))).then(() => {
      const enabled = [...this.sources.values()].filter(s => s.enabled);
      const connected = enabled.filter(s => s.health.state === "connected").length;
      const outcome = !connected ? "offline" : connected === enabled.length ? "success" : "partial";
      const state = connected && this.wasOffline ? "recovered" : outcome;
      this.wasOffline = !connected; this.offlineStreak = connected ? 0 : this.offlineStreak + 1;
      if (!this.closed) this.emit("refresh", { state, outcome, sources: this.snapshot.sources, snapshot: this.snapshot, nextIntervalMs: this.nextIntervalMs() });
      return this.snapshot;
    }).finally(() => { this.requestInFlight = null; });
    return this.requestInFlight;
  }
  nextIntervalMs() { const delays = [...this.sources.values()].filter(s => s.enabled).map(s => this.sourceInterval(s)); return delays.length ? Math.min(...delays) : this.maxOfflineIntervalMs; }
  setEnabled(name, enabled) {
    const source = this.sources.get(name);
    if (!source) return false;
    source.enabled = Boolean(enabled); source.dirty = false;
    if (source.timer) this.clearTimeout(source.timer); source.timer = null;
    if (!source.enabled) { source.adapter.close?.(); source.tasks = []; source.health.state = "disabled"; this.publish(); }
    else {
      source.health.state = "offline"; source.streak = 0; this.publish();
      source.adapter.startMonitoring?.();
      if (source.flight) { source.dirty = true; } else void this.refreshSource(name);
    }
    return true;
  }
  start() {
    if (this.started) return;
    this.started = true; this.closed = false;
    for (const source of this.sources.values()) if (source.enabled) source.adapter.startMonitoring?.();
    void this.refresh();
  }
  stop() {
    this.started = false; this.closed = true;
    for (const source of this.sources.values()) { if (source.timer) this.clearTimeout(source.timer); source.timer = null; source.adapter.close?.(); }
  }
}
module.exports = { StatusBridge };
