const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("metaBot", {
  onStatus: (listener) => { const handler = (_event, snapshot) => listener(snapshot); ipcRenderer.on("status:update", handler); return () => ipcRenderer.removeListener("status:update", handler); },
  onRefreshState: (listener) => { const handler = (_event, detail) => listener(detail); ipcRenderer.on("status:refresh", handler); return () => ipcRenderer.removeListener("status:refresh", handler); },
  onDiagnostic: (listener) => { const handler = (_event, detail) => listener(detail); ipcRenderer.on("status:diagnostic", handler); return () => ipcRenderer.removeListener("status:diagnostic", handler); },
  onIndicator: (listener) => { const handler = (_event, detail) => listener(detail); ipcRenderer.on("indicator:update", handler); return () => ipcRenderer.removeListener("indicator:update", handler); },
  onInteraction: (listener) => { const handler = (_event, detail) => listener(detail); ipcRenderer.on("interaction:update", handler); return () => ipcRenderer.removeListener("interaction:update", handler); },
  onMotionPreference: (listener) => { const handler = (_event, level) => listener(level); ipcRenderer.on("motion:preference", handler); return () => ipcRenderer.removeListener("motion:preference", handler); },
  onPlacement: (listener) => { const handler = (_event, detail) => listener(detail); ipcRenderer.on("bubble:placement", handler); return () => ipcRenderer.removeListener("bubble:placement", handler); },
  onBubbleVisibility: (listener) => { const handler = (_event, visible) => listener(Boolean(visible)); ipcRenderer.on("bubble:visibility", handler); return () => ipcRenderer.removeListener("bubble:visibility", handler); },
  onInputFallback: (listener) => { const handler = () => listener(); ipcRenderer.on("input:fallback", handler); return () => ipcRenderer.removeListener("input:fallback", handler); },
  toggleBubble: () => ipcRenderer.invoke("meta-bot:toggle-bubble"),
  showLifecycleToast: (ids) => ipcRenderer.send("meta-bot:lifecycle-toast", ids),
  onCompletions: listener => { const handler = (_event, items) => listener(items); ipcRenderer.on("completions:update", handler); return () => ipcRenderer.removeListener("completions:update", handler); },
  completionAction: (id, action) => ipcRenderer.invoke("meta-bot:completion-action", String(id), String(action)),
  getNotificationSettings: () => ipcRenderer.invoke("meta-bot:notification-settings"),
  setRetainCompletions: enabled => ipcRenderer.invoke("meta-bot:retain-completions", Boolean(enabled)),
  setCompletionPreferences: value => ipcRenderer.invoke("meta-bot:completion-preferences", value),
  onCompletionPreferences: listener => { const handler=(_event,value)=>listener(value); ipcRenderer.on("completion:preferences",handler); return ()=>ipcRenderer.removeListener("completion:preferences",handler); },
  hideBubble: () => ipcRenderer.invoke("meta-bot:hide-bubble"),
  showBubble: (focus = false) => ipcRenderer.invoke("meta-bot:show-bubble", Boolean(focus)),
  // setBubbleHitRegions 已废弃，保留以兼容现有代码但不再使用
  setBubbleHitRegions: () => { /* 不再需要 - 交互管理器使用整个窗口边界 */ },
  updateIndicator: (status, count, detail = {}) => ipcRenderer.send("meta-bot:update-indicator", String(status || "offline"), Number(count) || 0, { taskId: String(detail.taskId || ""), eventId: String(detail.eventId || ""), fresh: detail.fresh !== false }),
  refresh: () => ipcRenderer.invoke("meta-bot:refresh"),
  openTarget: (url) => ipcRenderer.invoke("meta-bot:open-target", String(url || "")),
  taskAction: (key, action) => ipcRenderer.invoke("meta-bot:task-action", String(key), String(action)),
  setSourceEnabled: (name, enabled) => ipcRenderer.invoke("meta-bot:source-enabled", String(name), Boolean(enabled)),
  loadMore: () => ipcRenderer.invoke("meta-bot:load-more"),
  quit: () => ipcRenderer.invoke("meta-bot:quit")
});
