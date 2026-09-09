async page => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.testBridge = {};
    window.metaBot = { onInputFallback: () => {}, onBubbleVisibility: () => {},
      onIndicator: fn => testBridge.indicator = fn, onInteraction: fn => testBridge.interaction = fn,
      onMotionPreference: fn => testBridge.motion = fn };
  });
  await page.clock.install({ time: new Date('2026-09-08T09:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-08T09:00:01Z'));
  await page.setViewportSize({ width: 128, height: 128 });
  await page.goto('http://127.0.0.1:4187/src/index.html');
  const event = (type, detail = {}) => page.evaluate(({ type, detail }) => testBridge.interaction({ type, ...detail }), { type, detail });
  const state = () => page.evaluate(() => __metaBotDebug.getExpressionState());
  try {
    await page.evaluate(() => testBridge.indicator({ status: 'running', count: 1, quiet: true, lifecycleManaged: true }));
    const names = [], faces = [];
    for (let i = 0; i < 12; i++) {
      await event('press', { local: { x: 0.3, y: -0.4 } });
      await page.clock.runFor(120);
      await event('ball-click'); await event(i % 2 ? 'bubble-close' : 'bubble-open');
      const chosen = (await state()).activity.name;
      check(!names.slice(-3).includes(chosen), 'repeat inside three-click window'); names.push(chosen);
      check((await state()).activity.priority === 45, 'panel replaced click response');
      await page.clock.runFor(500);
      const face = await page.evaluate(() => {
        const svg = document.querySelector('#ball svg');
        return { markup: svg.outerHTML, body: svg.querySelector('[data-part="body"]').getBoundingClientRect().toJSON() };
      });
      check(!/NaN|undefined|Infinity/.test(face.markup), 'invalid face');
      check(face.body.left >= -1 && face.body.right <= 129 && face.body.top >= -1 && face.body.bottom <= 129, 'clipped reply');
      faces.push(face.markup);
      if (i < 6) await page.screenshot({ path: `output/playwright/social-click-${i}.png`, omitBackground: true });
      await page.clock.runFor(1400);
    }
    check(new Set(names).size >= 5 && new Set(faces).size >= 5, 'insufficient diversity');
    for (let i = 0; i < 3; i++) { await event('press'); await event('ball-click'); await page.clock.runFor(200); }
    check((await state()).mood === 'wary', 'missing poke memory');
    await page.clock.runFor(9000); check((await state()).mood === 'neutral', 'mood failed to decay');
    await event('drag-start');
    await event('task-lifecycle', { events: [{ id: 'done', kind: 'completed' }] });
    await page.clock.runFor(500);
    check((await state()).activity.name === 'lifted', 'reminder interrupted dragging');
    await event('drag-end', { releaseSpeed: 0 });
    check((await state()).activity.priority === 55, 'completion lost after drag');
    await event('hover-enter'); check((await state()).activity.priority === 55, 'hover interrupted completion');
    await page.evaluate(() => testBridge.motion('reduced'));
    await event('press'); await event('ball-click'); await page.clock.runFor(200);
    check(!(await state()).activity, 'reduced motion still animated');
    check(errors.length === 0, errors.join('\n'));
    return { passed: true, clicks: names, distinct: new Set(names).size, screenshots: 6, errors };
  } finally { await page.clock.resume(); }
}
