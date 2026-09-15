const test=require('node:test'),assert=require('node:assert/strict');
const {Companion,GAMES,SPACES,turnKey}=require('../src/companion-system.js');
const Performances=require('../src/companion-performances.js');
function setup(saved){let time=1000000;const c=new Companion(saved,{now:()=>time,random:()=>.2});return {c,advance:n=>time+=n};}
function entry(turn='a',status='running'){return {key:'task',active:status==='running',fresh:true,unread:false,task:{source:'codex',id:'x',turnId:turn,title:'修复测试',status}};}
test('notes attach to a turn; completion delivers once and never removes a new turn note',()=>{
  const {c}=setup();const a=entry();c.update({tasks:[a]});c.command('note',{key:'task',text:'检查测试'});
  const b=entry('b');c.update({tasks:[b]});c.command('note',{key:'task',text:'检查构建'});
  const done=entry('a','completed'),ev={id:'done',kind:'completed',taskId:'task'};
  c.lifecycle([ev],new Map([['task',done]]));c.lifecycle([ev],new Map([['task',done]]));
  assert.equal(c.state.alerts.length,1);assert.equal(c.state.notes[0].turn,turnKey(b.task));assert.equal(c.state.history.length,1);
});
test('persistent timers expire once after restart and cancellation prevents alerts',()=>{
  const {c,advance}=setup();c.command('timer',{minutes:1});c.command('focus',{minutes:1});advance(61000);
  const restored=new Companion(c.export(),{now:c.now});assert.equal(restored.tick(),true);assert.equal(restored.state.alerts.length,2);assert.equal(restored.tick(),false);
  restored.command('timer',{minutes:1});restored.command('timer',{minutes:0});advance(61000);restored.tick();assert.equal(restored.state.alerts.length,2);
});
test('work opening occurs once per day; task types, recovery and long waits choose distinct performances',()=>{
  const {c,advance}=setup();const a=entry();const events=kind=>{const ev={id:kind+Date.now()+c.now(),kind,taskId:'task'};c.lifecycle([ev],new Map([['task',a]]));return ev;};
  assert.equal(events('started').companionCue,'work_open');assert.equal(events('joined').companionCue,'work_join');events('failed');assert.equal(events('completed').companionCue,'work_recovered');
  a.task.turnId='b';events('started');advance(301000);assert.equal(events('completed').companionCue,'work_relief');
});
test('twelve actual input games are bounded and lifecycle interrupts them',()=>{
  assert.equal(GAMES.length,12);
  for(const game of GAMES){const {c,advance}=setup();c.startGame(game.id);assert.ok(c.game.ends-c.game.started<=30000);advance(31000);c.tick();assert.equal(c.game,null);}
  const {c}=setup();c.startGame('catch');c.lifecycle([{id:'s',kind:'started',taskId:'task'}],new Map([['task',entry()]]));assert.equal(c.game,null);
  c.command('focus',{minutes:25});assert.throws(()=>c.startGame('catch'));c.command('focus',{minutes:0});c.command('sleep');assert.throws(()=>c.startGame('catch'));
});
test('all twelve games reward valid input and timing; spamming cannot score',()=>{
  for(const id of GAMES.map(g=>g.id)){
    const {c,advance}=setup();c.startGame(id);let v=c.gameView();
    if(id==='catch')c.input({kind:'click',x:v.target,y:50});
    if(id==='hands'){advance(1000);c.input({kind:'click',x:(c.game.round+Math.floor(c.game.seed*10))%2?75:25,y:50});}
    if(id==='mirror')c.input({kind:'move',x:100-v.target,y:50});
    if(id==='balance')c.input({kind:'move',x:50,y:50});
    if(id==='stretch'||id==='water'){c.input({kind:'down',x:50,y:50});advance(id==='water'?1500:2200);c.input({kind:'up',x:50,y:50});}
    if(id==='trace')c.input({kind:'click',x:20,y:25});
    if(id==='five'){advance(1200);c.input({kind:'click',x:50,y:50});}
    if(id==='rhythm')c.input({kind:'click',x:50,y:50});
    if(id==='sort')c.input({kind:'click',x:20,y:50});
    if(id==='stack')c.input({kind:'click',x:50,y:50});
    if(id==='plane'){c.input({kind:'down',x:20,y:50});c.input({kind:'up',x:80,y:50});}
    assert.equal(c.game.score,1,id);for(let i=0;i<10;i++)c.input({kind:'click',x:50,y:50});assert.equal(c.game.score,1,id+' spam');
  }
});
test('spaces and props have authored robot choreography; state and random choices are bounded',()=>{
  for(const space of Object.keys(SPACES))assert.ok(Performances.clips['performance_companion_space_'+space]);
  for(const frames of Object.values(Performances.clips)){assert.ok(frames.length>=2);assert.ok(frames.every(f=>f.duration>=400&&f.pose));}
  const {c}=setup();c.startGame('random');const first=c.game.id;c.startGame('random');assert.notEqual(first,c.game.id);
  for(let i=0;i<100;i++)c.alert(String(i),'test');assert.equal(c.state.alerts.length,30);
});
