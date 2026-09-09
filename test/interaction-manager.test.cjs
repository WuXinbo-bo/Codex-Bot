const test = require("node:test");
const assert = require("node:assert/strict");
const { InteractionManager, InteractionState } = require("../shared/interaction-manager.cjs");
const { createBallDragController } = require("../shared/ball-drag.cjs");

test("InteractionManager handles ball click", () => {
  const dragController = createBallDragController({ threshold: 6 });
  const manager = new InteractionManager({
    dragController,
    ballRadius: 64
  });

  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });

  // 点击悬浮球中心
  const downResult = manager.handleMouseDown({ x: 164, y: 164 });
  assert.equal(downResult.handled, true);
  assert.equal(downResult.action, "press");
  assert.equal(manager.getState(), InteractionState.PRESSED);

  // 轻微移动（不超过阈值）
  manager.handleMouseMove({ x: 165, y: 165 });

  // 释放
  const upResult = manager.handleMouseUp({ x: 165, y: 165 });
  assert.equal(upResult.handled, true);
  assert.equal(upResult.action, "ball-click");
  assert.equal(manager.getState(), InteractionState.HOVERING_BALL);
});

test("InteractionManager handles ball drag", () => {
  const dragController = createBallDragController({ threshold: 6 });
  const manager = new InteractionManager({
    dragController,
    ballRadius: 64
  });

  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });

  // 按下
  manager.handleMouseDown({ x: 164, y: 164 });
  assert.equal(manager.getState(), InteractionState.PRESSED);

  // 拖拽
  const moveResult = manager.handleMouseMove({ x: 264, y: 264 });
  assert.equal(moveResult.handled, true);
  assert.equal(moveResult.action, "drag-start");
  assert.ok(moveResult.position);
  assert.equal(moveResult.ballInteractive, true);
  assert.equal(moveResult.bubbleInteractive, false);

  // 释放
  const upResult = manager.handleMouseUp({ x: 264, y: 264 });
  assert.equal(upResult.action, "drag-end");
  assert.equal(upResult.constrainRequired, true);
  assert.equal(manager.getState(), InteractionState.AWARE);
});

test("InteractionManager detects hover states", () => {
  const dragController = createBallDragController({ threshold: 6 });
  const manager = new InteractionManager({
    dragController,
    ballRadius: 64
  });

  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });
  manager.setBubbleBounds({ x: 250, y: 100, width: 350, height: 220 });
  manager.setBubbleVisible(true);

  // 悬停在悬浮球上
  manager.handleMouseMove({ x: 164, y: 164 });
  assert.equal(manager.getState(), InteractionState.HOVERING_BALL);

  // 悬停在气泡上
  manager.handleMouseMove({ x: 300, y: 150 });
  assert.equal(manager.getState(), InteractionState.HOVERING_BUBBLE);

  // 移出所有区域
  manager.handleMouseMove({ x: -50, y: -50 });
  assert.equal(manager.getState(), InteractionState.IDLE);
});

test("InteractionManager bubble interactive state", () => {
  const dragController = createBallDragController({ threshold: 6 });
  const manager = new InteractionManager({
    dragController,
    ballRadius: 64
  });

  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });
  manager.setBubbleBounds({ x: 250, y: 100, width: 350, height: 220 });
  manager.setBubbleVisible(true);

  // 鼠标在气泡内
  const result = manager.handleMouseMove({ x: 300, y: 150 });
  assert.equal(result.bubbleInteractive, true);
  assert.equal(result.ballInteractive, false);

  // 鼠标在气泡外
  const result2 = manager.handleMouseMove({ x: 50, y: 50 });
  assert.equal(result2.bubbleInteractive, false);
  assert.equal(result2.ballInteractive, false);
});

