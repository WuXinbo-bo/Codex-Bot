const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const { app, BrowserWindow, Tray, Menu, ipcMain, shell, nativeImage, screen, clipboard } = require("electron");
const { TaskCenter } = require("../shared/task-center.cjs");
const { taskTarget } = require("../shared/task-target.cjs");
const { StatusBridge } = require("../bridge/status-bridge.cjs");
const { bubblePosition } = require("../shared/bubble-position.cjs");
const { createBallDragController } = require("../shared/ball-drag.cjs");
const { CoordinateSystem } = require("../shared/coordinate-system.cjs");
const { InteractionManager, InteractionState } = require("../shared/interaction-manager.cjs");
const { createPositionScheduler } = require("../shared/position-scheduler.cjs");
const { normalizeMotionPreference } = require("../shared/motion-preference.cjs");
const { CompletionInbox, retainCompletions } = require("../shared/completion-inbox.cjs");

const DATA_HOME = path.join(process.env.METABOT_HOME || path.join(os.homedir(), ".metabot"));
const CONFIG_FILE = path.join(DATA_HOME, "config.json");
const CACHE_FILE = path.join(DATA_HOME, "cache", "snapshot.json");
const WINDOW_STATE_FILE = path.join(DATA_HOME, "window-state.json");
const BALL_SIZE = { width: 128, height: 128 };
const BUBBLE_SIZE = { width: 320, height: 190 };
const BUBBLE_GAP = 8;
const BALL_RADIUS = BALL_SIZE.width / 2;

// 核心对象
let ballWindow = null;
let bubbleWindow = null;
let toastWindow = null;
let toastTimer = null;
let completionWindow = null;
let completionInbox = null;
let completionInboxError = null;
try { completionInbox = new CompletionInbox(path.join(DATA_HOME, "completion-inbox.json")); }
catch (error) { completionInboxError = error.message; completionInbox = new CompletionInbox(); }

