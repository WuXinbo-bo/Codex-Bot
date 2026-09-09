async (page) => {
  const browser = await page.context().browser().browserType().connectOverCDP('http://127.0.0.1:9225');
  const pages = browser.contexts().flatMap(c => c.pages());
  const ball = pages.find(p => p.url() === 'http://tauri.localhost/');
  const panel = pages.find(p => p.url().endsWith('/panel.html'));
  if (!ball || !panel) throw new Error('Missing live native windows');
  await ball.waitForFunction(() => Boolean(window.__nativeBot), null, {timeout: 60000});
  const snapshot = () => ball.evaluate(() => {
    const v = __nativeBot.center.view();
    return { activeCount: v.activeCount, health: v.sourceHealth.codex?.coverage,
      tasks: v.tasks.filter(e => e.active).map(e => ({ id:e.task.id, status:e.task.status, turnId:e.task.turnId })) };
  });
  const before = await snapshot();
  await ball.evaluate(() => __nativeBot.showPanel(true));
  await panel.screenshot({path:'output/playwright/native-live-connection.png'});
  await ball.reload();
  await ball.waitForFunction(() => Boolean(window.__nativeBot), null, {timeout:60000});
  // Wait for recovery without fabricating tasks or replacing the real source.
  await ball.waitForFunction(() => !__nativeBot.services.codex?.coverage?.pending, null, {timeout:60000});
  const after = await snapshot();
  await ball.evaluate(() => __nativeBot.refresh());
  const refreshed = await snapshot();
  for (const task of before.tasks.filter(t => t.status === 'running')) {
    const next = refreshed.tasks.find(t => t.id === task.id && t.turnId === task.turnId);
    if (next?.status === 'unknown') throw new Error(`Reload lost running evidence: ${task.id}`);
  }
  await ball.evaluate(() => __nativeBot.showPanel(true));
  await panel.screenshot({path:'output/playwright/native-live-reloaded.png'});
  return {before,after,refreshed};
}
