const test = require("node:test");
const assert = require("node:assert/strict");
const { createBallDragController } = require("../shared/ball-drag.cjs");

test("dragging preserves the exact cursor-to-ball offset", () => {
  const drag = createBallDragController({ threshold: 6 });
  assert.equal(drag.begin({ x: 125, y: 240 }, { x: 100, y: 200 }), true);
  assert.equal(drag.move({ x: 128, y: 243 }), null);
  const dragStart = drag.move({ x: 225, y: 290 });
  assert.equal(dragStart.type, "drag-start");
  assert.deepEqual(dragStart.position, { x: 200, y: 250 });
  assert.equal(dragStart.unconstrained, true);

  const dragMove = drag.move({ x: 250, y: 310 });
  assert.equal(dragMove.type, "drag-move");
  assert.deepEqual(dragMove.position, { x: 225, y: 270 });

  const dragEnd = drag.end({ x: 250, y: 310 });
  assert.equal(dragEnd.type, "drag-end");
  assert.deepEqual(dragEnd.position, { x: 225, y: 270 });
  assert.equal(dragEnd.constrainRequired, true);
});

test("a stationary press is a click and malformed coordinates are ignored", () => {
  const drag = createBallDragController();
  assert.equal(drag.begin({ x: NaN, y: 20 }, { x: 0, y: 0 }), false);
  assert.equal(drag.begin({ x: 64, y: 64 }, { x: 0, y: 0 }), true);
  const clickResult = drag.end({ x: 65, y: 65 });
  assert.equal(clickResult.type, "click");
  assert.equal(clickResult.position, null);
  assert.equal(clickResult.constrainRequired, false);
  assert.equal(drag.end({ x: 65, y: 65 }), null);
});

test("time threshold triggers drag even without distance", () => {
  const drag = createBallDragController({ threshold: 100, timeThreshold: 50 });
  assert.equal(drag.begin({ x: 100, y: 100 }, { x: 50, y: 50 }), true);

  // 等待超过时间阈值
  const startTime = Date.now();
  while (Date.now() - startTime < 60) { /* busy wait */ }

  // 即使距离很小，也应该触发拖拽
  const result = drag.move({ x: 101, y: 101 });
  assert.ok(result !== null);
  assert.equal(result.type, "drag-start");
});

test("getState returns current drag state", () => {
  const drag = createBallDragController({ threshold: 6 });
  assert.equal(drag.getState(), null);

  drag.begin({ x: 100, y: 100 }, { x: 50, y: 50 });
  const state = drag.getState();
  assert.ok(state.isActive);
  assert.equal(state.isDragging, false);
  assert.deepEqual(state.startPoint, { x: 100, y: 100 });

  drag.move({ x: 110, y: 110 });
  const dragState = drag.getState();
  assert.equal(dragState.isDragging, true);
});
