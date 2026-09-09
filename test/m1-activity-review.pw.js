async page => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/m1-visual.html');
  await page.setViewportSize({ width: 1040, height: 900 });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const names = await page.evaluate(() => Object.keys(MetaBotActivities.CLIPS));
  let samples = 0;
  for (const name of names) {
    await page.evaluate(name=>review.showCatalog('activities',name),name);
    await page.evaluate(name => review.play(name), name);
    const duration = await page.evaluate(name => MetaBotActivities.duration(name), name);
    await page.evaluate(() => {
      window.activitySamples = [];
      window.activitySampler = setInterval(() => {
        const svg = document.querySelector('#preview svg');
        const bounds = svg.getBoundingClientRect();
        const body = svg.querySelector('[data-part="body"]').getBoundingClientRect();
        activitySamples.push({ valid: !/NaN|undefined|Infinity/.test(svg.outerHTML), inBounds: body.left >= bounds.left - 1 && body.right <= bounds.right + 1 && body.top >= bounds.top - 1 && body.bottom <= bounds.bottom + 1 });
      }, 160);
    });
    await page.clock.runFor(Math.ceil((duration + 400) / 160) * 160);
    const results = await page.evaluate(() => { clearInterval(activitySampler); return activitySamples; });
    const invalid = results.findIndex(result => !result.valid || !result.inBounds);
    if (invalid !== -1) { await page.clock.resume(); throw new Error(name + ': invalid frame ' + invalid * 160); }
    samples += results.length;
    await page.locator('#clip-' + name).screenshot({ path: 'output/playwright/clip-' + name + '.png' });
  }
  await page.evaluate(()=>review.showCatalog('symbols'));
  await page.locator('#symbols').screenshot({ path: 'output/playwright/special-eyes-final.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'output/playwright/activity-mobile.png' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow) throw new Error('Mobile overflow');
  await page.clock.resume();
  await page.setViewportSize({ width: 1040, height: 900 });
  if (errors.length) throw new Error(errors.join('\n'));
  return { activities: names.length, samples, errors, mobileOverflow: overflow };
}
