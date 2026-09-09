const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

function discoverConfig(config) {
  if (config?.baseUrl) return { ...config, baseUrl: normalizeBaseUrl(config.baseUrl) };
  const runtime = readJson(path.join(config?.dataHome || path.join(os.homedir(), ".metacode"), "desktop", "runtime.json"));
  return runtime?.port ? { ...config, baseUrl: `http://127.0.0.1:${runtime.port}` } : config || {};
}

function normalizeBaseUrl(value) {
  try {
    const url = new URL(String(value));
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('仅支持 HTTP(S) 工作台地址');
    return url.toString().replace(/\/$/, '');
  } catch (error) {
    throw new Error(`工作台地址无效：${error instanceof Error ? error.message : String(error)}`);
  }
}

class WorkbenchAdapter {
  constructor(config = {}) {
    try { this.config = discoverConfig(config); this.configError = null; }
    catch (error) { this.config = {}; this.configError = error instanceof Error ? error : new Error(String(error)); }
    this.timeoutMs = Math.max(1_000, Number(config.timeoutMs || 8_000));
  }

  async request(pathname) {
    if (this.configError) throw this.configError;
    const baseUrl = this.config.baseUrl;
    if (!baseUrl) throw new Error("尚未配对 Meta Code 工作台");
    const headers = this.config.token ? { "X-MetaCode-Api-Token": this.config.token } : {};
    const response = await fetch(new URL(pathname, baseUrl), { headers, signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) throw new Error(`工作台请求失败：HTTP ${response.status}`);
    return response.json();
  }

  async snapshot() {
    if (!this.config.baseUrl) this.config = discoverConfig(this.config);
    const [sessions, bootstrap] = await Promise.all([this.request("/api/sessions"), this.request("/api/bootstrap")]);
    const workspaces = bootstrap.workspaces || [];
    const workspaceMap = new Map(workspaces.map((item) => [item.id, item]));
    return sessions.map((session) => ({
      id: session.id,
      source: "workbench",
      projectId: session.workspaceId || "workbench:standalone",
      projectName: session.workspaceId ? workspaceMap.get(session.workspaceId)?.name || "工作区" : "临时任务",
      title: session.title || "工作台任务",
      status: session.status,
      updatedAt: session.updatedAt,
      deepLink: `metacode://session/${encodeURIComponent(session.id)}`,
      detail: session.engine || ""
    }));
  }
}

module.exports = { WorkbenchAdapter };