function renderCompletions() {
  const items = [...completionInbox.items.values()];
  if (!retainCompletions(readConfig()) || !items.length) { completionWindow?.hide(); return; }
  if (!ballWindow || ballWindow.isDestroyed()) return;
  if (!completionWindow || completionWindow.isDestroyed()) {
    completionWindow = new BrowserWindow({ width: 320, height: 52, show: false, frame: false, transparent: true, resizable: false, alwaysOnTop: true, skipTaskbar: true, hasShadow: false, webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    completionWindow.on("close", event => { if (!isQuitting) event.preventDefault(); });
    completionWindow.webContents.on("did-stop-loading", renderCompletions);
    completionWindow.loadFile(path.join(__dirname, "../src/completions.html"));
    return;
  }
  if (completionWindow.webContents.isLoading()) return;
  placeCompletions(true);
  completionWindow.webContents.send("completions:update", items.map(({ id, title }) => ({ id, title })));
  completionWindow.showInactive();
}

// Movement updates geometry only: no disk reads, content updates or focus changes.
function placeCompletions(showing = false) {
  if (!ballWindow || ballWindow.isDestroyed() || !completionWindow || completionWindow.isDestroyed()) return;
  if (!showing && !completionWindow.isVisible()) return;
  const ball = ballWindow.getBounds();
  const area = screen.getDisplayMatching(ball).workArea;
  const width = 280, height = completionInbox.items.size > 1 ? 68 : 46;
  let x = ball.x - width >= area.x ? ball.x - width : ball.x + ball.width;
  let y = clamp(ball.y, area.y, area.y + area.height - height);
  if (bubbleWindow && !bubbleWindow.isDestroyed() && bubbleWindow.isVisible()) {
    const panel = bubbleWindow.getBounds();
    if (x < panel.x + panel.width && x + width > panel.x && y < panel.y + panel.height && y + height > panel.y) {
      x = panel.x < ball.x ? ball.x + ball.width : ball.x - width;
      if (x < area.x || x + width > area.x + area.width) {
        x = clamp(ball.x, area.x, area.x + area.width - width);
        y = panel.y - height >= area.y ? panel.y - height : panel.y + panel.height;
      }
    }
  }
  completionWindow.setBounds({ x: Math.round(clamp(x, area.x, area.x + area.width - width)), y: Math.round(clamp(y, area.y, area.y + area.height - height)), width, height });
}

ipcMain.handle("meta-bot:notification-settings", event => { if(!senderIs(event,bubbleWindow))return null;const c=readConfig();return { retainCompletions: retainCompletions(c), autoCloseCompletions:c.notifications?.autoCloseCompletions===true, completionEscalation:c.notifications?.completionEscalation||'standard' }; });
ipcMain.handle("meta-bot:retain-completions", (event, enabled) => {
  if (!senderIs(event, bubbleWindow) || typeof enabled !== "boolean") return { ok: false };
  try {
    const config = readConfig();
    config.notifications = { ...config.notifications, retainCompletions: enabled };
    fs.mkdirSync(DATA_HOME, { recursive: true });
    fs.writeFileSync(`${CONFIG_FILE}.tmp`, JSON.stringify(config, null, 2)); fs.renameSync(`${CONFIG_FILE}.tmp`, CONFIG_FILE);
    renderCompletions();
    return { ok: true, retainCompletions: enabled };
  } catch (error) { return { ok: false, error: error.message }; }
});
ipcMain.handle("meta-bot:completion-preferences", (event, value) => {
  if (!senderIs(event, bubbleWindow) || !value || typeof value !== "object") return { ok:false };
  try { const config=readConfig();config.notifications={...config.notifications,autoCloseCompletions:value.autoCloseCompletions===true,completionEscalation:["off","gentle","standard","angry"].includes(value.completionEscalation)?value.completionEscalation:"standard"};fs.mkdirSync(DATA_HOME,{recursive:true});fs.writeFileSync(`${CONFIG_FILE}.tmp`,JSON.stringify(config,null,2));fs.renameSync(`${CONFIG_FILE}.tmp`,CONFIG_FILE);completionWindow?.webContents.send("completion:preferences",config.notifications);renderCompletions();return {ok:true,...config.notifications}; } catch(error){return {ok:false,error:error.message};}
});
const completionActions = new Set();
ipcMain.handle("meta-bot:completion-action", async (event, id, action) => {
  if (!senderIs(event, completionWindow) || !["open", "ack"].includes(action) || completionActions.has(id)) return { ok: false };
  const item = completionInbox.items.get(id);
  if (!item) return { ok: false, error: "提醒已处理" };
  completionActions.add(id);
  try {
    if (completionInboxError) throw new Error(`提醒存储不可用：${completionInboxError}`);
    if (action === "open") {
      const config = readConfig();
      if (!config.workbench?.baseUrl && bridge?.workbench.config?.baseUrl) config.workbench = { ...config.workbench, baseUrl: bridge.workbench.config.baseUrl };
      await shell.openExternal(taskTarget(item.task, config));
    }
    completionInbox.acknowledge(id);
    const current = taskCenter?.entries.get(item.taskId);
    if (current?.task.turnId === item.turnId && current.task.status === "completed") taskCenter.action(item.taskId, "ack");
    renderCompletions();
    return { ok: true };
  } catch (error) { return { ok: false, error: error.message }; }
  finally { completionActions.delete(id); }
});
let ballReady = false;
const pendingLifecycle = [];
const lifecycleNotices = new Map();

function deliverLifecycle(events) {
  for (const event of events) {
    const task = taskCenter?.entries.get(event.taskId)?.task;
    lifecycleNotices.set(event.id, { ...event, targetTask: task ? { source: task.source, id: task.id } : null });
  }
  if (!ballReady) pendingLifecycle.push(...events);
  else sendBallInteraction("task-lifecycle", { events });
}

ipcMain.on("meta-bot:lifecycle-toast", (sender, ids) => {
  if (sender.sender !== ballWindow?.webContents || !Array.isArray(ids)) return;
  const events = ids.map(id => lifecycleNotices.get(id)).filter(Boolean);
  if (!events.length) return;
  for (const event of events) lifecycleNotices.delete(event.id);
  if (events[0].kind === "completed" && retainCompletions(readConfig())) {
    for (const event of events) {
      const task = event.targetTask || taskCenter?.entries.get(event.taskId)?.task;
      if (!task) continue;
      try { completionInbox.add(event, task); }
      catch (error) { completionInboxError = error.message; completionInbox.items.set(event.id, { ...event, task }); }
    }
    renderCompletions();
    return;
  }
  const labels = { started: "开始任务", joined: "已接入进行中的任务", completed: "任务已完成", failed: "任务失败", attention: "需要你处理", stopped: "任务已停止" };
  const detail = { label: labels[events[0].kind], title: events[0].title, count: events.length };
  if (!toastWindow || toastWindow.isDestroyed()) {
    toastWindow = new BrowserWindow({ width: 260, height: 82, show: false, frame: false, transparent: true, resizable: false, focusable: false, alwaysOnTop: true, skipTaskbar: true, hasShadow: false, webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    toastWindow.setIgnoreMouseEvents(true);
    toastWindow.loadFile(path.join(__dirname, "../src/lifecycle-toast.html"));
  }
  const show = () => {
    if (toastWindow?.isDestroyed() || !ballWindow || ballWindow.isDestroyed()) return;
    const ball = ballWindow.getBounds();
    const area = screen.getDisplayMatching(ball).workArea;
    const besidePanel = (bubbleWindow && !bubbleWindow.isDestroyed() && bubbleWindow.isVisible()) || (completionWindow && !completionWindow.isDestroyed() && completionWindow.isVisible());
    const x = besidePanel ? ball.x + (ball.width - 260) / 2 : ball.x + ball.width + 260 <= area.x + area.width ? ball.x + ball.width : ball.x - 260;
    const y = besidePanel ? ball.y - 82 >= area.y ? ball.y - 82 : ball.y + ball.height : ball.y + 23;
    toastWindow.setBounds({ x: Math.round(clamp(x, area.x, area.x + area.width - 260)), y: Math.round(clamp(y, area.y, area.y + area.height - 82)), width: 260, height: 82 });
    toastWindow.webContents.send("interaction:update", detail);
    toastWindow.showInactive();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { if (toastWindow && !toastWindow.isDestroyed()) toastWindow.hide(); }, 4000);
  };
  if (toastWindow.webContents.isLoading()) toastWindow.webContents.once("did-finish-load", show);
  else show();
});
let tray = null;
let bridge = null;
let taskCenter = null;
let taskTick = null;
let isQuitting = false;
let inputHookStarted = false;
let inputFallback = false;
let globalInput = null;

// 新的统一交互系统（延迟初始化，在 app.ready 之后）
let coordinateSystem = null;
let ballDrag = null;
let interactionManager = null;

// 位置更新调度器
let positionScheduler = null;
let interactionScheduler = null;
let lastBallInteractive = null;
let lastBubbleInteractive = null;
const POSITION_UPDATE_INTERVAL = 16; // ~60fps，防止更新过快导致渲染不同步
const INTERACTION_UPDATE_INTERVAL = 33; // ~30fps is enough for gaze and pose telemetry.

const testExitMs = Number(process.env.METABOT_TEST_EXIT_MS || 0);
const interactionTest = process.env.METABOT_INTERACTION_TEST === "1";
const connectionTest = process.env.METABOT_CONNECTION_TEST === "1";

function readConfig() {
  try {
    const value = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    return value && typeof value === "object" ? value : {};
  } catch { return {}; }
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function integerPosition(position) {
  if (!Number.isFinite(position?.x) || !Number.isFinite(position?.y)) return null;
  return { x: Math.round(position.x), y: Math.round(position.y) };
}

function setBallPosition(position) {
  const next = integerPosition(position);
  if (!next || !ballWindow || ballWindow.isDestroyed()) return false;

  // On Windows at fractional DPI, repeated position-only updates can slowly
  // change the native window extent. Keep position and size atomic.
  ballWindow.setBounds({ ...next, ...BALL_SIZE }, false);

  // 更新交互管理器的悬浮球位置
  if (interactionManager) {
    const applied = ballWindow.getBounds();
    interactionManager.setBallBounds({ x: applied.x, y: applied.y, ...BALL_SIZE });
  }
  placeCompletions();
  return true;
}

function workAreaFor(bounds) {
  const display = typeof screen.getDisplayMatching === "function"
    ? screen.getDisplayMatching(bounds)
    : screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
  return display.workArea;
}

function safeBallPosition(bounds) {
  const area = workAreaFor(bounds);
  return {
    x: clamp(bounds.x, area.x, area.x + area.width - bounds.width),
    y: clamp(bounds.y, area.y, area.y + area.height - bounds.height)
  };
}

function readBallPosition() {
  try {
    const value = JSON.parse(fs.readFileSync(WINDOW_STATE_FILE, "utf8"));
    if (!Number.isFinite(value?.x) || !Number.isFinite(value?.y)) return null;
    return safeBallPosition({ x: Math.round(value.x), y: Math.round(value.y), ...BALL_SIZE });
  } catch { return null; }
}

function saveBallPosition() {
  if (!ballWindow || ballWindow.isDestroyed()) return;
  const { x, y } = ballWindow.getBounds();
  try {
    fs.mkdirSync(DATA_HOME, { recursive: true });
    fs.writeFileSync(WINDOW_STATE_FILE, `${JSON.stringify({ x, y })}\n`, "utf8");
  } catch { /* Position persistence must never interrupt the companion. */ }
}

function placeBubble() {
  if (!ballWindow || !bubbleWindow || ballWindow.isDestroyed() || bubbleWindow.isDestroyed()) return;

  // P0 修复：优先使用 InteractionManager 的悬浮球位置（同步准确）
  // 只有在管理器未初始化时才 fallback 到窗口位置
  const ball = interactionManager?.ballBounds || ballWindow.getBounds();

  // 调试日志：确认使用的位置数据源
  if (process.env.METABOT_DEBUG === "1") {
    const windowBounds = ballWindow.getBounds();
    console.log(`[placeBubble] Using ${interactionManager?.ballBounds ? 'InteractionManager' : 'WindowBounds'}:`,
      `manager=(${interactionManager?.ballBounds?.x},${interactionManager?.ballBounds?.y})`,
      `window=(${windowBounds.x},${windowBounds.y})`);
  }

  const placement = bubblePosition(ball, BUBBLE_SIZE, workAreaFor(ball), BUBBLE_GAP);
  const position = integerPosition(placement);
  if (!position) return;

  bubbleWindow.setBounds({ ...position, ...BUBBLE_SIZE }, false);
  bubbleWindow.webContents.send("bubble:placement", placement);

  // 更新交互管理器的气泡位置
  if (interactionManager) {
    interactionManager.setBubbleBounds({ ...position, ...BUBBLE_SIZE });
  }
}

/**
 * 统一的鼠标交互处理器
 * 事件驱动架构，移除所有轮询定时器
 */
function applyInteractiveState(result) {
  if (!result || !ballWindow || !bubbleWindow) return;

  // 悬浮球的鼠标交互状态
  if (!ballWindow.isDestroyed()) {
    const ballInteractive = Boolean(result.ballInteractive);
    if (ballInteractive !== lastBallInteractive) {
      ballWindow.setIgnoreMouseEvents(!ballInteractive, { forward: true });
      lastBallInteractive = ballInteractive;
    }
  }

  // 气泡的鼠标交互状态
  if (!bubbleWindow.isDestroyed()) {
    const bubbleInteractive = Boolean(result.bubbleInteractive);
    if (bubbleInteractive !== lastBubbleInteractive) {
      bubbleWindow.setIgnoreMouseEvents(!bubbleInteractive, { forward: true });
      lastBubbleInteractive = bubbleInteractive;
    }
  }
}

function sendBallInteraction(type, detail = {}) {
  if (["press", "drag-start"].includes(type) && toastWindow && !toastWindow.isDestroyed()) toastWindow.hide();
  if (!type || !ballWindow || ballWindow.isDestroyed() || ballWindow.webContents.isLoading()) return;
  ballWindow.webContents.send("interaction:update", { type, ...detail });
}

function queueBallInteraction(type, interaction) {
  if (!type) return;
  const detail = interaction || {};
  if (["hover-move", "proximity-move", "drag-move"].includes(type)) {
    interactionScheduler?.schedule({ type, detail });
  } else {
    interactionScheduler?.cancel();
    sendBallInteraction(type, detail);
  }
}

function handleInteractionResult(result) {
  if (!result?.handled) return;
  applyInteractiveState(result);

  if (result.action === "drag-start" || result.action === "drag-move") {
    if (result.action === "drag-start") hideBubble();
    if (result.position) positionScheduler.schedule(result.position);
    queueBallInteraction(result.action, result.interaction);
    if (result.action === "drag-move" && result.interaction?.orbitDetected) {
      sendBallInteraction("drag-orbit", result.interaction);
    }
    return;
  }

  if (result.action === "drag-end") {
    interactionScheduler?.cancel();
    let edgeHit = false;
    let edgeDirection = null;
    if (result.position && result.constrainRequired) {
      const bounds = { ...result.position, ...BALL_SIZE };
      const safePos = safeBallPosition(bounds);
      edgeHit = safePos.x !== Math.round(result.position.x) || safePos.y !== Math.round(result.position.y);
      const horizontal = safePos.x > Math.round(result.position.x) ? "left" : safePos.x < Math.round(result.position.x) ? "right" : "";
      const vertical = safePos.y > Math.round(result.position.y) ? "top" : safePos.y < Math.round(result.position.y) ? "bottom" : "";
      edgeDirection = [vertical, horizontal].filter(Boolean).join("-") || null;
      positionScheduler.flush(safePos);
    }
    saveBallPosition();
    sendBallInteraction("drag-end", { ...(result.interaction || {}), edgeHit, edgeDirection, releaseSpeed: result.interaction?.velocity?.speed || 0 });
    return;
  }

  if (result.action === "ball-click") {
    sendBallInteraction("ball-click", result.interaction || {});
    toggleBubble();
    return;
  }

  if (result.action) queueBallInteraction(result.action, result.interaction);
}

function onGlobalMouseDown(event) {
  if (event.button !== 1 || isQuitting) return;

  const result = interactionManager.handleMouseDown(event);
  handleInteractionResult(result);
}

function onGlobalMouseMove(event) {
  if (isQuitting) return;

  const result = interactionManager.handleMouseMove(event);
  handleInteractionResult(result);
}

function onGlobalMouseUp(event) {
  if (event.button !== 1 || isQuitting) return;

  const result = interactionManager.handleMouseUp(event);
  handleInteractionResult(result);
}

function startInputHook() {
  if (inputHookStarted) return;

  try {
    globalInput = require("uiohook-napi").uIOhook;
    globalInput.on("mousedown", onGlobalMouseDown);
    globalInput.on("mousemove", onGlobalMouseMove);
    globalInput.on("mouseup", onGlobalMouseUp);
    globalInput.start();
    inputHookStarted = true;
    inputFallback = false;

    console.log("Meta Bot: Global input hook started successfully");
  } catch (error) {
    globalInput = null;
    inputFallback = true;
    console.error("Meta Bot: Global input unavailable; using native drag fallback.", error);
  }
}

function stopInputHook() {
  interactionManager.cancel();
  positionScheduler?.cancel();
  interactionScheduler?.cancel();

  if (!inputHookStarted || !globalInput) return;

  try {
    globalInput.removeListener("mousedown", onGlobalMouseDown);
    globalInput.removeListener("mousemove", onGlobalMouseMove);
    globalInput.removeListener("mouseup", onGlobalMouseUp);
    globalInput.stop();
  } catch (error) {
    console.error("Meta Bot: Error stopping input hook", error);
  }

  globalInput = null;
  inputHookStarted = false;
}

function pointsMatch(actual, expected, tolerance = 1) {
  return Math.abs(actual.x - expected.x) <= tolerance && Math.abs(actual.y - expected.y) <= tolerance;
}

function dimensionsMatch(actual, expected, tolerance = 1) {
  return Math.abs(actual.width - expected.width) <= tolerance &&
    Math.abs(actual.height - expected.height) <= tolerance;
}

async function runInteractionTest() {
  const initial = ballWindow.getBounds();
  const pressDip = { x: initial.x + 24, y: initial.y + initial.height / 2 };
  const releaseDip = { x: pressDip.x + 80, y: pressDip.y + 40 };
  const press = coordinateSystem.logicalToPhysical(pressDip) || pressDip;
  const release = coordinateSystem.logicalToPhysical(releaseDip) || releaseDip;

  onGlobalMouseDown({ ...press, button: 1 });
  onGlobalMouseMove({ ...release, button: 0 });
  onGlobalMouseUp({ ...release, button: 1 });
  await new Promise((resolve) => setTimeout(resolve, 100));

  const expected = safeBallPosition({ x: initial.x + 80, y: initial.y + 40, ...BALL_SIZE });
  const moved = ballWindow.getBounds();
  const clickDip = { x: moved.x + moved.width / 2, y: moved.y + moved.height / 2 };
  const click = coordinateSystem.logicalToPhysical(clickDip) || clickDip;

  onGlobalMouseDown({ ...click, button: 1 });
  onGlobalMouseUp({ ...click, button: 1 });
  const opened = bubbleWindow.isVisible();

  onGlobalMouseDown({ ...click, button: 1 });
  onGlobalMouseUp({ ...click, button: 1 });
  const closed = !bubbleWindow.isVisible();

  // Exercise positions that land on fractional physical pixels. A
  // position-only update used to grow the native window on every move.
  const area = workAreaFor(moved);
  for (let index = 0; index < 240; index += 1) {
    const x = clamp(moved.x + ((index * 7) % 97) - 48, area.x, area.x + area.width - BALL_SIZE.width);
    const y = clamp(moved.y + ((index * 5) % 89) - 44, area.y, area.y + area.height - BALL_SIZE.height);
    setBallPosition({ x, y });
  }
  await new Promise((resolve) => setTimeout(resolve, 100));

  const afterStress = ballWindow.getBounds();
  ballWindow.webContents.send("indicator:update", { status: "running", count: 1 });
  await new Promise((resolve) => setTimeout(resolve, 50));
  const geometry = await ballWindow.webContents.executeJavaScript(`(() => {
    const rect = (id) => document.getElementById(id).getBoundingClientRect().toJSON();
    return {
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      ball: rect("ball"),
      ballLayout: { width: document.getElementById("ball").offsetWidth, height: document.getElementById("ball").offsetHeight },
      dot: rect("statusDot"),
      count: rect("count"),
      countHidden: document.getElementById("count").hidden
    };
  })()`);

  const nativeSizeStable = dimensionsMatch(afterStress, BALL_SIZE);
  const rendererGeometryStable =
    dimensionsMatch(geometry.ballLayout, BALL_SIZE) &&
    geometry.ball.left >= 0 &&
    geometry.ball.top >= 0 &&
    geometry.ball.right <= geometry.viewport.width &&
    geometry.ball.bottom <= geometry.viewport.height &&
    geometry.dot.right <= geometry.viewport.width &&
    geometry.dot.bottom <= geometry.viewport.height &&
    geometry.count.right <= geometry.viewport.width &&
    geometry.count.bottom <= geometry.viewport.height &&
    !geometry.countHidden;

  const result = {
    windowCount: BrowserWindow.getAllWindows().length,
    scaleFactor: geometry.viewport.dpr,
    expected: { x: expected.x, y: expected.y },
    actual: { x: moved.x, y: moved.y },
    dragAccurate: pointsMatch(moved, expected),
    clickOpened: opened,
    secondClickClosed: closed,
    afterStress,
    geometry,
    nativeSizeStable,
    rendererGeometryStable
  };

  const passed = result.windowCount === 2 && result.dragAccurate && result.clickOpened &&
    result.secondClickClosed && result.nativeSizeStable && result.rendererGeometryStable;
  console.log(`METABOT_INTERACTION_TEST ${JSON.stringify(result)}`);
  stopInputHook();
  app.exit(passed ? 0 : 1);
}

function showBubble(focus = false) {
  if (!bubbleWindow || bubbleWindow.isDestroyed()) return false;

  placeBubble();

  if (focus) {
    bubbleWindow.show();
    bubbleWindow.focus();
  } else {
    bubbleWindow.showInactive();
  }

  interactionManager.setBubbleVisible(true);
  ballWindow?.webContents.send("bubble:visibility", true);
  sendBallInteraction("bubble-open");
  renderCompletions();
  return true;
}

function hideBubble() {
  if (!bubbleWindow || bubbleWindow.isDestroyed()) return false;

  bubbleWindow.hide();
  placeCompletions();
  interactionManager.setBubbleVisible(false);
  ballWindow?.webContents.send("bubble:visibility", false);
  sendBallInteraction("bubble-close");
  return true;
}

function toggleBubble() {
  if (!bubbleWindow || bubbleWindow.isDestroyed()) return false;

  if (bubbleWindow.isVisible()) {
    hideBubble();
    return false;
  }

  showBubble(false);
  return true;
}

function createBallWindow() {
  const savedPosition = readBallPosition();

  ballWindow = new BrowserWindow({
    ...BALL_SIZE,
    ...(savedPosition || {}),
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  ballWindow.setAlwaysOnTop(true, "floating");
  ballWindow.webContents.on("did-start-loading", () => { ballReady = false; });
  ballWindow.loadFile(path.join(__dirname, "../src/index.html"));

  ballWindow.webContents.on("did-finish-load", () => {
    ballReady = true;
    if (taskCenter) ballWindow.webContents.send("indicator:update", taskCenter.view().indicator);
    ballWindow.webContents.send("motion:preference", normalizeMotionPreference(readConfig().motion?.level));
    if (pendingLifecycle.length) sendBallInteraction("task-lifecycle", { events: pendingLifecycle.splice(0) });
    renderCompletions();
    if (inputFallback) {
      ballWindow.webContents.send("input:fallback");
    }

    // Reassert the complete geometry after Chromium has created the native
    // surface. This also normalizes fractional-DPI creation rounding.
    const bounds = ballWindow.getBounds();
    setBallPosition(bounds);
  });

  ballWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      hideBubble();
      ballWindow.hide();
    }
  });

  ballWindow.on("closed", () => {
    ballWindow = null;
  });

  ballWindow.on("moved", () => {
    if (isQuitting || !ballWindow || ballWindow.isDestroyed()) return;
    placeCompletions();

    // Global-hook movement is owned by setBallPosition. Reading an
    // asynchronous moved event back into the controller reintroduces stale
    // geometry. Native fallback dragging is the only externally-owned path.
    if (inputHookStarted || ballDrag.isDragging() || positionScheduler?.isPending()) return;

    hideBubble();

    const current = ballWindow.getBounds();
    const safe = safeBallPosition({ x: current.x, y: current.y, ...BALL_SIZE });

    if (safe.x !== current.x || safe.y !== current.y ||
        Math.abs(current.width - BALL_SIZE.width) > 1 ||
        Math.abs(current.height - BALL_SIZE.height) > 1) {
      setBallPosition(safe);
    }

    if (interactionManager) {
      interactionManager.setBallBounds({ ...safe, ...BALL_SIZE });
    }

    saveBallPosition();
  });
}

function createBubbleWindow() {
  bubbleWindow = new BrowserWindow({
    ...BUBBLE_SIZE,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  bubbleWindow.setAlwaysOnTop(true, "floating");
  bubbleWindow.loadFile(path.join(__dirname, "../src/panel.html"));

  bubbleWindow.webContents.on("did-finish-load", () => {
    if (isQuitting) return;

    placeBubble();

    if (taskCenter) {
      bubbleWindow.webContents.send("status:update", taskCenter.view());
    }
  });

  bubbleWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      hideBubble();
    }
  });

  bubbleWindow.on("closed", () => {
    bubbleWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, "../src/assets/metabot.svg");
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip("Meta Bot");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "打开 Meta Bot", click: () => { ballWindow?.show(); showBubble(true); } },
    { label: "空闲活动", submenu: [
      ["小魔术", "magic"], ["戴墨镜", "shades"], ["小舞步", "dance"], ["小画家", "paint"], ["雨天剧场", "rain"], ["小礼物", "gift"], ["伸懒腰", "stretch"], ["捧杯休息", "cup"]
    ].map(([label, name]) => ({ label, click: () => sendBallInteraction("activity-request", { name }) })) },
    { type: "separator" },
    { label: "退出", click: () => app.quit() }
  ]));

  tray.on("click", () => {
    ballWindow?.show();
    toggleBubble();
  });
}

