(function () {
  const app = document.getElementById("app");
  const ballEl = document.getElementById("ball");
  const ballButton = document.getElementById("ballButton");
  const dot = document.getElementById("statusDot");
  const count = document.getElementById("count");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let configuredMotionLevel = "full";
  let setRandomEnabled = () => {};
  let theaterMasksEnabled = true;
  let performanceDiagnostics = () => ({});
  let configureBehavior=()=>{};

  const ball = window.MetaBotM1?.create(ballEl, { expression: "neutral", motionLevel: effectiveMotionLevel() });
  const color = (status) => ({ running: "running", completed: "completed", failed: "failed", needs_attention: "needs-attention", queued: "queued", paused: "paused", offline: "offline", idle: "idle", stopped: "stopped", unknown: "unknown" })[status] || "offline";

  function effectiveMotionLevel() {
    return reducedMotionQuery.matches ? "reduced" : configuredMotionLevel;
  }

  function renderMotion(detail = {}) {
    ball?.setMotion(detail);
    app.dataset.motion = effectiveMotionLevel() === "reduced" ? "reduced" : String(detail.mode || "idle");
  }

  const expressions = window.MetaBotExpressionController?.createExpressionController({
    setExpression: (name, options) => ball?.setExpression(name, options),
    onResolvedAppearance: detail => ball?.setAppearance(detail),
    isAppearanceBlocked: () => Boolean(ball?.getMaskState()?.current),
    setGaze: (x, y) => ball?.setGaze(x, y),
    clearGaze: () => ball?.clearGaze(),
    setMotion: renderMotion,
    setActive: (active) => ball?.setActive(active),
    resetIdle: () => ball?.resetIdle(),
    onTheaterMask: id => id&&theaterMasksEnabled?ball?.setMask(id,'classic'):ball?.clearMask(true),
    onPerformance: active => ball?.setPerformanceContext({ theater: active }),
    onPerformanceDiagnostics: read => { performanceDiagnostics=read; },
    onBehaviorControl: fn=>{configureBehavior=fn;},
    onLifecycle: detail => { window.metaBot?.showLifecycleToast?.(detail.events.map(event => event.id)); },
    motionLevel: effectiveMotionLevel(),
    intervalMs: 8500
    ,onRandomControl: fn => { setRandomEnabled = fn; }
  });

  function renderIndicator(detail = {}) {
    const status = String(detail.status || "offline");
    const total = Math.max(0, Number(detail.count) || 0);
    dot.className = `status-dot ${color(status)}`;
    app.dataset.status = color(status);
    count.textContent = total > 99 ? "99+" : String(total);
    count.title = detail.activeCount != null ? `进行中 ${detail.activeCount} · 未读 ${detail.unreadCount || 0}` : String(total);
    count.hidden = total === 0;
    expressions?.update(status, total, detail);
    ball?.setTaskStatus(status);
  }

  let fallbackEnabled = false;
  window.metaBot?.onInputFallback(() => {
    if (fallbackEnabled) return;
    fallbackEnabled = true;
    app.classList.add("native-drag-fallback");
    ballButton.addEventListener("click", () => window.metaBot?.toggleBubble());
  });
  window.metaBot?.onBubbleVisibility((visible) => ballButton.setAttribute("aria-expanded", String(visible)));
  window.metaBot?.onPanelPhase?.(detail=>{
    ball?.setPerformanceContext?.({panel:['preparing','entering','leaving'].includes(detail.phase)});
    if(detail.duration)expressions?.interact('panel-phase',detail);
  });
  window.metaBot?.onIndicator(renderIndicator);
  window.metaBot?.onInteraction((detail = {}) => {expressions?.interact(detail.type, detail);ball?.maskInteract(detail.type);});
  window.metaBot?.onMotionPreference?.((level) => {
    configuredMotionLevel = ["full", "soft", "reduced"].includes(level) ? level : "full";
    ball?.setMotionLevel(effectiveMotionLevel());
    expressions?.setMotionLevel(effectiveMotionLevel());
    renderMotion({ mode: "idle" });
  });
  window.metaBot?.onAppearancePreference?.((detail = {}) => {
    configureBehavior(detail);
    theaterMasksEnabled = detail.emoji !== false && detail.maskAuto !== false && detail.masks !== false;
    setRandomEnabled(detail.random !== false);
    app.dataset.skin = detail.skin || "green";
    app.dataset.shape = detail.shape || "morph";
    app.dataset.emoji = detail.emoji === false ? "off" : "on";
    const level = detail.motion || configuredMotionLevel;
    configuredMotionLevel = ["full", "soft", "reduced"].includes(level) ? level : configuredMotionLevel;
    ball?.setMotionLevel(effectiveMotionLevel());
    expressions?.setMotionLevel(effectiveMotionLevel());
  });
  reducedMotionQuery.addEventListener("change", () => {
    ball?.setMotionLevel(effectiveMotionLevel());
    expressions?.setMotionLevel(effectiveMotionLevel());
    renderMotion({ mode: "idle" });
  });
  renderIndicator();
  window.metaBot?.onCompletionNudge?.(({stage})=>{
    expressions?.interact('completion-nudge',{stage});
  });
  window.__metaBotDebug = { getExpressionState: () => expressions?.getState(), getPerformanceState: () => performanceDiagnostics(), getMotionLevel: effectiveMotionLevel };
  window.addEventListener("beforeunload", () => {
    expressions?.stop();
    ball?.destroy();
  });
})();
