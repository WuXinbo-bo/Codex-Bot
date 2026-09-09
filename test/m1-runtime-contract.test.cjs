const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Rig = require("../src/m1-rig.js");
const { POOLS } = require("../src/expression-controller.js");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("runtime entry loads only the native M1 expression stack", () => {
  const html = read("src/index.html");
  assert.match(html, /m1-rig\.js/);
  assert.match(html, /m1-renderer\.js/);
  assert.equal(html.includes("vendor/aora-bot"), false);
  assert.equal(html.includes("EmotionBall"), false);
});

test("every scheduled and interaction expression exists in the M1 rig", () => {
  for (const pool of Object.values(POOLS)) {
    for (const name of pool) assert.ok(Rig.EXPRESSIONS[name], name);
  }
  const interactions = ["attentive", "pressed", "hold", "lifted", "slow_drag", "fast_drag", "sharp_turn", "orbit", "edge_left", "edge_right", "edge_top", "edge_bottom", "landing", "panel", "refreshing"];
  for (const name of interactions) assert.ok(Rig.EXPRESSIONS[name], name);
});

test("M1 renderer and tray icon keep the body mouthless and unoutlined", () => {
  const renderer = read("src/m1-renderer.js");
  const rig = read("src/m1-rig.js");
  const icon = read("src/assets/metabot.svg");
  assert.equal(rig.includes("mouth"), false);
  assert.match(renderer, /data-part": "body"/);
  assert.doesNotMatch(renderer, /data-part": "body"[^\n]*stroke/);
  assert.match(icon, /#02AD45/);
  assert.doesNotMatch(icon, /<radialGradient|<linearGradient|stroke=/);
  assert.equal((icon.match(/<ellipse/g) || []).length, 2);
});

test("status and task anchors remain siblings of the animated ball layer", () => {
  const html = read("src/index.html");
  const ball = html.indexOf('id="ball"');
  const dot = html.indexOf('id="statusDot"');
  const count = html.indexOf('id="count"');
  const button = html.indexOf('id="ballButton"');
  assert.ok(ball > 0 && dot > ball && count > dot && button > count);
  const css = read("src/style.css");
  assert.doesNotMatch(css, /\.ball \{[^}]*transform:/);
  assert.match(css, /\.status-dot \{[^}]*position: absolute/);
  assert.match(css, /\.count \{[^}]*position: absolute/);
});
