/**
 * 集成测试：验证完整的交互流程
 * 测试坐标系统、拖拽控制器、交互管理器的协同工作
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { CoordinateSystem } = require("../shared/coordinate-system.cjs");
const { createBallDragController } = require("../shared/ball-drag.cjs");
const { InteractionManager, InteractionState } = require("../shared/interaction-manager.cjs");

test("Integration: Complete drag and drop flow", () => {
  // 模拟屏幕对象
  const mockScreen = {
    getPrimaryDisplay: () => ({ scaleFactor: 1.5 }),
    screenToDipPoint: (p) => ({ x: Math.round(p.x / 1.5), y: Math.round(p.y / 1.5) }),
    dipToScreenPoint: (p) => ({ x: Math.round(p.x * 1.5), y: Math.round(p.y * 1.5) }),
    getCursorScreenPoint: () => ({ x: 100, y: 100 })
  };

  const coords = new CoordinateSystem(mockScreen);
  const dragThreshold = coords.getDragThreshold(6);
  const dragController = createBallDragController({ threshold: dragThreshold });
  const manager = new InteractionManager({
    coordinateSystem: coords,
    dragController,
    ballRadius: 64
  });

  // 设置初始状态
  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });

  // 1. 物理坐标的鼠标按下（模拟 uiohook 输入）
  const physicalDown = { x: 246, y: 246 }; // 1.5x DPI 下的物理坐标
  const downResult = manager.handleMouseDown(physicalDown);

  assert.equal(downResult.handled, true);
  assert.equal(downResult.action, "press");
  assert.equal(manager.getState(), InteractionState.PRESSED);

  // 2. 拖拽移动（超过阈值）
  const physicalMove = { x: 396, y: 396 }; // 移动了 150 物理像素 = 100 逻辑像素
  const moveResult = manager.handleMouseMove(physicalMove);

  assert.equal(moveResult.handled, true);
  assert.equal(moveResult.action, "drag-start");
  assert.ok(moveResult.position);
  assert.equal(moveResult.unconstrained, true);

  // 3. 释放鼠标
  const upResult = manager.handleMouseUp(physicalMove);

  assert.equal(upResult.action, "drag-end");
  assert.equal(upResult.constrainRequired, true);
  assert.ok(upResult.position);
  assert.equal(manager.getState(), InteractionState.AWARE);
});

test("Integration: Click vs drag threshold with DPI scaling", () => {
  const mockScreen = {
    getPrimaryDisplay: () => ({ scaleFactor: 2.0 })
  };

  const coords = new CoordinateSystem(mockScreen);
  const dragThreshold = coords.getDragThreshold(6); // 应该是 12
  const dragController = createBallDragController({ threshold: dragThreshold });
  const manager = new InteractionManager({
    coordinateSystem: coords,
    dragController,
    ballRadius: 64
  });

  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });

  // 按下
  manager.handleMouseDown({ x: 164, y: 164 });

  // 移动 10 像素（小于阈值 12）
  manager.handleMouseMove({ x: 174, y: 164 });

  // 释放，应该被识别为点击
  const upResult = manager.handleMouseUp({ x: 174, y: 164 });

  assert.equal(upResult.action, "ball-click");
  assert.ok(upResult.position === null || upResult.position === undefined);
});

test("Integration: Hover state transitions", () => {
  const coords = new CoordinateSystem(null);
  const dragController = createBallDragController({ threshold: 6 });
  const manager = new InteractionManager({
    coordinateSystem: coords,
    dragController,
    ballRadius: 64
  });

  const stateChanges = [];
  manager.on("state-change", (change) => stateChanges.push(change.to));

  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });
  manager.setBubbleBounds({ x: 250, y: 100, width: 350, height: 220 });
  manager.setBubbleVisible(true);

  // 鼠标进入悬浮球
  manager.handleMouseMove({ x: 164, y: 164 });
  assert.equal(manager.getState(), InteractionState.HOVERING_BALL);

  // 鼠标移到气泡
  manager.handleMouseMove({ x: 300, y: 150 });
  assert.equal(manager.getState(), InteractionState.HOVERING_BUBBLE);

  // 鼠标移出所有区域
  manager.handleMouseMove({ x: -100, y: -100 });
  assert.equal(manager.getState(), InteractionState.IDLE);

  // 验证状态转换序列
  assert.deepEqual(stateChanges, [
    InteractionState.HOVERING_BALL,
    InteractionState.HOVERING_BUBBLE,
    InteractionState.IDLE
  ]);
});

test("Integration: Dragging hides bubble interaction", () => {
  const coords = new CoordinateSystem(null);
  const dragController = createBallDragController({ threshold: 6 });
  const manager = new InteractionManager({
    coordinateSystem: coords,
    dragController,
    ballRadius: 64
  });

  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });
  manager.setBubbleBounds({ x: 250, y: 100, width: 350, height: 220 });
  manager.setBubbleVisible(true);

  // 开始拖拽
  manager.handleMouseDown({ x: 164, y: 164 });
  const moveResult = manager.handleMouseMove({ x: 264, y: 264 });

  // 拖拽时，气泡不应该可交互
  assert.equal(moveResult.ballInteractive, true);
  assert.equal(moveResult.bubbleInteractive, false);
  assert.equal(manager.getState(), InteractionState.DRAGGING);
});

test("Integration: Time threshold allows drag without distance", () => {
  const coords = new CoordinateSystem(null);
  const dragController = createBallDragController({
    threshold: 100, // 很大的距离阈值
    timeThreshold: 50 // 50ms 时间阈值
  });
  const manager = new InteractionManager({
    coordinateSystem: coords,
    dragController,
    ballRadius: 64
  });

  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });

  // 按下
  manager.handleMouseDown({ x: 164, y: 164 });

  // 等待超过时间阈值
  const startTime = Date.now();
  while (Date.now() - startTime < 60) { /* busy wait */ }

  // 即使只移动 1 像素，也应该触发拖拽
  const moveResult = manager.handleMouseMove({ x: 165, y: 165 });

  assert.equal(moveResult.action, "drag-start");
  assert.ok(moveResult.position);
});

test("Integration: Cancel interaction resets state", () => {
  const coords = new CoordinateSystem(null);
  const dragController = createBallDragController({ threshold: 6 });
  const manager = new InteractionManager({
    coordinateSystem: coords,
    dragController,
    ballRadius: 64
  });

  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });

  // 开始拖拽
  manager.handleMouseDown({ x: 164, y: 164 });
  manager.handleMouseMove({ x: 264, y: 264 });
  assert.equal(manager.getState(), InteractionState.DRAGGING);

  // 取消
  manager.cancel();

  assert.equal(manager.getState(), InteractionState.IDLE);
  assert.equal(dragController.isActive(), false);
});

test("Integration: Multiple rapid clicks don't trigger drag", () => {
  const coords = new CoordinateSystem(null);
  const dragController = createBallDragController({ threshold: 6 });
  const manager = new InteractionManager({
    coordinateSystem: coords,
    dragController,
    ballRadius: 64
  });

  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });

  for (let i = 0; i < 5; i++) {
    manager.handleMouseDown({ x: 164 + i, y: 164 + i });
    const upResult = manager.handleMouseUp({ x: 164 + i, y: 164 + i });
    assert.equal(upResult.action, "ball-click");
  }

  assert.equal(manager.getState(), InteractionState.HOVERING_BALL);
});
