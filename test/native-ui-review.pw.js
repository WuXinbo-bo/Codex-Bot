async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const handlers = {};
    window.nativeMock = {
      geometry: {
        x: 500,
        y: 300,
        width: 128,
        height: 128,
        scale: 1,
        area: { x: 0, y: 0, width: 1600, height: 1000 },
      },
      writes: [],
      windows: {},
      status: "running",
      previous: null,
    };
    nativeMock.emit = (topic, payload) => {
      for (const fn of handlers[topic] || []) fn({ payload });
    };
    window.__TAURI__ = {
      event: {
        listen: async (topic, fn) => {
          (handlers[topic] ||= []).push(fn);
          return () => {};
        },
      },
      core: {
        invoke: async (command, request) => {
          if (command === "client_request") {
            nativeMock.emit("native:request", { ...request, from: "ball" });
            return;
          }
          const { op, args } = request;
          if (op === "bootstrap")
            return {
              stored: {
                "config.json": {
                  codex: { enabled: true },
                  workbench: { enabled: false },
                },
                "window-state.json": { nativePhysical: { x: 500, y: 300 } },
              },
              executable: "codex.exe",
              codexHome: "test-home",
            };
          if (op === "geometry") return structuredClone(nativeMock.geometry);
          if (op === "window") {
            nativeMock.windows[args.label] = {
              ...nativeMock.windows[args.label],
              ...args,
            };
            if (args.label === "ball" && args.action === "bounds")
              Object.assign(nativeMock.geometry, {
                x: args.x,
                y: args.y,
                width: args.width,
                height: args.height,
              });
            return structuredClone(nativeMock.geometry);
          }
          if (op === "publish") {
            if (args.target === "ball") nativeMock.emit("bridge:event", args);
            return;
          }
          if (op === "reply") {
            nativeMock.emit("bridge:reply", args);
            return;
          }
          if (op === "store") {
            nativeMock.writes.push(args.name);
            return true;
          }
          if (op === "watch") return true;
          if (op === "rpc")
            return {
              data: [
                {
                  id: "test-task",
                  path: "test.jsonl",
                  name: "Native task",
                  cwd: "D:/project",
                  status: { type: "notLoaded" },
                  updatedAt: Date.now(),
                },
              ],
            };
          if (op === "log") {
            const first = nativeMock.previous === null,
              changed = nativeMock.previous !== nativeMock.status;
            nativeMock.previous = nativeMock.status;
            return {
              reset: first,
              growth: changed,
              modified: Date.now(),
              pending: false,
              entries: changed
                ? [
                    {
                      type: "event_msg",
                      timestamp: new Date().toISOString(),
                      payload: {
                        type:
                          nativeMock.status === "running"
                            ? "task_started"
                            : "task_complete",
                        turn_id: "test-turn",
                      },
                    },
                  ]
                : [],
            };
          }
          if (op === "input") return;
          throw new Error("Unexpected native op " + op);
        },
      },
    };
  });
  await page.setViewportSize({ width: 128, height: 128 });
  await page.goto("http://127.0.0.1:4187/dist/tauri/index.html");
  await page.waitForFunction(() => window.__nativeBot);
  if ((await page.locator("#count").textContent()) !== "1")
    throw new Error("Running badge missing");
  await page.evaluate(() => {
    nativeMock.emit("native:mouse", {
      kind: "down",
      x: 564,
      y: 364,
      button: 1,
    });
    nativeMock.emit("native:mouse", {
      kind: "move",
      x: 644,
      y: 404,
      button: 1,
    });
  });
  await page.waitForTimeout(300);
  await page.evaluate(() =>
    nativeMock.emit("native:mouse", { kind: "up", x: 644, y: 404, button: 1 }),
  );
  await page.waitForFunction(
    () => nativeMock.geometry.x === 580 && nativeMock.geometry.y === 340,
  );
  await page.screenshot({
    path: "output/playwright/native-drag.png",
    omitBackground: true,
  });
  await page.waitForTimeout(3500);
  await page.evaluate(async () => {
    nativeMock.status = "completed";
    await __nativeBot.refresh();
  });
  await page.waitForFunction(() => __nativeBot.inbox.items.size === 1);
  if (!(await page.locator("#count").isHidden()))
    throw new Error("Idle badge visible");
  await page.evaluate(() => __nativeBot.move({ x: 600, y: 400 }, true));
  const result = await page.evaluate(() => ({
    popup: nativeMock.windows.completions,
    ball: nativeMock.geometry,
    errors: [],
    retained: __nativeBot.inbox.items.size,
  }));
  if (
    result.popup.x !== 280 ||
    result.popup.y !== 400 ||
    result.popup.height !== 52
  )
    throw new Error("Completion did not follow single-row geometry");
  await page.screenshot({
    path: "output/playwright/native-completed.png",
    omitBackground: true,
  });
  if (errors.length) throw new Error(errors.join("\n"));
  return {
    passed: true,
    bridge: true,
    drag: true,
    retained: result.retained,
    errors,
  };
}
