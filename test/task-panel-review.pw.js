async page => {
  const check = (value, message) => { if (!value) throw Error(message); };
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.panelTest = { calls: [] };
    window.metaBot = { onStatus: fn => { panelTest.render = fn; }, onPlacement() {}, onDiagnostic() {}, onRefreshState() {}, openTarget: async key => { panelTest.calls.push(['open', key]); return { ok: true }; }, taskAction: async (key, action) => { panelTest.calls.push([action, key]); return true; }, refresh: async () => { panelTest.calls.push(['refresh']); panelTest.render(panelTest.view); }, hideBubble() {}, quit() {} };
  });
  await page.addInitScript(() => {
    panelTest.retain = true;
    metaBot.getNotificationSettings = async () => ({ retainCompletions: panelTest.retain });
    metaBot.setRetainCompletions = async enabled => { panelTest.retain = enabled; return { ok: true }; };
  });
  await page.goto('http://127.0.0.1:4187/src/panel.html');
  await page.setViewportSize({ width: 348, height: 326 });
  await page.evaluate(() => {
    const task = (id, status, title, active = true) => ({ key: id, active, unread: false, fresh: true, eventId: id + '-turn1', snoozedUntil: 0, task: { id, source: 'codex', title, status, projectName: 'Meta-Bot' } });
    panelTest.view = { tasks: [task('a', 'running', '正在执行的 Codex 任务'), task('b', 'unknown', '已跟踪但暂时无输出', true), task('old', 'unknown', '未读取的历史任务', false)], primaryKey: 'a', activeCount: 2, unreadCount: 0, indicator: { status: 'running' }, sources: { codex: 'connected', workbench: 'disabled' }, sourceHealth: { codex: { state: 'connected', lastSuccessAt: new Date().toISOString(), durationMs: 72 }, workbench: { state: 'disabled' } } };
    panelTest.render(panelTest.view);
  });
  check(await page.locator('.task-row').count() === 2, 'only active tasks should be listed');
  check(await page.locator('#taskStatus').textContent() === '正在运行', 'active detail missing');
  check(await page.locator('#activeCount').textContent() === '2', 'active count missing');
  const bounds = await page.locator('#panel').boundingBox();
  check(bounds.width === 348 && bounds.height === 326, 'compact dialog geometry changed');
  check((await page.evaluate(() => getComputedStyle(document.querySelector('.bubble-shell')).color)) !== 'rgb(245, 247, 248)', 'dark panel text leaked into white dialog');
  await page.getByRole('button', { name: '查看任务', exact: true }).click();
  await page.getByRole('button', { name: '复制任务链接', exact: true }).click();
  await page.getByRole('button', { name: '刷新状态', exact: true }).click();
  await page.locator('.task-row').nth(1).click();
  check(await page.locator('#taskStatus').textContent() === '状态确认中', 'uncertain active task missing');
  await page.evaluate(() => { panelTest.view.tasks[0].task.status = 'completed'; panelTest.view.tasks[0].active = false; panelTest.view.activeCount = 1; panelTest.view.primaryKey = 'b'; panelTest.render(panelTest.view); });
  check(await page.locator('.task-row').count() === 1, 'completed task leaked into active list');
  check(await page.locator('#taskStatus').textContent() === '状态确认中', 'remaining active task detail was lost');
  await page.evaluate(() => { panelTest.view.tasks[0].task.status = 'running'; panelTest.view.tasks[0].active = true; panelTest.view.activeCount = 2; panelTest.view.primaryKey = 'a'; panelTest.render(panelTest.view); });
  check(await page.locator('.task-row').count() === 2, 'active task did not reappear');
  const calls = await page.evaluate(() => panelTest.calls);
  check(['open','copy','refresh'].every(name => calls.some(call => call[0] === name)), 'active task actions regressed');
  check(errors.length === 0, errors.join('\\n'));
  await page.getByRole('button', { name: '设置与连接诊断' }).click();
  check(await page.locator('#retainCompletions').isChecked(), 'retention must default on');
  await page.locator('#retainCompletions').uncheck();
  check(await page.evaluate(() => panelTest.retain) === false, 'retention setting was not saved');
  await page.locator('#retainCompletions').check();
  await page.screenshot({ path: 'output/playwright/completion-settings.png' });
  await page.getByRole('button', { name: '设置与连接诊断' }).click();
  await page.screenshot({ path: 'output/playwright/p0p3-compact-active-dialog.png' });
  return { passed: true, activeRows: 2, geometry: bounds, errors };
}
