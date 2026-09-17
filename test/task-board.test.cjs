const test=require('node:test');
const assert=require('node:assert/strict');
const {TaskBoard,cardId}=require('../shared/task-board.cjs');
const key=JSON.stringify(['codex','a']);
const entry=(status='running',turnId='one')=>({key,eventId:status+turnId,active:status==='running',fresh:true,unread:status!=='running',task:{source:'codex',id:'a',title:'A',status,turnId}});
const completion={id:'done-one',taskId:key,turnId:'one',title:'A',task:{source:'codex',id:'a',turnId:'one'}};
test('transient display consumes only visible unpaused time and never deletes an active task',()=>{
  let now=0;const b=new TaskBoard(()=>now),view={tasks:[entry()]};
  b.push([{id:'start',kind:'started',taskId:key,turnId:'one'}]);
  assert.equal(b.view(view,[]).rows.length,1);
  now=20000;b.tick(false,false);assert.equal(b.notices.size,1);
  b.presented.add(cardId(key,'one'));now+=3000;b.tick(true,false);
  now+=10000;b.tick(true,true);assert.equal(b.notices.size,1);
  now+=1000;b.tick(true,false);assert.equal(b.view(view,[]).rows.length,0);
  assert.equal(b.view(view,[],{manual:true}).rows.length,1);
});
test('completion uses the same card identity, survives all clocks and remains in settings',()=>{
  const b=new TaskBoard(()=>1),view={tasks:[entry('completed')]};
  const row=b.view(view,[completion]).rows[0];
  assert.equal(row.id,cardId(key,'one'));assert.deepEqual(row.actions,['ack','open']);
  b.dismissTransient();b.tick(true,false);
  assert.equal(b.view(view,[completion],{settings:true}).rows[0].completionId,completion.id);
  assert.equal(b.view(view,[completion],{retain:false}).rows.length,0);
  assert.equal(b.view(view,[completion]).rows.length,1);
});
test('a new turn reuses and retains the unacknowledged task card without completed actions',()=>{
  const b=new TaskBoard();const rows=b.view({tasks:[entry('running','two')]},[completion],{manual:true}).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].id,cardId(key,'one'));
  assert.equal(rows[0].status,'running');assert.equal(rows[0].persistent,true);assert.equal(rows[0].completionId,undefined);
  assert.deepEqual(rows[0].actions,['copy','open']);
  b.dismissTransient();assert.equal(b.view({tasks:[entry('running','two')]},[completion],{settings:true}).rows.length,1);
});

test('new completion replaces retained turn with latest actions and old timers cannot hide it',()=>{
  const b=new TaskBoard();const next={...completion,id:'done-two',turnId:'two',receivedAt:10};
  const old=b.view({tasks:[entry('completed')]},[completion]).rows[0];
  const row=b.view({tasks:[entry('completed','two')]},[completion,next]).rows[0];
  assert.equal(row.id,old.id);assert.notEqual(row.eventId,old.eventId);assert.equal(row.completionId,'done-two');
  assert.deepEqual(row.actions,['ack','open']);
  b.tick(true,false);assert.equal(b.view({tasks:[]},[completion,next]).rows.length,1);
});

test('same-turn rerun cannot expose the old completion controls before its new record arrives',()=>{
  const b=new TaskBoard();b.push([{id:'new-completion',kind:'completed',taskId:key,turnId:'one'}]);
  const row=b.view({tasks:[entry('completed')]},[completion]).rows[0];
  assert.equal(row.saving,true);assert.equal(row.completionId,undefined);
});

test('retained completion never masks pause, failure, attention or uncertain running state',()=>{
  const b=new TaskBoard();
  for(const status of ['running','queued','paused','needs_attention','failed','stopped','unknown']){
    const row=b.view({tasks:[entry(status,'two')]},[completion]).rows[0];
    assert.equal(row.status,status);assert.equal(row.completionId,undefined);
  }
  assert.equal(b.view({tasks:[entry('running','two')]},[completion],{retain:false}).rows.length,0);
});
test('failed stopped and attention persist, stale evidence cannot silently remove them',()=>{
  const b=new TaskBoard();
  for(const status of ['failed','stopped','needs_attention']){
    const e=entry(status);e.fresh=false;
    assert.equal(b.view({tasks:[e]},[]).rows[0].persistent,true);
    e.snoozedUntil=10;assert.equal(b.view({tasks:[e]},[]).rows.length,0);
  }
});
test('same-task transitions coalesce and missing or terminal tasks cancel stale transients',()=>{
  const b=new TaskBoard();b.push([{id:'start',kind:'started',taskId:key,turnId:'one'},{id:'resume',kind:'resumed',taskId:key,turnId:'one'}]);
  assert.equal(b.notices.size,1);assert.equal(b.view({tasks:[entry()]},[]).rows[0].kind,'resumed');
  b.push([{id:'resume',kind:'resumed',taskId:key,turnId:'one'}]);
  b.view({tasks:[entry('completed')]},[completion]);assert.equal(b.notices.size,0);
  b.push([{id:'next',kind:'started',taskId:key,turnId:'two'}]);b.view({tasks:[]},[]);assert.equal(b.notices.size,0);
});
test('poll timestamp churn and transient expiry cannot replay card entry animations',()=>{
  const b=new TaskBoard();const e=entry();
  const first=b.view({tasks:[e]},[],{manual:true}).rows[0].eventId;
  e.eventId='later-poll';assert.equal(b.view({tasks:[e]},[],{manual:true}).rows[0].eventId,first);
  b.push([{id:'start-event',kind:'started',taskId:key,turnId:'one'}]);b.dismissTransient();
  assert.equal(JSON.parse(b.view({tasks:[e]},[],{manual:true}).rows[0].eventId)[3],'start-event');
});
