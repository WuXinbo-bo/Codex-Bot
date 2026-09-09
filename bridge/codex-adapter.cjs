const { spawn } = require("node:child_process");
const readline = require("node:readline");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { EventEmitter } = require("node:events");
const { RolloutReader } = require("./codex-rollout.cjs");
const { normalizeStatus } = require("../shared/status.cjs");

function resolveExecutable(configured, env = process.env) {
  if (configured && configured !== "codex") return configured;
  if (env.CODEX_CLI_PATH && fs.existsSync(env.CODEX_CLI_PATH)) return env.CODEX_CLI_PATH;
  const bin = path.join(env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "OpenAI", "Codex", "bin");
  try {
    const candidates = fs.readdirSync(bin, { withFileTypes: true }).filter(e => e.isDirectory())
      .map(e => path.join(bin, e.name, "codex.exe")).filter(file => fs.existsSync(file))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (candidates[0]) return candidates[0];
  } catch { /* Non-Windows and CLI-only installs use PATH. */ }
  return configured || "codex";
}
function timestamp(value) {
  if (typeof value === "string" && Number.isFinite(Date.parse(value)) && !/^\d+$/.test(value)) return new Date(value).toISOString();
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? new Date(n < 1e10 ? n * 1000 : n).toISOString() : null;
}
function runtimeState(state = {}) {
  const flags = state.activeFlags || [];
  if (flags.includes("waitingOnApproval")) return { status: "needs_attention", waitReason: "approval" };
  if (flags.includes("waitingOnUserInput")) return { status: "needs_attention", waitReason: "input" };
  return { status: normalizeStatus(state.type), waitReason: null };
}

