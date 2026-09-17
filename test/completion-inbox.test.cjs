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

test('authoritative continuation retires old completion across same-turn and new-turn runs',()=>{
  const key=JSON.stringify(['codex','a']);
  for(const turn of ['one','two']){
    const inbox=new CompletionInbox();
    inbox.add({id:'done',turnId:'one',eventAt:'2026-09-17T00:00:00Z'},{source:'codex',id:'a'});
    const saved={[key]:{eventId:JSON.stringify([turn,'running','2026-09-17T00:00:01Z']),retiredTurns:turn==='two'?['one']:[]}};
    assert.equal(inbox.discardSuperseded(saved),true);
    assert.equal(inbox.items.size,0);
    assert.equal(inbox.add({id:'done',turnId:'one'},{source:'codex',id:'a'}),false);
    inbox.add({id:'latest',turnId:turn,eventAt:'2026-09-17T00:00:02Z'},{source:'codex',id:'a'});
    inbox.discardSuperseded(saved);assert.ok(inbox.items.has('latest'));
  }
});

test('migration removes superseded completions but keeps missing, unknown and older evidence',()=>{
  const key=JSON.stringify(['codex','a']);
  const item={id:'done',turnId:'one',eventAt:'2026-09-17T00:00:00Z',task:{source:'codex',id:'a'}};
  const inbox=new CompletionInbox();
  for(const saved of [{},{[key]:{eventId:'invalid'}},{[key]:{eventId:'null'}},{[key]:{eventId:JSON.stringify(['one','unknown','2026-09-17T00:00:01Z'])}},{[key]:{eventId:JSON.stringify(['one','running','2026-09-16T00:00:00Z'])}}]){
    inbox.restore([item]);assert.equal(inbox.discardSuperseded(saved),false);assert.equal(inbox.items.size,1);
  }
  assert.equal(inbox.discardSuperseded({[key]:{eventId:JSON.stringify(['one','running','2026-09-17T00:00:01Z'])}}),true);
});

test('superseded completion save failure keeps the original durable inbox for retry',()=>{
  const inbox=new CompletionInbox();inbox.add({id:'done',turnId:'one'},{source:'codex',id:'a'});
  inbox.save=()=>{throw Error('disk unavailable');};
  assert.throws(()=>inbox.discardSuperseded({[JSON.stringify(['codex','a'])]:{retiredTurns:['one']}}));
  assert.ok(inbox.items.has('done'));
});