const singleInstance = app.requestSingleInstanceLock();

if (!singleInstance) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!ballWindow) return;
    if (ballWindow.isMinimized()) ballWindow.restore();
    ballWindow.show();
    showBubble(true);
  });
}

app.whenReady().then(() => {
  if (!singleInstance) return;

  fs.mkdirSync(DATA_HOME, { recursive: true });
  app.setAppUserModelId("ai.metabot.companion");

  // 初始化交互系统（必须在 app.ready 之后）
  coordinateSystem = new CoordinateSystem(screen);
  const dragThreshold = coordinateSystem.getDragThreshold(6);
  ballDrag = createBallDragController({ threshold: dragThreshold, timeThreshold: 150 });
  interactionManager = new InteractionManager({
    coordinateSystem,
    dragController: ballDrag,
    ballRadius: BALL_RADIUS
  });
  interactionManager.on("action", handleInteractionResult);
  positionScheduler = createPositionScheduler({
    apply: setBallPosition,
    interval: POSITION_UPDATE_INTERVAL
  });
  interactionScheduler = createPositionScheduler({
    apply: ({ type, detail }) => sendBallInteraction(type, detail),
    interval: INTERACTION_UPDATE_INTERVAL
  });

  createBallWindow();
  createBubbleWindow();
  createTray();
  startInputHook();

  const handleDisplayChange = () => {
    if (!ballWindow || ballWindow.isDestroyed()) return;

    const current = ballWindow.getBounds();
    const position = safeBallPosition(current);

    if (position.x !== current.x || position.y !== current.y) {
      setBallPosition(position);
    }

    if (bubbleWindow?.isVisible()) {
      placeBubble();
    }
    placeCompletions();

    saveBallPosition();
  };

  screen.on("display-added", handleDisplayChange);
  screen.on("display-removed", handleDisplayChange);
  screen.on("display-metrics-changed", handleDisplayChange);

  const config = readConfig();
  bridge = new StatusBridge({ ...config, cacheFile: CACHE_FILE });
  taskCenter = new TaskCenter({ file: path.join(DATA_HOME, "task-notices.json") });
  taskCenter.on("update", (view, notify) => {
    bubbleWindow?.webContents.send("status:update", view);
    ballWindow?.webContents.send("indicator:update", view.indicator);
    if (notify && view.tasks.some(e => e.fresh && e.unread && !e.snoozedUntil && e.active)) showBubble(false);
  });
  taskCenter.on("diagnostic", detail => bubbleWindow?.webContents.send("status:diagnostic", detail));
  taskCenter.on("lifecycle", deliverLifecycle);
  taskCenter.update(bridge.snapshot);
  taskTick = setInterval(() => taskCenter.tick(), 1000);
  bridge.on("update", snapshot => taskCenter.update(snapshot));
  bridge.on("refresh", (detail) => {
    bubbleWindow?.webContents.send("status:refresh", detail);
    if (detail.state === "recovered") sendBallInteraction("refresh-recovered");
  });
  bridge.on("diagnostic", (detail) => bubbleWindow?.webContents.send("status:diagnostic", detail));
  bridge.start();

  if (connectionTest) {
    setTimeout(async () => {
      try {
        await bridge.refresh();
        await new Promise(resolve => setTimeout(resolve, 300));
        const view = taskCenter.view();
        const renderer = await ballWindow.webContents.executeJavaScript("window.__metaBotDebug.getExpressionState()");
        const panel = await bubbleWindow.webContents.executeJavaScript("({ rows: document.querySelectorAll('.task-row').length, subtitle: document.getElementById('subtitle').textContent })");
        const threadId = process.env.METABOT_LINK_TEST_THREAD;
        let open = null;
        if (threadId) {
          const entry = view.tasks.find(e => e.task.source === "codex" && e.task.id === threadId);
          if (!entry) throw new Error("指定跳转测试线程未出现在真实任务列表中");
          open = await bubbleWindow.webContents.executeJavaScript(`window.metaBot.openTarget(${JSON.stringify(entry.key)})`);
        }
        const connected = view.sources.codex === "connected";
        const passed = connected && renderer.status === view.indicator.status && (!threadId || open?.ok);
        if (process.env.METABOT_LIFECYCLE_TEST === "1") {
          bridge.stop();
          await new Promise(resolve => setTimeout(resolve, 3500));
          const synthetic = { source: "codex", id: "lifecycle-verification", title: "任务生命周期验收", turnId: "verification-turn", status: "running", eventAt: new Date().toISOString() };
          taskCenter.update({ tasks: [synthetic], sources: { codex: "connected" }, sourceHealth: {} });
          await new Promise(resolve => setTimeout(resolve, 3500));
          taskCenter.update({ tasks: [{ ...synthetic, status: "completed" }], sources: { codex: "connected" }, sourceHealth: {} });
          await new Promise(resolve => setTimeout(resolve, 900));
          const ball = await ballWindow.webContents.executeJavaScript("({ hidden: document.getElementById('count').hidden, status: document.getElementById('statusDot').className, priority: window.__metaBotDebug.getExpressionState().activity?.priority })");
          for (let i = 0; i < 50 && !completionWindow?.isVisible(); i++) await new Promise(resolve => setTimeout(resolve, 100));
          if (!ball.hidden || !ball.status.includes("idle") || ball.priority !== 55 || !completionWindow?.isVisible()) throw new Error(`Lifecycle verification: ${JSON.stringify({ ball, retained: completionInbox.items.size, loading: completionWindow?.webContents.isLoading(), error: completionInboxError })}`);
          await new Promise(resolve => setTimeout(resolve, 4500));
          if (!completionWindow.isVisible()) throw new Error("Completion expired without acknowledgement");
          const completionId = [...completionInbox.items.values()].find(item => item.task.id === synthetic.id)?.id;
          if (!completionId) throw new Error("Missing retained completion");
          const original = ballWindow.getBounds();
          const area = workAreaFor(original);
          const start = { x: area.x + Math.round(area.width / 2), y: area.y + Math.round(area.height / 3) };
          setBallPosition(start);
          const anchor = ballWindow.getBounds(), reminder = completionWindow.getBounds();
          for (let step = 1; step <= 12; step++) {
            positionScheduler.schedule({ x: start.x + step * 2, y: start.y + step * 2 });
            positionScheduler.flush({ x: start.x + step * 2, y: start.y + step * 2 });
            const actual = ballWindow.getBounds(), popup = completionWindow.getBounds();
            if (Math.abs(actual.x - start.x - step * 2) > 1 || Math.abs((popup.x - reminder.x) - (actual.x - anchor.x)) > 2 || Math.abs((popup.y - reminder.y) - (actual.y - anchor.y)) > 2) throw new Error("Completion did not follow applied ball position");
            if (!completionWindow.isVisible() || !completionInbox.items.has(completionId)) throw new Error("Dragging dismissed completion");
          }
          for (const point of [{ x: area.x, y: area.y }, { x: area.x + area.width - 128, y: area.y + area.height - 128 }]) {
            setBallPosition(point);
            const popup = completionWindow.getBounds();
            if (popup.x < area.x - 1 || popup.y < area.y - 1 || popup.x + popup.width > area.x + area.width + 1 || popup.y + popup.height > area.y + area.height + 1) throw new Error("Completion escaped display edge");
          }
          setBallPosition(original);
          console.log("METABOT_COMPLETION_FOLLOW_TEST passed: scheduled movement, screen edges, retained item");
          const disabled = await bubbleWindow.webContents.executeJavaScript("window.metaBot.setRetainCompletions(false)");
          if (!disabled.ok || completionWindow.isVisible()) throw new Error("Completion setting did not disable retention view");
          await bubbleWindow.webContents.executeJavaScript("window.metaBot.setRetainCompletions(true)");
          if (!completionWindow.isVisible()) throw new Error("Completion setting did not restore pending reminders");
          const ack = await completionWindow.webContents.executeJavaScript(`window.metaBot.completionAction(${JSON.stringify(completionId)}, 'ack')`);
          if (!ack.ok || completionInbox.items.has(completionId)) throw new Error("Completion acknowledgement failed");
          console.log(`METABOT_LIFECYCLE_TEST ${JSON.stringify({ passed: true, ball, retainedBeyondTimeout: true, settingsToggle: true, acknowledged: true })}`);
        }
        console.log(`METABOT_CONNECTION_TEST ${JSON.stringify({ passed, sources: view.sources, tasks: view.tasks.length, activeCount: view.activeCount, indicator: view.indicator.status, renderer: renderer.status, panel, diagnostics: bridge.codex.diagnostics(), open })}`);
        stopInputHook();
        app.exit(passed ? 0 : 1);
      } catch (error) { console.error(`METABOT_CONNECTION_TEST ${JSON.stringify({ passed: false, error: error.message })}`); stopInputHook(); app.exit(1); }
    }, 800);
  } else if (interactionTest) {
    setTimeout(runInteractionTest, 600);
  } else if (testExitMs > 0) {
    setTimeout(() => app.quit(), testExitMs).unref();
  }
});

