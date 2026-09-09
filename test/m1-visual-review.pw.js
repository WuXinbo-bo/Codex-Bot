async (page) => {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const root = 'http://127.0.0.1:4187';
  const screenshots = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-09-07T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-07T12:00:01Z'));
  await page.addInitScript(() => {
    const handlers = {};
    window.testBridge = handlers;
    window.metaBot = {
      onInputFallback: callback => { handlers.fallback = callback; },
      onBubbleVisibility: callback => { handlers.bubble = callback; },
      onIndicator: callback => { handlers.indicator = callback; },
      onInteraction: callback => { handlers.interaction = callback; },
      onMotionPreference: callback => { handlers.motion = callback; }
    };
    let seed = 42;
    Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  });
  await page.setViewportSize({ width: 128, height: 128 });
  await page.goto(root + '/src/index.html');
  await page.evaluate(() => testBridge.indicator({ status: 'running', count: 5 }));
  await page.clock.runFor(1400);
  const anchors = await page.evaluate(() => ['statusDot', 'count'].map(id => document.getElementById(id).getBoundingClientRect().toJSON()));
  const capture = async (label) => {
    const result = await page.evaluate(() => {
      const svg = document.querySelector('#ball svg');
      const body = svg.querySelector('[data-part="body"]').getBoundingClientRect();
      return {
        expression: svg.dataset.expression,
        anchors: ['statusDot', 'count'].map(id => document.getElementById(id).getBoundingClientRect().toJSON()),
        bounds: { left: body.left, right: body.right, top: body.top, bottom: body.bottom },
        finite: !/NaN|undefined|Infinity/.test(svg.outerHTML),
        pupil: [...svg.querySelectorAll('ellipse')].map(p => ({ rx: Number(p.getAttribute('rx')), ry: Number(p.getAttribute('ry')) }))
      };
    });
    check(result.finite, label + ': invalid SVG');
    check(JSON.stringify(anchors) === JSON.stringify(result.anchors), label + ': anchors moved');
    check(result.bounds.left >= 0 && result.bounds.top >= 0 && result.bounds.right <= 128 && result.bounds.bottom <= 128, label + ': body clipped');
    const filename = 'm1-action-' + screenshots.length + '.png';
    await page.screenshot({ path: 'output/playwright/' + filename, omitBackground: true });
    screenshots.push({ label, filename, expression: result.expression });
    return result;
  };
  const event = async (type, detail = {}) => page.evaluate(({ type, detail }) => testBridge.interaction({ type, ...detail }), { type, detail });
  await capture('Focused');
  await event('hover-enter', { local: { x: -0.8, y: -0.4 } });
  await page.clock.runFor(300);
  await capture('Look toward pointer');
  await event('press', { local: { x: 0.4, y: -0.7 } });
  await page.clock.runFor(120);
  await capture('Press / 120 ms');
  await event('hold-ready');
  await page.clock.runFor(420);
  await capture('Long press');
  await event('drag-start');
  await event('drag-move', { velocity: { x: 1100, y: -500, speed: 1208 } });
  await page.clock.runFor(250);
  check((await capture('Lift reaction / 250 ms')).expression === 'surprise', 'lift must survive telemetry');
  await page.clock.runFor(1250);
  check((await capture('Fast diagonal drag')).expression === 'fast_drag', 'fast drag pose');
  await event('drag-move', { velocity: { x: 120, y: 40, speed: 126 } });
  await page.clock.runFor(300);
  check((await capture('Decelerate')).expression === 'slow_drag', 'deceleration pose');
  await event('drag-move', { velocity: { x: -1200, y: 0, speed: 1200 }, directionChanged: true });
  await page.clock.runFor(130);
  await capture('Turn / 130 ms');
  await event('drag-end', { releaseSpeed: 1200 });
  await page.clock.runFor(90);
  await capture('Release / 90 ms');
  await page.clock.runFor(130);
  await capture('Release / 220 ms');
  await page.clock.runFor(900);
  check((await capture('Settled')).expression === 'focus', 'release did not restore focus');
  await event('refresh-start');
  await page.clock.runFor(300);
  await capture('Refreshing');
  await event('refresh-success');
  await page.clock.runFor(260);
  await capture('Refresh confirmed');
  await page.clock.runFor(800);
  await page.evaluate(() => testBridge.indicator({ status: 'completed', count: 5 }));
  await page.clock.runFor(400);
  await capture('Completion');
  await page.clock.runFor(2400);
  await capture('Completion settled');
  await page.evaluate(() => testBridge.indicator({ status: 'running', count: 5 }));
  await page.clock.runFor(1500);
  await page.evaluate(() => testBridge.motion('reduced'));
  await page.clock.runFor(100);
  const reducedBefore = await page.locator('#ball').innerHTML();
  await page.clock.runFor(1800);
  check(await page.locator('#ball').innerHTML() === reducedBefore, 'reduced mode must stop continuous motion');
  await capture('Reduced motion');
  await page.evaluate(() => testBridge.motion('soft'));
  await event('press', { local: { x: 0, y: -0.8 } });
  await page.clock.runFor(300);
  await capture('Soft press');
  await event('ball-click');
  await page.evaluate(() => testBridge.motion('full'));
  await page.clock.runFor(1000);
  check(errors.length === 0, errors.join('\n'));

  await page.clock.resume();
  await page.setViewportSize({ width: 1040, height: 850 });
  await page.setContent('<html><head><style>body{margin:24px;background:#f4f6f5;color:#202724;font:14px Segoe UI,sans-serif}h1{font-size:22px}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}figure{margin:0;text-align:center;padding:12px 0;border-bottom:1px solid #d9dfdc}img{display:block;width:128px;height:128px;margin:auto}figcaption{font-size:12px;margin-top:8px}</style></head><body><h1>Meta Bot M1 / motion review</h1><div class="grid">' + screenshots.map(s => '<figure><img src="' + root + '/output/playwright/' + s.filename + '"><figcaption>' + s.label + '</figcaption></figure>').join('') + '</div></body></html>');
  await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
  await page.screenshot({ path: 'output/playwright/m1-motion-review.png', fullPage: true });
  console.log(JSON.stringify({ passed: true, screenshots, errors }));
}
