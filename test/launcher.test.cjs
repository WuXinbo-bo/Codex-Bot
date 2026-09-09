const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
test('native launcher clears test flags and never falls back to Electron', () => {
  const calls = [];
  const exports = {};
  const sandbox = { module:{exports}, require:name => name === 'node:fs' ? {existsSync:()=>true} : name === 'node:path' ? path : {spawn:(...args)=>{calls.push(args); return {unref(){}};}}, __dirname:path.resolve('scripts'), process:{env:{METABOT_NATIVE_TEST:'1',WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'debug',EXAMPLE:'kept'}} };
  vm.runInNewContext(fs.readFileSync('scripts/start.cjs','utf8'), sandbox);
  sandbox.module.exports.startNative();
  assert.equal(calls.length, 1);
  assert.ok(calls[0][0].endsWith('meta-bot.exe'));
  assert.equal(calls[0][2].env.METABOT_NATIVE_TEST, undefined);
  assert.equal(calls[0][2].env.EXAMPLE, 'kept');
});
