function finitePoint(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;
  return { x: point.x, y: point.y };
}

function createBallDragController(options = {}) {
  const threshold = Math.max(0, Number(options.threshold) || 6);
  const timeThreshold = Math.max(0, Number(options.timeThreshold) || 0);
  const now = typeof options.now === "function" ? options.now : Date.now;
  let gesture = null;

  function begin(point, bounds) {
    const cursor = finitePoint(point);
    if (!cursor || !Number.isFinite(bounds?.x) || !Number.isFinite(bounds?.y)) return false;
    gesture = {
      start: cursor,
      offset: { x: cursor.x - bounds.x, y: cursor.y - bounds.y },
      dragging: false,
      startTime: now()
    };
    return true;
  }

  function move(point) {
    const cursor = finitePoint(point);
    if (!gesture || !cursor) return null;

    // 计算距离和时间
    const distance = Math.hypot(cursor.x - gesture.start.x, cursor.y - gesture.start.y);
    const elapsed = now() - gesture.startTime;

    // 判断是否超过阈值（距离或时间）
    const exceedsThreshold = distance >= threshold || (timeThreshold > 0 && elapsed >= timeThreshold);

    if (!gesture.dragging && !exceedsThreshold) return null;

    const started = !gesture.dragging;
    gesture.dragging = true;

    return {
      type: started ? "drag-start" : "drag-move",
      position: {
        x: cursor.x - gesture.offset.x,
        y: cursor.y - gesture.offset.y
      },
      // 返回原始位置，让调用者决定是否应用边界限制
      unconstrained: true
    };
  }

  function end(point) {
    if (!gesture) return null;
    const cursor = finitePoint(point);
    const wasDragging = gesture.dragging;

    const result = {
      type: wasDragging ? "drag-end" : "click",
      position: cursor && wasDragging
        ? { x: cursor.x - gesture.offset.x, y: cursor.y - gesture.offset.y }
        : null,
      // 拖拽结束时才需要应用边界限制
      constrainRequired: wasDragging
    };

    gesture = null;
    return result;
  }

  function cancel() {
    gesture = null;
  }

  function getState() {
    if (!gesture) return null;
    return {
      isActive: true,
      isDragging: gesture.dragging,
      startPoint: { ...gesture.start },
      elapsed: now() - gesture.startTime
    };
  }

  return {
    begin,
    move,
    end,
    cancel,
    getState,
    isActive: () => Boolean(gesture),
    isDragging: () => Boolean(gesture?.dragging)
  };
}

module.exports = { createBallDragController };
