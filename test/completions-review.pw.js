async page => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.items = [{ id: 'one', title: '完成任务状态同步与提醒气泡验收：这是一条很长的任务名称' }, { id: 'two', title: '另一项已完成任务' }];
    window.failOpen = true;
    window.metaBot = {
      onCompletions: fn => { window.publish = fn; fn(items); },
      completionAction: async (id, action) => {
        if (action === 'open' && failOpen) return { ok: false, error: '打开失败，请重试' };
        items = items.filter(item => item.id !== id); publish(items); return { ok: true };
      }
    };
  });
  await page.setViewportSize({ width: 320, height: 92 });
  await page.goto('http://127.0.0.1:4187/src/completions.html');
  await page.waitForTimeout(4500);
  check(await page.locator('.completion').count() === 2, 'completion expired');
  const layout = await page.locator('.completion').first().evaluate(row => {
    const title = row.querySelector('.title').getBoundingClientRect();
    const actions = row.querySelector('.actions').getBoundingClientRect();
    return { height: row.getBoundingClientRect().height, aligned: title.top >= actions.top && title.bottom <= actions.bottom, separate: title.right <= actions.left };
  });
  check(layout.height === 40 && layout.aligned && layout.separate, 'not a compact single row');
  await page.screenshot({ path: 'output/playwright/completions-single-row.png', omitBackground: true });
  await page.getByRole('button', { name: '查看任务' }).first().click();
  check(await page.locator('.completion').count() === 2, 'failed open lost reminder');
  check(await page.locator('#error').textContent() === '打开失败，请重试', 'missing error');
  await page.screenshot({ path: 'output/playwright/completions-persistent.png', omitBackground: true });
  await page.evaluate(() => { failOpen = false; });
  await page.getByRole('button', { name: '查看任务' }).first().click();
  check(await page.locator('.completion').count() === 1, 'open did not acknowledge only selected task');
  await page.setViewportSize({ width: 320, height: 52 });
  await page.screenshot({ path: 'output/playwright/completion-single.png', omitBackground: true });
  await page.getByRole('button', { name: '确认完成' }).click();
  check(await page.locator('.completion').count() === 0, 'ack did not remove task');
  check(errors.length === 0, errors.join('\n'));
  return { passed: true, errors };
}