test("InteractionManager state change events", () => {
  const dragController = createBallDragController({ threshold: 6 });
  const manager = new InteractionManager({
    dragController,
    ballRadius: 64
  });

  const stateChanges = [];
  manager.on("state-change", (change) => stateChanges.push(change));

  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });

  // 触发状态变化
  manager.handleMouseMove({ x: 164, y: 164 });
  manager.handleMouseDown({ x: 164, y: 164 });
  manager.handleMouseUp({ x: 165, y: 165 });

  assert.equal(stateChanges.length, 3);
  assert.equal(stateChanges[0].to, InteractionState.HOVERING_BALL);
  assert.equal(stateChanges[1].to, InteractionState.PRESSED);
  assert.equal(stateChanges[2].to, InteractionState.HOVERING_BALL);
});

test("InteractionManager emits hold-ready without requiring mouse movement", () => {
  let holdCallback = null;
  const actions = [];
  const manager = new InteractionManager({
    dragController: createBallDragController({ threshold: 6 }),
    ballRadius: 64,
    setTimeout: (callback) => { holdCallback = callback; return 1; },
    clearTimeout: () => { holdCallback = null; }
  });
  manager.on("action", (action) => actions.push(action));
  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });

  manager.handleMouseDown({ x: 164, y: 164 });
  assert.equal(manager.getState(), InteractionState.PRESSED);
  holdCallback();
  assert.equal(manager.getState(), InteractionState.HOLD_READY);
  assert.equal(actions[0].action, "hold-ready");

  const released = manager.handleMouseUp({ x: 164, y: 164 });
  assert.equal(released.action, "hold-release");
  assert.equal(manager.getState(), InteractionState.HOVERING_BALL);
});

test("InteractionManager reports proximity and pointer velocity", () => {
  let timestamp = 1000;
  const manager = new InteractionManager({
    dragController: createBallDragController({ threshold: 6 }),
    ballRadius: 64,
    proximityRadius: 180,
    now: () => timestamp
  });
  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });

  const entered = manager.handleMouseMove({ x: 300, y: 164 });
  assert.equal(entered.action, "proximity-enter");
  assert.equal(manager.getState(), InteractionState.AWARE);

  timestamp += 20;
  const moved = manager.handleMouseMove({ x: 280, y: 164 });
  assert.equal(moved.action, "proximity-move");
  assert.equal(moved.interaction.velocity.x, -1000);
  assert.equal(moved.interaction.velocity.speed, 1000);
  assert.ok(moved.interaction.local.x > 0);
});

test("InteractionManager emits three hover dwell stages without pointer movement", () => {
  let time = 0;
  let nextId = 0;
  const timers = new Map();
  const actions = [];
  const manager = new InteractionManager({
    dragController: createBallDragController({ threshold: 6 }),
    ballRadius: 64,
    now: () => time,
    setTimeout: (callback, delay) => { const id = ++nextId; timers.set(id, { callback, due: time + delay }); return id; },
    clearTimeout: (id) => timers.delete(id)
  });
  const advance = (milliseconds) => {
    const target = time + milliseconds;
    for (const [id, timer] of [...timers.entries()].sort((a, b) => a[1].due - b[1].due)) {
      if (timer.due > target) continue;
      time = timer.due;
      timers.delete(id);
      timer.callback();
    }
    time = target;
  };
  manager.on("action", (action) => actions.push(action));
  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });
  manager.handleMouseMove({ x: 164, y: 164 });
  advance(2500);
  assert.deepEqual(actions.map((item) => item.interaction.stage), ["short", "medium", "long"]);
  assert.deepEqual(actions.map((item) => item.interaction.dwellMs), [200, 800, 2500]);
});

test("InteractionManager classifies drag speed and detects an orbit gesture", () => {
  let time = 0;
  const manager = new InteractionManager({
    dragController: createBallDragController({ threshold: 6 }),
    ballRadius: 64,
    now: () => time
  });
  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });
  manager.handleMouseDown({ x: 164, y: 164 });
  time += 20;
  manager.handleMouseMove({ x: 200, y: 164 });
  const points = [{ x: 200, y: 194 }, { x: 170, y: 194 }, { x: 170, y: 164 }, { x: 200, y: 164 }];
  const samples = points.map((point) => {
    time += 20;
    return manager.handleMouseMove(point).interaction;
  });
  assert.ok(samples.every((sample) => sample.speedBand === "fast"));
  assert.ok(samples.some((sample) => sample.orbitDetected));
  manager.cancel();
});
