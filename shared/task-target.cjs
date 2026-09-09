function taskTarget(task, config = {}) {
  if (!task) throw new Error("任务不存在或已移出列表");
  if (task.source === "codex") {
    if (!/^[a-zA-Z0-9_-]+$/.test(task.id)) throw new Error("Codex 线程标识无效");
    return `codex://threads/${encodeURIComponent(task.id)}`;
  }
  const base = config.workbench?.webUrl || config.workbench?.baseUrl;
  if (!base) throw new Error("请先配置工作台网页地址");
  const url = new URL(base);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("工作台地址必须使用 HTTP(S)");
  url.searchParams.set("session", task.id);
  return url.toString();
}
module.exports = { taskTarget };
