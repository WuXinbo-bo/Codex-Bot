const test=require('node:test'),assert=require('node:assert/strict');
const {Companion,GAMES}=require('../src/companion-system.js');
const Performances=require('../src/companion-performances.js');
function setup(saved){let time=1000000;const c=new Companion(saved,{now:()=>time,random:()=>.2});return {c,advance:n=>time+=n};}
test('legacy saved tools and living space cannot reappear',()=>{
  const {c}=setup({enabled:true,mouse:false,space:'plant',timer:{until:1},notes:[{text:'old'}],alerts:[{title:'old'}],pinned:'task'});
  assert.deepEqual(c.export(),{enabled:true,mouse:false});
  assert.deepEqual(c.snapshot(),{enabled:true,mouse:false,game:null,lastResult:''});
  for(const action of ['focus','timer','note','pin','water','sleep','wake','ack'])assert.throws(()=>c.command(action,{}),/未知陪伴操作/);
  c.command('preferences',{space:'plant'});assert.deepEqual(c.export(),{enabled:true,mouse:false});
  c.command('preferences',{enabled:false,mouse:true});assert.deepEqual(c.export(),{enabled:false,mouse:true});
});
test('only mouse, games and task-panel performances remain',()=>{
  assert.deepEqual(Object.keys(Performances.clips).sort(),['panel_receive','panel_stamp','panel_file','pet','tap_guard','orbit','dodge','land','edge','game_hit','game_proud'].map(id=>'performance_companion_'+id).sort());
  for(const frames of Object.values(Performances.clips))assert.ok(frames.length>=2&&frames.every(f=>f.duration>=400&&f.pose));
  assert.equal(GAMES.length,12);
});
test('twelve bounded games end on task progress and expire on time',()=>{
  for(const game of GAMES){const {c,advance}=setup();c.startGame(game.id);assert.ok(c.game.ends-c.game.started<=30000);advance(31000);c.tick();assert.equal(c.game,null);}
  const {c}=setup();c.startGame('catch');c.lifecycle([{id:'new',kind:'started'}]);assert.equal(c.game,null);
  c.command('preferences',{enabled:false});assert.throws(()=>c.startGame('catch'),/开启/);
  c.command('preferences',{enabled:true});c.startGame('random');const first=c.game.id;c.startGame('random');assert.notEqual(first,c.game.id);
});
test('all twelve games reward actual hits without rapid-fire scoring',()=>{
  for(const id of GAMES.map(g=>g.id)){
    const {c,advance}=setup();c.startGame(id);const v=c.gameView();
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
