import { startCoordinator } from "./coordinator.js";
const tauri = window.__TAURI__;
if (tauri) {
  const invoke = tauri.core.invoke;
  const handlers = new Map();
  const latest = new Map();
  const pending = new Map();
  let sequence = 0;
  let coordinatorReady;
  const ready = new Promise((resolve) => {
    coordinatorReady = resolve;
  });
  const subscribe = (name, listener) => {
    if (!handlers.has(name)) handlers.set(name, new Set());
    handlers.get(name).add(listener);
    if (latest.has(name)) listener(latest.get(name));
    return () => handlers.get(name)?.delete(listener);
  };
  const receive = ({ topic, data }) => {
    if (topic === "native:ready") coordinatorReady();
    latest.set(topic, data);
    for (const fn of handlers.get(topic) || []) fn(data);
  };
  const listening = Promise.all([
    tauri.event.listen("bridge:event", (e) => receive(e.payload)),
    tauri.event.listen("bridge:reply", (e) => {
      const p = pending.get(e.payload.id);
      if (!p) return;
      pending.delete(e.payload.id);
      clearTimeout(p.timer);
      e.payload.error
        ? p.reject(new Error(e.payload.error))
        : p.resolve(e.payload.result);
    }),
  ]);
  const request = async (action, args = []) => {
    await listening;
    if (action !== "ready") await ready;
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error("Native operation timed out"));
      }, action === 'pick-path' ? 300000 : action === 'connection-paths' ? 120000 : 30000);
      pending.set(id, { resolve, reject, timer });
      invoke("client_request", { action, id, args }).catch((e) => {
        clearTimeout(timer);
        pending.delete(id);
        reject(e);
      });
    });
  };
  window.metaBot = {
    onUpdate: fn=>subscribe('update:state',fn),
    onUpdateOpen: fn=>subscribe('update:open',fn),
    getUpdateState: ()=>request('update-state'),
    checkUpdate: ()=>request('update-check'),
    downloadUpdate: ()=>request('update-download'),
    installUpdate: ()=>request('update-install',[true]),
    setUpdatePreferences: value=>request('update-preferences',[value]),
    dismissUpdate: ignore=>request('update-dismiss',[ignore]),
    openUpdates: ()=>request('update-open'),
    onSetup: (fn) => subscribe('setup:visible',fn),
    setup: (value) => request('setup',[value]),
    inspectConnection: () => request('environment'),
    pickConnectionPath: (kind) => request('pick-path',[kind]),
    saveConnectionPaths: (value) => request('connection-paths',[value]),
    finishSetup: (status,verified) => request('setup-finish',[status,verified]),
    copyConnectionDiagnostic: () => request('diagnostic-copy'),
    onStatus: (fn) => subscribe("status:update", fn),
    onRefreshState: (fn) => subscribe("status:refresh", fn),
    onDiagnostic: (fn) => subscribe("status:diagnostic", fn),
    onIndicator: (fn) => subscribe("indicator:update", fn),
    onInteraction: (fn) => subscribe("interaction:update", fn),
    onMotionPreference: (fn) => subscribe("motion:preference", fn),
    onAppearancePreference: (fn) => subscribe("appearance:preference", fn),
    onPlacement: (fn) => subscribe("bubble:placement", fn),
    onBubbleVisibility: (fn) => subscribe("bubble:visibility", fn),
    onPanelPhase: (fn) => subscribe('panel:phase',fn),
    onPanelEnsureVisible:fn=>subscribe('panel:ensure-visible',fn),
    noticeAction:(id,action)=>request('notice-'+action,[id]),
    noticeHover:value=>request('notice-hover',[value]),
    onPanelOverflow: (fn) => subscribe('panel:overflow',fn),
    onInputFallback: (fn) => subscribe("input:fallback", fn),
    onCompletions: (fn) => subscribe("completions:update", fn),
    toggleBubble: () => request("toggle"),
    showBubble: (focus) => request("show", [focus]),
    hideBubble: () => request("hide"),
    showLifecycleToast: (ids) =>
      request("lifecycle", [ids]).catch(console.error),
    completionAction: (id, action) => request("completion", [id, action]),
    getNotificationSettings: () => request("settings"),
    setSettingsVisible: (value) => request('panel-view',[value]),
    setRetainCompletions: (value) => request("retention", [value]),
    setCompletionPreferences: (value) => request("completion-preferences", [value]),
    onCompletionPreferences: (listener) => subscribe("completion:preferences", listener),
    onCompletionNudge: (listener) => subscribe("completion:nudge", listener),
    onCompletionVisible: (listener) => subscribe('completion:visible',listener),
    acknowledgeNudge: (value) => request('nudge-played',[value]),
    moveTaskBoard: (value) => request('board-drag',[value]),
    refresh: () => request("refresh"),
    openTarget: (key) => request("open", [key]),
    taskAction: (key, action) => request("task", [key, action]),
    setSourceEnabled: (name, value) => request("source", [name, value]),
    setAppearance: (value) => request("appearance", [value]),
    loadMore: () => request("more"),
    quit: () => request("quit"),
    updateIndicator: () => {},
    setBubbleHitRegions: () => {},
  };
  window.addEventListener("DOMContentLoaded", async () => {
    try {
      await listening;
      if (document.getElementById("ball"))
        await startCoordinator({
          invoke: (op, args = {}) => invoke("native_op", { op, args }),
          listen: (topic, fn) =>
            tauri.event.listen(topic, (e) => fn(e.payload)),
          receive,
        });
      else {
        // Other windows may load before the coordinator's listeners exist.
        const announce = () => request("ready").catch(() => {});
        announce();
        setTimeout(announce, 1000);
        setTimeout(announce, 3000);
      }
    } catch (error) {
      console.error(error);
      document.body.title = String(error);
    }
  });
}