function senderIs(event, window) {
  return Boolean(window && !window.isDestroyed() && event.sender === window.webContents);
}

ipcMain.handle("meta-bot:toggle-bubble", (event) => {
  return senderIs(event, ballWindow) && !inputHookStarted ? toggleBubble() : false;
});

ipcMain.handle("meta-bot:hide-bubble", (event) => {
  return senderIs(event, bubbleWindow) ? hideBubble() : false;
});

ipcMain.handle("meta-bot:show-bubble", (event, focus) => {
  if (!senderIs(event, bubbleWindow)) return false;
  return showBubble(Boolean(focus));
});

// 气泡的命中区域不再需要从渲染进程同步
// 使用简化的矩形判断：鼠标在气泡窗口内 = 可交互
ipcMain.on("meta-bot:set-bubble-hit-regions", (event, regions) => {
  // 保留此接口以兼容现有渲染进程代码，但不再使用
  // 交互管理器会直接使用气泡窗口的整体边界
});

ipcMain.on("meta-bot:update-indicator", (event, status, count, detail = {}) => {
  // Production indicators are owned by TaskCenter, never by a renderer.
  if (taskCenter) return;
  if (!bubbleWindow || event.sender !== bubbleWindow.webContents) return;
  ballWindow?.webContents.send("indicator:update", {
    status: String(status || "offline"),
    count: Math.max(0, Number(count) || 0),
    taskId: String(detail.taskId || ""), eventId: String(detail.eventId || ""), fresh: detail.fresh !== false
  });
});

