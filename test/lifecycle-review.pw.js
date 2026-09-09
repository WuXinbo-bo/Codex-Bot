async page => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.testBridge = {};
    window.toasts = [];
    window.metaBot = {
      onInputFallback: () => {}, onBubbleVisibility: () => {},
      onIndicator: fn => testBridge.indicator = fn,
      onInteraction: fn => testBridge.interaction = fn,
      onMotionPreference: () => {},
      showLifecycleToast: ids => toasts.push(ids)
    };
  });
  await page.setViewportSize({ width: 128, height: 128 });
  await page.goto('http://127.0.0.1:4187/src/index.html');
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const status = (status, count) => page.evaluate(({ status, count }) => testBridge.indicator({ status, count, activeCount: count, quiet: true, lifecycleManaged: true }), { status, count });
  const event = (id, kind) => page.evaluate(({ id, kind }) => testBridge.interaction({ type: 'task-lifecycle', events: [{ id, kind, taskId: id, turnId: 'one', title: 'Task ' + id }] }), { id, kind });
  await status('idle', 0);
  check(await page.locator('#count').isHidden(), 'idle badge');
  check(await page.locator('#statusDot').evaluate(el => getComputedStyle(el).backgroundColor) === 'rgb(146, 153, 156)', 'idle gray');
  await page.screenshot({ path: 'output/playwright/lifecycle-idle.png', omitBackground: true });
  await status('running', 2); await event('a', 'started'); await page.clock.runFor(700);
  await page.screenshot({ path: 'output/playwright/lifecycle-start.png', omitBackground: true });
  await page.clock.runFor(3000);
  await status('running', 1); await event('a-done', 'completed'); await page.clock.runFor(1000);
  check(await page.locator('#count').textContent() === '1', 'other task stays counted');
  await page.screenshot({ path: 'output/playwright/lifecycle-complete-busy.png', omitBackground: true });
  await status('idle', 0);
  check(await page.evaluate(() => __metaBotDebug.getExpressionState().activity?.priority) === 55, 'snapshot must not interrupt completion');
  await page.screenshot({ path: 'output/playwright/lifecycle-complete-idle.png', omitBackground: true });
  await event('a-done', 'completed'); await page.clock.runFor(4000);
  check(await page.evaluate(() => toasts.length) === 2, 'duplicate reminder');
  await page.evaluate(() => testBridge.interaction({ type: 'drag-start' }));
  await event('b', 'completed'); await page.clock.runFor(2000);
  check(await page.evaluate(() => toasts.length) === 2, 'drag must defer toast');
  await page.evaluate(() => testBridge.interaction({ type: 'drag-end', releaseSpeed: 0 }));
  check(await page.evaluate(() => toasts.length) === 3, 'release delivers toast');
  await page.clock.resume();
  await page.setViewportSize({ width: 260, height: 82 });
  await page.goto('http://127.0.0.1:4187/src/lifecycle-toast.html');
  await page.evaluate(() => testBridge.interaction({ label: '任务已完成', title: '完成任务状态同步与交互动作验收：这是一条较长的任务标题', count: 3 }));
  await page.screenshot({ path: 'output/playwright/lifecycle-toast.png', omitBackground: true });
  check(await page.evaluate(() => { const el = document.querySelector('main'); return el.scrollHeight <= el.clientHeight; }), 'toast overflow');
  check(errors.length === 0, errors.join('\n'));
  return { passed: true, screenshots: 5, errors };
}