class CodexAdapter extends EventEmitter {
  constructor(config = {}) {
    super(); this.config = config;
    this.executable = resolveExecutable(config.executable);
    this.codexHome = config.codexHome || process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
    this.includeArchived = Boolean(config.includeArchived);
    this.limit = Math.min(500, Math.max(1, Number(config.limit || 100)));
    this.hydrateNotLoaded = config.hydrateNotLoaded !== false;
    this.hydrateLimit = Math.min(this.limit, Math.max(0, Number(config.hydrateLimit ?? 25)));
    this.process = null; this.pending = new Map(); this.nextId = 0; this.initialized = null;
    this.readers = new Map(); this.runtime = new Map(); this.watcher = null; this.changeTimer = null;
    this.stateDbOnly = true; this.nextRepairAt = Date.now() + 300000; this.nextCursor = null;
    this.closed = false; this.monitoring = false; this.lastQueryMs = null; this.watchError = null; this.timeouts = 0;
    this.changedPaths = new Set(); this.catalog = new Map(); this.history = new Map(); this.pageCursor = undefined;
  }
  async start() {
    if (this.initialized) return this.initialized;
    this.closed = false;
    this.executable = resolveExecutable(this.config.executable);
    const child = spawn(this.executable, ["app-server"], { cwd: this.codexHome, env: { ...process.env, CODEX_HOME: this.codexHome }, windowsHide: true, stdio: ["pipe", "pipe", "ignore"] });
    this.process = child;
    readline.createInterface({ input: child.stdout }).on("line", line => { if (this.process === child) this.receive(line); });
    const failed = error => {
      if (this.process !== child) return;
      this.process = null; this.initialized = null; this.runtime.clear();
      for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(error); }
      this.pending.clear();
    };
    child.once("error", error => failed(new Error(`无法启动 Codex：${this.executable}（${error.code || error.message}）`)));
    child.once("exit", (code, signal) => failed(new Error(`Codex 连接已退出（${code ?? signal}）`)));
    child.stdin.on("error", error => failed(error));
    this.initialized = this.request("initialize", { clientInfo: { name: "meta-bot", title: "Meta Bot", version: "0.2.0" } }, 10000)
      .then(() => { this.notify("initialized", {}); })
      .catch(error => { if (this.process === child) { failed(error); child.kill(); } throw error; });
    return this.initialized;
  }
  async request(method, params, timeoutMs = 4000) {
    if (method !== "initialize") await this.start();
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id); reject(new Error(`Codex 请求超时：${method}`));
        if (++this.timeouts >= 2) { this.process?.kill(); this.initialized = null; this.timeouts = 0; }
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try { this.process.stdin.write(`${JSON.stringify({ id, method, params })}\n`); }
      catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
    });
  }
  notify(method, params) { if (this.process?.stdin.writable) this.process.stdin.write(`${JSON.stringify({ method, params })}\n`); }
  receive(line) {
    let message; try { message = JSON.parse(line); } catch { return; }
    const pending = this.pending.get(message.id);
    if (pending && !message.method) {
      this.timeouts = 0;
      clearTimeout(pending.timer); this.pending.delete(message.id);
      if (message.error) { const error = new Error(String(message.error.message || "Codex 请求失败")); error.code = message.error.code; pending.reject(error); }
      else pending.resolve(message.result);
      return;
    }
    // These notifications cover this connection, not other desktop app-server processes.
    const p = message.params || {};
    if (message.method === "thread/status/changed" && p.threadId) {
      if (p.status?.type === "notLoaded") this.runtime.delete(p.threadId);
      else this.runtime.set(p.threadId, { ...runtimeState(p.status), observedAt: new Date().toISOString(), evidence: "runtime" });
      this.changed();
    } else if (["turn/started", "turn/completed"].includes(message.method) && p.threadId) {
      this.runtime.set(p.threadId, { status: normalizeStatus(p.turn?.status), waitReason: null, turnId: p.turn?.id, eventAt: new Date().toISOString(), observedAt: new Date().toISOString(), evidence: "runtime" });
      this.changed();
    }
  }
  changed() {
    if (!this.monitoring || this.changeTimer) return;
    this.changeTimer = setTimeout(() => { this.changeTimer = null; if (!this.closed) this.emit("change"); }, 150);
  }
  async prepareRefresh() {
    // Windows can deliver the rollout notification just after a manual refresh
    // begins. Let the watcher enqueue the changed path before taking the sample.
    await new Promise(resolve => setTimeout(resolve, 180));
  }
  startMonitoring() {
    this.monitoring = true; this.closed = false;
    if (this.watcher) return;
    try {
      const sessions = path.join(this.codexHome, "sessions");
      this.watcher = fs.watch(sessions, { recursive: true }, (_event, file) => {
        if (String(file || "").endsWith(".jsonl")) { this.changedPaths.add(path.join(sessions, String(file))); this.changed(); }
      });
      this.watcher.on("error", error => { this.watchError = error.message; this.watcher?.close(); this.watcher = null; });
      this.watchError = null;
    } catch (error) { this.watchError = error.message; }
  }
  static turnStatus(thread) { return thread?.turns?.at(-1)?.status || thread?.status?.type || "unknown"; }
  async loadMore() {
    const cursor = this.pageCursor === undefined ? this.nextCursor : this.pageCursor;
    if (!cursor) return false;
    const result = await this.request("thread/list", { cursor, limit: this.limit, sortKey: "updated_at", sortDirection: "desc", archived: this.includeArchived, sourceKinds: ["cli", "vscode", "appServer"], ...(this.stateDbOnly ? { useStateDbOnly: true } : {}) }, 8000);
    for (const thread of result?.data || []) this.history.set(String(thread.id), thread);
    this.pageCursor = result?.nextCursor || null;
    return true;
  }
  async hydrate(thread) {
    let activity = null;
    if (thread.path) {
      let reader = this.readers.get(thread.path);
      if (!reader) { reader = new RolloutReader(); this.readers.set(thread.path, reader); }
      try { activity = await reader.read(thread.path); if (activity.pending) this.changed(); }
      catch { activity = { status: "unknown", evidence: "unavailable-log" }; }
    }
    const live = this.runtime.get(String(thread.id));
    if (live && Date.now() - Date.parse(live.observedAt) < 120000) activity = { ...activity, ...live, quiet: false };
    else if (!activity?.evidence && thread.status?.type && thread.status.type !== "notLoaded") activity = { ...activity, ...runtimeState(thread.status), evidence: "runtime", quiet: false };
    return { ...thread, activity, status: { type: activity?.status || "unknown" } };
  }
  async snapshot() {
    if (this.monitoring && !this.watcher) this.startMonitoring();
    const started = performance.now();
    const repair = this.stateDbOnly && Date.now() >= this.nextRepairAt;
    const params = { cursor: null, limit: this.limit, sortKey: "updated_at", sortDirection: "desc", archived: this.includeArchived, sourceKinds: ["cli", "vscode", "appServer"], useStateDbOnly: this.stateDbOnly && !repair };
    let result;
    try { result = await this.request("thread/list", params, repair || !this.stateDbOnly ? 8000 : 4000); }
    catch (error) {
      if (!this.stateDbOnly || (error.code !== -32602 && !/useStateDbOnly|unknown field|invalid param/i.test(error.message))) throw error;
      this.stateDbOnly = false; delete params.useStateDbOnly;
      result = await this.request("thread/list", params, 8000);
    }
    if (repair) this.nextRepairAt = Date.now() + 300000;
    this.lastQueryMs = Math.round(performance.now() - started);
    this.nextCursor = result?.nextCursor || null;
    const unique = new Map();
    const rank = thread => { try { return fs.statSync(thread.path).mtimeMs; } catch { return Date.parse(timestamp(thread.updatedAt)) || 0; } };
    for (const thread of result?.data || []) {
      const id = String(thread.id); const previous = unique.get(id);
      if (!previous || rank(thread) > rank(previous)) unique.set(id, thread);
    }
    for (const [id, thread] of this.history) if (!unique.has(id)) unique.set(id, thread);
    // A changed rollout can be newer than the database index, or outside its first page.
    for (const file of this.changedPaths) {
      let handle;
      try {
        handle = await fs.promises.open(file, "r");
        const buffer = Buffer.alloc(512 * 1024);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        const line = buffer.subarray(0, bytesRead).toString("utf8").split('\n')[0];
        const meta = JSON.parse(line);
        if (meta.type !== "session_meta" || !meta.payload?.id) continue;
        const id = String(meta.payload.id), previous = unique.get(id) || this.catalog.get(id);
        const candidate = { ...previous, id, path: file, cwd: meta.payload.cwd, status: { type: "notLoaded" }, updatedAt: (await handle.stat()).mtimeMs };
        if (!previous || rank(candidate) >= rank(previous)) unique.set(id, candidate);
      } catch { /* Newly created metadata may not be complete yet; polling retries discovery. */ }
      finally { await handle?.close(); }
    }
    const threads = [...unique.values()];
    const normalizePath = file => path.resolve(String(file || "").replace(/^\\\\\?\\/, "")).toLowerCase();
    const changedPaths = new Set([...this.changedPaths].map(normalizePath)); this.changedPaths.clear();
    for (const thread of threads) this.catalog.set(String(thread.id), thread);
    // Keep previously observed active threads even when the recent-list window moves.
    for (const [id, thread] of this.catalog) {
      if (!unique.has(id) && ["running", "needs_attention", "paused", "queued"].includes(this.readers.get(thread.path)?.status)) threads.push(thread);
      else if (!unique.has(id)) this.catalog.delete(id);
    }
    const candidates = threads.filter((t, i) => this.hydrateNotLoaded && (i < this.hydrateLimit || this.history.has(String(t.id)) || changedPaths.has(normalizePath(t.path)) || this.readers.has(t.path) || this.runtime.has(String(t.id))));
    const hydrated = new Map();
    for (let i = 0; i < candidates.length; i += 4) {
      for (const thread of await Promise.all(candidates.slice(i, i + 4).map(t => this.hydrate(t)))) hydrated.set(String(thread.id), thread);
    }
    const paths = new Set(threads.map(t => t.path));
    for (const file of this.readers.keys()) if (!paths.has(file)) this.readers.delete(file);
    return threads.map(raw => {
      const thread = hydrated.get(String(raw.id)) || raw;
      const cwd = String(thread.cwd || thread.gitInfo?.cwd || "");
      const activity = thread.activity || runtimeState(thread.status);
      return { id: String(thread.id), source: "codex", projectId: cwd || "codex:unknown", projectName: cwd.split(/[\\/]/).filter(Boolean).at(-1) || "Codex", title: String(thread.name || thread.preview || "Codex 线程"), status: activity.status, updatedAt: timestamp(thread.updatedAt), ...activity, deepLink: `codex://threads/${encodeURIComponent(String(thread.id))}`, detail: cwd };
    });
  }
  diagnostics() { return { executable: this.executable, codexHome: this.codexHome, queryMode: this.stateDbOnly ? "database" : "compatibility", queryMs: this.lastQueryMs, watching: Boolean(this.watcher), watchError: this.watchError, hasMore: Boolean(this.pageCursor === undefined ? this.nextCursor : this.pageCursor), trackedLogs: this.readers.size }; }
  close() {
    this.closed = true; this.monitoring = false;
    clearTimeout(this.changeTimer); this.changeTimer = null; this.watcher?.close(); this.watcher = null;
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error("Codex 连接已关闭")); }
    this.pending.clear(); this.process?.kill(); this.process = null; this.initialized = null;
    this.readers.clear(); this.runtime.clear();
  }
}

module.exports = { CodexAdapter, resolveExecutable, runtimeState };