ipcMain.handle("meta-bot:refresh", async (event) => {
  if (!senderIs(event, bubbleWindow)) return false;
  sendBallInteraction("refresh-start");
  try { const snapshot = await bridge?.refresh(); sendBallInteraction(snapshot?.stale ? "refresh-offline" : "refresh-success"); return snapshot; }
  catch (error) { sendBallInteraction("refresh-offline"); throw error; }
});

ipcMain.handle("meta-bot:open-target", async (event, key) => {
  if (!senderIs(event, bubbleWindow)) return { ok: false, error: "无效窗口" };
  try {
    const task = taskCenter?.entries.get(String(key))?.task;
    const config = readConfig();
    if (!config.workbench?.baseUrl && bridge?.workbench.config?.baseUrl) config.workbench = { ...config.workbench, baseUrl: bridge.workbench.config.baseUrl };
    const target = taskTarget(task, config);
    // Packaged Windows handlers can launch even when Electron cannot resolve an installation path.
    await shell.openExternal(target);
    return { ok: true, target };
  } catch (error) { return { ok: false, error: error.message }; }
});

ipcMain.handle("meta-bot:task-action", (event, key, action) => {
  if (!senderIs(event, bubbleWindow)) return false;
  if (action === "copy") {
    const task = taskCenter?.entries.get(String(key))?.task;
    if (!task) return false;
    clipboard.writeText(task.source === "codex" ? `codex://threads/${encodeURIComponent(task.id)}` : task.deepLink || task.id);
    return true;
  }
  return taskCenter?.action(String(key), action) || false;
});

