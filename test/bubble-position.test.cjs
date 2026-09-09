const test = require("node:test");
const assert = require("node:assert/strict");
const { bubblePosition } = require("../shared/bubble-position.cjs");
const { panelLayout } = require("../shared/panel-layout.cjs");

const area = { x: 0, y: 0, width: 1920, height: 1040 };
const bubble = { width: 350, height: 220 };

test("bubble opens beside the ball without covering it", () => {
  const right = bubblePosition({ x: 40, y: 300, width: 128, height: 128 }, bubble, area);
  assert.equal(right.side, "right");
  assert.ok(right.x >= 168);

  const left = bubblePosition({ x: 1780, y: 300, width: 128, height: 128 }, bubble, area);
  assert.equal(left.side, "left");
  assert.ok(left.x + bubble.width <= 1780);
});

test("bubble stays inside the work area near corners", () => {
  const result = bubblePosition({ x: 1790, y: 970, width: 128, height: 128 }, bubble, area);
  assert.ok(result.x >= area.x);
  assert.ok(result.y >= area.y);
  assert.ok(result.x + bubble.width <= area.x + area.width);
  assert.ok(result.y + bubble.height <= area.y + area.height);
  assert.ok(result.tailOffset >= 34);
});

test("bubble falls back above or below on a narrow display", () => {
  const narrow = { x: 0, y: 0, width: 420, height: 900 };
  const result = bubblePosition({ x: 146, y: 120, width: 128, height: 128 }, bubble, narrow);
  assert.equal(result.side, "bottom");
  assert.ok(result.y >= 248);
});

test("bubble positioning supports negative monitor coordinates and a visible gap", () => {
  const leftMonitor = { x: -1600, y: -120, width: 1600, height: 1020 };
  const result = bubblePosition({ x: -1550, y: 240, width: 128, height: 128 }, bubble, leftMonitor, 8);
  assert.equal(result.side, "right");
  assert.equal(result.x, -1414);
  assert.ok(result.x >= leftMonitor.x);
  assert.ok(result.x + bubble.width <= leftMonitor.x + leftMonitor.width);
});

test("bubble chooses the available side near the right edge", () => {
  const result = bubblePosition({ x: 1760, y: 400, width: 128, height: 128 }, bubble, area, 8);
  assert.equal(result.side, "left");
  assert.equal(result.x + bubble.width + 8, 1760);
});
test("panel layout keeps primary, completion and toast distinct",()=>{
  const out=panelLayout({x:900,y:450,width:128,height:128},area,[{type:'panel',width:320,height:190},{type:'completions',width:280,height:76},{type:'toast',width:260,height:82}],8);
  assert.equal(out.length,3);
  for(let i=0;i<out.length;i++)for(let j=i+1;j<out.length;j++)assert.ok(!(out[i].x<out[j].x+out[j].width&&out[i].x+out[i].width>out[j].x&&out[i].y<out[j].y+out[j].height&&out[i].y+out[i].height>out[j].y));
});
test('crowded layouts keep all requested panels visible without overlapping one another',()=>{
  const specs=[{type:'panel',width:280,height:154},{type:'completions',width:280,height:76},{type:'toast',width:280,height:82}];
  for(const area of [{x:0,y:0,width:320,height:400},{x:-800,y:-100,width:800,height:600}])for(const x of [area.x,area.x+area.width-128])for(const y of [area.y,area.y+area.height-128]){
    const out=panelLayout({x,y,width:128,height:128},area,specs);
    assert.equal(out.length,3);
    for(const p of out){assert.ok(!p.suppressed);assert.ok(p.x>=area.x&&p.y>=area.y&&p.x+p.width<=area.x+area.width&&p.y+p.height<=area.y+area.height);}
    for(let i=0;i<out.length;i++)for(let j=i+1;j<out.length;j++)assert.ok(!(out[i].x<out[j].x+out[j].width&&out[i].x+out[i].width>out[j].x&&out[i].y<out[j].y+out[j].height&&out[i].y+out[i].height>out[j].y));
  }
});
