async (page) => {
  const browser = await page
    .context()
    .browser()
    .browserType()
    .connectOverCDP("http://127.0.0.1:9224");
  const pages = browser.contexts().flatMap((c) => c.pages());
  const ball = pages.find(
    (p) =>
      p.url().endsWith("/index.html") || p.url() === "http://tauri.localhost/",
  );
  const completed = pages.find((p) => p.url().endsWith("/completions.html"));
  const panel = pages.find((p) => p.url().endsWith("/panel.html"));
  if (!ball || !completed || !panel) throw new Error("Missing native webviews");
  await ball.waitForFunction(async () => window.__nativeBot?.inbox.items.size > 0 &&
    (await __TAURI__.core.invoke('native_op',{op:'bootstrap',args:{}})).stored['cache/snapshot.json']?.passed === true);
  const state = await ball.evaluate(async () => {
    const call = (op, args = {}) =>
      __TAURI__.core.invoke("native_op", { op, args });
    const before = await call("inspect");
    const g = __nativeBot.geometry();
    await __nativeBot.move({ x: g.x + 40, y: g.y + 30 }, true);
    const after = await call("inspect");
    return {
      before,
      after,
      countHidden: document.getElementById("count").hidden,
      status: document.getElementById("statusDot").className,
    };
  });
  if (!state.after.ball.visible || state.before.panel.visible) throw new Error("Native visibility state drift");
  if (
    Math.abs(state.after.completions.x - state.before.completions.x - 40) > 2 ||
    Math.abs(state.after.completions.y - state.before.completions.y - 30) > 2
  )
    throw new Error("Native completion follow failed");
  if (!state.countHidden || !state.status.includes("idle"))
    throw new Error("Idle indicator regression");
  await ball.screenshot({
    path: "output/playwright/tauri-ball.png",
    omitBackground: true,
  });
  await completed.screenshot({
    path: "output/playwright/tauri-completion.png",
    omitBackground: true,
  });
  const row = await completed.locator(".completion").first().boundingBox();
  if (Math.abs(row.height - 40) > 0.1)
    throw new Error("Native reminder is not one row");
  await completed.reload();
  await completed.waitForFunction(() => document.querySelectorAll('.completion').length === 1);
  await completed.getByRole("button", { name: "确认完成" }).first().click();
  await ball.waitForFunction(() => __nativeBot.inbox.items.size === 0);
  let denied = false;
  try {
    await panel.evaluate(() =>
      __TAURI__.core.invoke("native_op", { op: "geometry", args: {} }),
    );
  } catch {
    denied = true;
  }
  if (!denied)
    throw new Error("Unprivileged panel accessed native coordinator command");
  await ball.evaluate(() => __nativeBot.showPanel(true));
  await panel.screenshot({
    path: "output/playwright/tauri-panel.png",
    omitBackground: true,
  });
  await panel.locator('#diagnosticsButton').click();
  await panel.locator('#retainCompletions').uncheck();
  await panel.waitForFunction(async () => (await window.metaBot.getNotificationSettings()).retainCompletions === false);
  await panel.locator('#retainCompletions').check();
  await panel.waitForFunction(async () => (await window.metaBot.getNotificationSettings()).retainCompletions === true);
  await ball
    .evaluate(() =>
      __TAURI__.core.invoke("native_op", { op: "quit", args: {} }),
    )
    .catch(() => {});
  return {
    passed: true,
    nativeFollow: true,
    actualRendererAcknowledgement: true,
    callerIsolation: true,
    reloadHandshake: true,
    settingsControls: true,
    views: pages.length,
    state,
  };
}
