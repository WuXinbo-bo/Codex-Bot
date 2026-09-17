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
test('completion inbox replaces older turns and persists one reminder per task', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metabot-inbox-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'inbox.json');
  const inbox = new CompletionInbox(file);
  for (const id of ['a', 'b']) inbox.add({ id, title: id, turnId: id }, { source: 'codex', id: 'same-thread' });
  inbox.add({ id: 'a', title: 'duplicate' }, { source: 'codex', id: 'same-thread' });
  const resumed = new CompletionInbox(file);
  assert.equal(resumed.items.size, 1);
  assert.equal(resumed.items.get('b').title, 'b');
  assert.equal(resumed.acknowledge('a'),false);
  resumed.acknowledge('b');
  assert.deepEqual([...new CompletionInbox(file).items.keys()], []);
});

test('legacy migration keeps the newest completion and never merges tasks by title',()=>{
  const inbox=new CompletionInbox();
  const item=(id,source,taskId,time)=>({id,receivedAt:time,title:'Same title',task:{source,id:taskId}});
  inbox.restore([item('new','codex','a',20),item('old','codex','a',10),item('other','codex','b',10),item('source','workbench','a',10)]);
  assert.deepEqual([...inbox.items.keys()],['new','other','source']);
  inbox.add({id:'late',receivedAt:5},{source:'codex',id:'a'});assert.equal(inbox.items.size,3);assert.ok(inbox.items.has('new'));
});

test('failed replacement restores the previous unconfirmed completion',()=>{
  const inbox=new CompletionInbox();inbox.add({id:'old'},{source:'codex',id:'a'});
  inbox.save=()=>{throw Error('disk unavailable');};
  assert.throws(()=>inbox.add({id:'new'},{source:'codex',id:'a'}));
  assert.deepEqual([...inbox.items.keys()],['old']);
});
test('failed persistence does not silently acknowledge a completion', () => {
  const inbox = new CompletionInbox();
  inbox.add({ id: 'a' }, { source: 'codex', id: 'a' });
  inbox.save = () => { throw new Error('disk unavailable'); };
  assert.throws(() => inbox.acknowledge('a'));
  assert.ok(inbox.items.has('a'));
});
