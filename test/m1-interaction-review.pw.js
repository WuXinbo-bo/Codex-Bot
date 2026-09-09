async page => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const root = 'http://127.0.0.1:4187';
  await page.setViewportSize({ width: 1040, height: 900 });
  // Install before loading: the director captures Date.now and timer functions.
  await page.clock.install({ time: new Date('2026-09-08T01:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-08T01:00:01Z'));
  await page.goto(root + '/test/fixtures/m1-visual.html');
  try {
  const state = () => page.evaluate(() => review.previewDirector.getState());
  const scenario = async name => {
    await page.getByRole('combobox', { name: '交互检查', exact: true }).selectOption(name);
    await page.getByRole('button', { name: '演示交互链', exact: true }).click();
  };
  await scenario('lift');
  await page.clock.runFor(300);
  check((await state()).activity?.name === 'lifted', 'lift lost on first movement');
  await page.locator('#preview').screenshot({ path: 'output/playwright/chain-lift.png' });
  await page.clock.runFor(1300);
  check((await state()).current === 'fast_drag', 'lift did not pick up latest speed');
  await page.clock.runFor(1000);
  check((await state()).current === 'focus', 'release failed to settle');

  await scenario('resume');
  await page.clock.runFor(1000);
  check((await state()).suspendedActivity?.name === 'magic', 'magic progress not saved');
  check((await state()).activity?.name === 'caught', 'hover transition canceled caught');
  const savedPhase = await page.evaluate(() => ({ at: Date.now(), saved: review.previewDirector.getState().suspendedActivity }));
  await page.clock.runFor(1800);
  check((await state()).activity?.name === 'magic', 'magic did not resume');
  check((await state()).activity?.index === 2, 'magic resumed at unexpected phase: ' + JSON.stringify({ savedPhase, at: await page.evaluate(() => Date.now()), state: await state() }));
  await page.locator('#preview').screenshot({ path: 'output/playwright/chain-resume.png' });

  await scenario('visit');
  await page.clock.runFor(200);
  check((await state()).reaction?.group === 'hover', 'first approach did not respond');
  await page.clock.runFor(2200);
  check((await state()).reaction?.group === 'return', 'return did not greet');

  await scenario('reminder');
  await page.clock.runFor(5800);
  check((await state()).status === 'running', 'other task must stay running');
  await page.clock.runFor(3500);
  check((await state()).status === 'idle' && !(await state()).activity, 'last completion did not settle');

  await page.getByRole('combobox', { name: 'Codex 状态', exact: true }).selectOption('offline');
  const rect = await page.locator('#preview').boundingBox();
  await page.mouse.move(rect.x + 64, rect.y + 64);
  await page.clock.runFor(1200);
  for (const x of [15, 110, 15]) await page.mouse.move(rect.x + x, rect.y + 64);
  check((await state()).activity?.name === 'mimic', 'real pointer did not trigger mimic: ' + JSON.stringify(await state()));
  await page.clock.runFor(180);
  const left = await page.evaluate(() => review.preview.getState());
  await page.mouse.move(rect.x + 110, rect.y + 64);
  await page.clock.runFor(180);
  const right = await page.evaluate(() => review.preview.getState());
  check(right.motion.rotate > left.motion.rotate && right.gaze.x > left.gaze.x, 'mimic ignored pointer direction');
  await page.locator('#preview').screenshot({ path: 'output/playwright/chain-mimic.png' });
  await page.mouse.down();
  check((await state()).current === 'pressed', 'mimic did not yield to press');
  await page.mouse.up();

  check(errors.length === 0, errors.join('\n'));
  return { passed: true, chains: ['lift', 'resume', 'visit', 'reminder', 'pointer-mimic'], errors };
  } finally { await page.clock.resume(); }
}
