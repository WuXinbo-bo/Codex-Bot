const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { CompletionInbox, retainCompletions } = require('../shared/completion-inbox.cjs');
test('completion retention is enabled by default and only explicit false disables it', () => {
  for (const config of [{}, { notifications: {} }, { notifications: { retainCompletions: true } }]) assert.equal(retainCompletions(config), true);
  assert.equal(retainCompletions({ notifications: { retainCompletions: false } }), false);
});
test('completion inbox retains separate turns across restart and acknowledges one at a time', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metabot-inbox-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'inbox.json');
  const inbox = new CompletionInbox(file);
  for (const id of ['a', 'b']) inbox.add({ id, title: id, turnId: id }, { source: 'codex', id: 'same-thread' });
  inbox.add({ id: 'a', title: 'duplicate' }, { source: 'codex', id: 'same-thread' });
  const resumed = new CompletionInbox(file);
  assert.equal(resumed.items.size, 2);
  assert.equal(resumed.items.get('a').title, 'a');
  resumed.acknowledge('a');
  assert.deepEqual([...new CompletionInbox(file).items.keys()], ['b']);
});
test('failed persistence does not silently acknowledge a completion', () => {
  const inbox = new CompletionInbox();
  inbox.add({ id: 'a' }, { source: 'codex', id: 'a' });
  inbox.save = () => { throw new Error('disk unavailable'); };
  assert.throws(() => inbox.acknowledge('a'));
  assert.ok(inbox.items.has('a'));
});
