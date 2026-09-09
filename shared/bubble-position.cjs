function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function bubblePosition(ball, bubble, area, gap = 2) {
  const rightSpace = area.x + area.width - (ball.x + ball.width);
  const leftSpace = ball.x - area.x;
  const belowSpace = area.y + area.height - (ball.y + ball.height);
  const aboveSpace = ball.y - area.y;
  let side;
  let x;
  let y;

  if (rightSpace >= bubble.width + gap || leftSpace >= bubble.width + gap) {
    side = rightSpace >= bubble.width + gap ? "right" : "left";
    x = side === "right" ? ball.x + ball.width + gap : ball.x - bubble.width - gap;
    y = clamp(ball.y + (ball.height - bubble.height) / 2, area.y, area.y + area.height - bubble.height);
  } else {
    side = belowSpace >= bubble.height + gap || belowSpace >= aboveSpace ? "bottom" : "top";
    x = clamp(ball.x + (ball.width - bubble.width) / 2, area.x, area.x + area.width - bubble.width);
    y = side === "bottom" ? ball.y + ball.height + gap : ball.y - bubble.height - gap;
  }

  x = Math.round(clamp(x, area.x, area.x + area.width - bubble.width));
  y = Math.round(clamp(y, area.y, area.y + area.height - bubble.height));
  const tailOffset = side === "left" || side === "right"
    ? clamp(ball.y + ball.height / 2 - y, 34, bubble.height - 34)
    : clamp(ball.x + ball.width / 2 - x, 34, bubble.width - 34);
  return { x, y, side, tailOffset: Math.round(tailOffset) };
}

module.exports = { bubblePosition };
