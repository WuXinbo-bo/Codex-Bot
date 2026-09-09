async (page) => {
  await page.goto('http://127.0.0.1:4187/test/fixtures/m1-visual.html');
  await page.evaluate(() => {
    const sheet = document.createElement('div');
    sheet.id = 'eye-review';
    sheet.style.cssText = 'position:fixed;inset:0;z-index:99999;background:white;display:grid;grid-template-columns:repeat(4,160px);align-content:start;gap:12px;padding:16px;overflow:auto';
    document.body.append(sheet);
    for (const name of ['wind_squint', 'relief', 'sharp_turn', 'landing', 'squint_focus', 'amused', 'sleepy_peek', 'neutral']) {
      const cell = document.createElement('div');
      const target = document.createElement('div');
      cell.append(target, document.createTextNode(name)); sheet.append(cell);
      const rig = MetaBotM1.create(target, { expression: name });
      rig.setMotionLevel('reduced');
      for (const side of ['left', 'right']) {
        if (rig.getState().pose.eyes[side].closed < 0.75) continue;
        const eye = target.querySelector(`[data-part="eye-${side}"]`);
        if (Number(eye.parentElement.getAttribute('opacity')) !== 0) throw new Error(name + ': residual eye-white slit');
      }
      if (/NaN|undefined|Infinity/.test(target.innerHTML)) throw new Error(name + ': invalid geometry');
    }
  });
  await page.setViewportSize({ width: 720, height: 370 });
  await page.screenshot({ path: 'output/playwright/eye-closure-review.png' });
  return { passed: true, poses: 8, nearClosedEyesHaveNoResidualWhite: true };
}
