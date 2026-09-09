const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const folder = path.join(root, ".runtime", `native-test-${Date.now()}`);
fs.mkdirSync(folder, { recursive: true });
const report = path.join(folder, "cache", "snapshot.json");
const onboarding = process.argv.includes('--onboarding');
const updater = process.argv.includes('--updater');
if(onboarding) fs.writeFileSync(path.join(folder,'config.json'),JSON.stringify({codex:{codexHome:path.join(folder,'not-initialized'),executable:path.join(folder,'missing-codex.exe')}}));
const child = spawn(
  path.join(root, "src-tauri", "target", "release", "meta-bot.exe"),
  [],
  {
    cwd: root,
    windowsHide: true,
    env: {
      ...process.env,
      METABOT_HOME: folder,
      WEBVIEW2_USER_DATA_FOLDER: path.join(folder, 'webview'),
      METABOT_NATIVE_TEST: updater ? "updater" : onboarding ? "onboarding" : "1",
      ...(process.argv.includes("--dpi")
        ? {
            WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
              "--force-device-scale-factor=1.5",
          }
        : {}),
    },
    stdio: "ignore",
  },
);
const timeout = setTimeout(() => {
  spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
    windowsHide: true,
  });
  console.error("Native verification timed out:", folder);
  process.exitCode = 1;
}, 90000);
child.on("error", (e) => {
  clearTimeout(timeout);
  console.error(e);
  process.exitCode = 1;
});
child.on("exit", () => {
  clearTimeout(timeout);
  try {
    const result = JSON.parse(fs.readFileSync(report, "utf8"));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.passed ? 0 : 1;
  } catch (e) {
    console.error("Native verification produced no report:", folder, e.message);
    process.exitCode = 1;
  }
});
