async (page) => {
  await page.setViewportSize({ width: 320, height: 190 });
  await page.addInitScript(() => {
    window.actions = [];
    window.metaBot = {
      onStatus: fn => { window.updateStatus = fn; }, onPlacement() {}, onDiagnostic() {}, onRefreshState() {},
      openTarget: async key => { actions.push(['open', key]); return { ok: true }; },
      taskAction: async (key, action) => { actions.push([action, key]); return true; }
    };
  });
  await page.reload();
  await page.evaluate(() => updateStatus({tasks: [1,2,3,4].map(i => ({key: `task-${i}`, active: true, task: {title: `正在执行的任务 ${i}，长标题布局验证`, status: 'running', source: 'codex', projectName: 'Meta Bot'}})), sourceHealth: {codex: {state: 'connected'}}, activeCount: 4}));
  await page.getByRole('button', {name:'查看任务', exact:true}).nth(1).click();
  await page.getByRole('button', {name:'复制任务链接', exact:true}).first().click();
  const result = await page.evaluate(() => ({actions, overflow: document.documentElement.scrollWidth > innerWidth, detailHidden: document.getElementById('detail').hidden, feedback: document.getElementById('feedback').textContent, lamp: document.getElementById('headerDot').title}));
  if (result.overflow || !result.detailHidden || result.feedback || result.actions[0][1] !== 'task-2' || result.actions[1][1] !== 'task-1') throw new Error(JSON.stringify(result));
  await page.screenshot({path:'output/playwright/panel-compact.png'});
  await page.getByRole('button', {name:'设置与连接诊断', exact:true}).click();
  await page.getByRole('button', {name:'外观皮肤', exact:true}).click();
  await page.screenshot({path:'output/playwright/panel-compact-settings.png'});
  await page.getByRole('button', {name:'设置与连接诊断', exact:true}).click();
  await page.evaluate(() => updateStatus({tasks: [], sourceHealth: {codex: {state:'offline'}}, activeCount:0}));
  if (await page.locator('.task-row').count()) throw new Error('Stale task rows remain');
  await page.screenshot({path:'output/playwright/panel-compact-idle.png'});
  await page.evaluate(() => { window.metaBot.openTarget = async () => ({ok:false,error:'打开失败，请重试'}); updateStatus({tasks:[{key:'error-task',active:true,task:{title:'失败操作检查',status:'running'}}],sourceHealth:{}}); });
  await page.getByRole('button', {name:'查看任务',exact:true}).click();
  if (await page.locator('#feedback').textContent() !== '打开失败，请重试') throw new Error('Failure feedback missing');
  return result;
}
