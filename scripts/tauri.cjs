const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const env = {
  ...process.env,
  PATH: `${path.join(os.homedir(), ".cargo", "bin")}${path.delimiter}${process.env.PATH || ""}`,
};
const command = process.argv[2] || "dev";
const args = process.argv.slice(3);
if (command === "check") {
  const frontend = spawnSync(process.execPath, [path.join(root, "scripts/build-tauri.cjs")], { cwd: root, env, stdio: "inherit" });
  if (frontend.error) console.error(frontend.error.message);
  if (frontend.status !== 0) process.exit(frontend.status ?? 1);
}
const result =
  command === "check"
    ? spawnSync(
        "cargo",
        ["check", "--manifest-path", "src-tauri/Cargo.toml", ...args],
        { cwd: root, env, stdio: "inherit" },
      )
    : spawnSync(
        process.execPath,
        [require.resolve("@tauri-apps/cli/tauri.js"), command, ...args],
        { cwd: root, env, stdio: "inherit" },
      );
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
