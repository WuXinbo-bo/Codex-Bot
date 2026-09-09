const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
function startNative() {
  const file = path.resolve(__dirname, '../dist/native/meta-bot.exe');
  if (!fs.existsSync(file)) throw new Error('Native build missing. Run npm run build:native and publish dist/native/meta-bot.exe first.');
  const env = { ...process.env };
  delete env.METABOT_NATIVE_TEST;
  delete env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS;
  const child = spawn(file, [], { cwd: path.dirname(file), env, detached: true, windowsHide: true, stdio: 'ignore' });
  child.unref();
  return child;
}
module.exports = { startNative };
if (require.main === module) {
  try { startNative().on('error', error => { console.error(error.message); process.exitCode = 1; }); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
