function pointInsideCircle(point, bounds, radius = Math.min(bounds.width, bounds.height) / 2) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return false;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const deltaX = point.x - centerX;
  const deltaY = point.y - centerY;
  return (deltaX * deltaX) + (deltaY * deltaY) <= radius * radius;
}

module.exports = { pointInsideCircle };
