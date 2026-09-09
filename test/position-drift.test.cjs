/**
 * 位置偏移问题手动测试指南
 *
 * 测试目标：验证悬浮球拖拽后气泡面板位置是否准确
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { CoordinateSystem } = require("../shared/coordinate-system.cjs");
const { createBallDragController } = require("../shared/ball-drag.cjs");
const { InteractionManager } = require("../shared/interaction-manager.cjs");

test("Position drift: Consecutive drags maintain accurate ball-bubble relationship", () => {
  const coords = new CoordinateSystem(null);
  const dragController = createBallDragController({ threshold: 6 });
  const manager = new InteractionManager({
    coordinateSystem: coords,
    dragController,
    ballRadius: 64
  });

  // 初始位置
  const initialBounds = { x: 100, y: 100, width: 128, height: 128 };
  manager.setBallBounds(initialBounds);

  // 模拟 10 次连续拖拽
  const dragSequence = [
    { to: { x: 200, y: 150 } },
    { to: { x: 300, y: 200 } },
    { to: { x: 400, y: 150 } },
    { to: { x: 500, y: 250 } },
    { to: { x: 450, y: 350 } },
    { to: { x: 350, y: 400 } },
    { to: { x: 250, y: 350 } },
    { to: { x: 150, y: 300 } },
    { to: { x: 200, y: 200 } },
    { to: { x: 300, y: 250 } }
  ];

  let currentBounds = initialBounds;

  for (const drag of dragSequence) {
    // 开始拖拽
    const startX = currentBounds.x + 64;
    const startY = currentBounds.y + 64;
    manager.handleMouseDown({ x: startX, y: startY });

    // 移动到目标位置
    const targetX = drag.to.x + 64;
    const targetY = drag.to.y + 64;
    const moveResult = manager.handleMouseMove({ x: targetX, y: targetY });

    // 结束拖拽
    const upResult = manager.handleMouseUp({ x: targetX, y: targetY });

    // 验证：InteractionManager 的 ballBounds 应该准确
    if (moveResult.position) {
      currentBounds = { ...moveResult.position, width: 128, height: 128 };
      manager.setBallBounds(currentBounds);
    }

    // 验证位置准确性（允许 1px 误差）
    const managerBounds = manager.ballBounds;
    assert.ok(Math.abs(managerBounds.x - drag.to.x) <= 1);
    assert.ok(Math.abs(managerBounds.y - drag.to.y) <= 1);
  }

  // 验证最终位置
  const finalBounds = manager.ballBounds;
  assert.equal(finalBounds.x, 300);
  assert.equal(finalBounds.y, 250);
});

test("Position drift: InteractionManager bounds always match expected position", () => {
  const coords = new CoordinateSystem(null);
  const dragController = createBallDragController({ threshold: 6 });
  const manager = new InteractionManager({
    coordinateSystem: coords,
    dragController,
    ballRadius: 64
  });

  const initialBounds = { x: 100, y: 100, width: 128, height: 128 };
  manager.setBallBounds(initialBounds);

  // 模拟拖拽
  manager.handleMouseDown({ x: 164, y: 164 });
  const moveResult = manager.handleMouseMove({ x: 264, y: 264 });
  manager.handleMouseUp({ x: 264, y: 264 });

  // 更新悬浮球位置（模拟 setBallPosition）
  if (moveResult.position) {
    manager.setBallBounds({ ...moveResult.position, width: 128, height: 128 });
  }

  // 验证：InteractionManager 的位置应该是最新的
  const bounds = manager.ballBounds;
  assert.ok(bounds);
  assert.equal(bounds.x, 200);
  assert.equal(bounds.y, 200);
});

test("Position drift: setBallBounds validates all required properties", () => {
  const coords = new CoordinateSystem(null);
  const dragController = createBallDragController({ threshold: 6 });
  const manager = new InteractionManager({
    coordinateSystem: coords,
    dragController,
    ballRadius: 64
  });

  // 有效的边界
  manager.setBallBounds({ x: 100, y: 100, width: 128, height: 128 });
  assert.deepEqual(manager.ballBounds, { x: 100, y: 100, width: 128, height: 128 });

  // 无效的边界（缺少 width）
  const beforeInvalid = manager.ballBounds;
  manager.setBallBounds({ x: 200, y: 200, height: 128 });
  assert.deepEqual(manager.ballBounds, beforeInvalid); // 不应该更新

  // 无效的边界（NaN）
  manager.setBallBounds({ x: NaN, y: 200, width: 128, height: 128 });
  assert.deepEqual(manager.ballBounds, beforeInvalid); // 不应该更新
});

console.log("\n=== 位置偏移测试手动验证步骤 ===\n");
console.log("1. 启动应用：npm start");
console.log("2. 长按拖拽悬浮球到不同位置（重复 10 次）");
console.log("3. 点击悬浮球打开气泡面板");
console.log("4. 观察气泡面板是否紧贴悬浮球，距离是否一致");
console.log("5. 重复步骤 2-4 多次，验证不会出现累积偏移");
console.log("\n预期结果：");
console.log("- 气泡面板始终在悬浮球旁边，距离固定（8px gap）");
console.log("- 不会出现'越来越远'的现象");
console.log("- 拖拽次数不影响气泡位置准确性\n");
