const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");
const root = path.resolve(__dirname, "..");
const dest = path.join(root, "dist", "tauri");
fs.mkdirSync(dest, { recursive: true });
// Do not embed the retired collection module from an earlier incremental build.
fs.rmSync(path.join(dest, 'performance-library.js'), { force: true });
for (const entry of fs.readdirSync(path.join(root, "src"), {
  withFileTypes: true,
})) {
  if (!entry.isFile() || !/\.(html|css|js)$/.test(entry.name)) continue;
  let content = fs.readFileSync(path.join(root, "src", entry.name), "utf8");
  if (entry.name.endsWith(".html"))
    content = content
      .replace("<head>", '<head><script src="./native-bridge.js"></script>')
      .replaceAll(
        "../node_modules/lucide/dist/umd/lucide.min.js",
        "./lucide.min.js",
      );
  fs.writeFileSync(path.join(dest, entry.name), content);
}
fs.copyFileSync(
  path.join(root, "node_modules/lucide/dist/umd/lucide.min.js"),
  path.join(dest, "lucide.min.js"),
);
esbuild.buildSync({
  entryPoints: [path.join(root, "native/bridge.js")],
  outfile: path.join(dest, "native-bridge.js"),
  bundle: true,
  platform: "browser",
  format: "iife",
  minify: true,
  alias: {
    "node:events": "events",
    "node:fs": path.join(root, "native/no-filesystem.js"),
    "node:path": path.join(root, "native/no-filesystem.js"),
    "node:string_decoder": path.join(root, "native/no-filesystem.js"),
  },
});