ipcMain.handle("meta-bot:source-enabled", (event, name, enabled) => {
  if (!senderIs(event, bubbleWindow) || !["codex", "workbench"].includes(name)) return { ok: false };
  try {
    const config = readConfig(); config[name] = { ...config[name], enabled: Boolean(enabled) };
    fs.mkdirSync(DATA_HOME, { recursive: true });
    fs.writeFileSync(`${CONFIG_FILE}.tmp`, JSON.stringify(config, null, 2)); fs.renameSync(`${CONFIG_FILE}.tmp`, CONFIG_FILE);
    bridge.setEnabled(name, enabled); return { ok: true };
  } catch (error) { return { ok: false, error: error.message }; }
});

ipcMain.handle("meta-bot:load-more", async event => {
  if (!senderIs(event, bubbleWindow)) return { ok: false };
  try {
    if (bridge.sources.get("codex").flight) await bridge.sources.get("codex").flight;
    if (!bridge.sources.get("codex").enabled) return { ok: false, error: "Codex 来源已停用" };
    await bridge.codex.loadMore(); await bridge.refreshSource("codex"); return { ok: true };
  } catch (error) { return { ok: false, error: error.message }; }
});

ipcMain.handle("meta-bot:quit", (event) => {
  return senderIs(event, bubbleWindow) ? app.quit() : false;
});

app.on("before-quit", () => {
  isQuitting = true;
  saveBallPosition();
  stopInputHook();
  bridge?.stop();
  clearInterval(taskTick);
  clearTimeout(toastTimer);
  tray?.destroy();
});

module.exports = {
  // 导出用于测试
  coordinateSystem,
  interactionManager
};
