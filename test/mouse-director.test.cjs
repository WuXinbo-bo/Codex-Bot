const test=require('node:test'),assert=require('node:assert/strict');
const {Director}=require('../src/mouse-director');
const P=require('../src/mouse-performances'),Rig=require('../src/m1-rig');
function setup({accepted=true,status='idle'}={}){
  let time=10000;const played=[],context={enabled:true,status};
  const d=new Director({now:()=>time,random:()=>0,context:()=>context,play:v=>{if(!accepted)return false;played.push(v);return true;}});
  return {d,played,context,advance:ms=>{time+=ms;},allow:v=>accepted=v,move:(x,y,ms=100,extra={})=>{time+=ms;d.input({type:'hover-move',mousePoint:{x,y,inBody:true,...extra}});}};
}
test('thirty different mouthless scores cover ten groups and mirror without mutation',()=>{
  assert.equal(Object.keys(P.groups).length,10);assert.equal(Object.keys(P.clips).length,30);
  const signatures=new Set();
  for(const [name,frames] of Object.entries(P.clips)){
    assert.equal(P.groups[Object.keys(P.groups).find(g=>P.groups[g].includes(name))].length,3);
    assert.ok(frames.reduce((s,f)=>s+f.duration,0)>=2000);
    signatures.add(JSON.stringify(frames));const source=JSON.stringify(frames);
    for(const side of ['left','right'])for(const frame of P.frames(name,{side,busy:true})){
      assert.ok(Rig.EXPRESSIONS[frame.expression],frame.expression);
      for(const arm of Object.values(frame.pose.arms))assert.ok(arm&&Number.isFinite(arm.x));
      assert.deepEqual(frame.pose.effects,{complete:0,input:0,error:0});
    }
    assert.equal(JSON.stringify(frames),source);
  }
  assert.equal(signatures.size,30);
});
test('actual strokes trigger petting; stationary head hover never counts as a stroke',()=>{
  const h=setup();h.move(50,30);h.advance(900);h.d.tick();assert.ok(h.played.every(e=>e.group!=='pet'));
  h.advance(8000);for(const x of [45,53,62,70,62,53,45,53])h.move(x,30,110);
  assert.ok(h.played.some(e=>e.group==='pet'));
  h.advance(2800);h.d.tick();assert.equal(h.d.snapshot().chain?.count,2);
  h.advance(10000);h.d.tick();assert.equal(h.d.snapshot().chain,null);
});
test('tickling, mirrored gestures and circular paths have distinct recognizers',()=>{
  let h=setup();for(const y of [52,66,80,66,52,66,80])h.move(105,y,85);assert.ok(h.played.some(e=>e.group==='tickle'));
  h=setup();for(const x of [20,45,70,95,70,45,20,45,70])h.move(x,108,100);assert.ok(h.played.some(e=>e.group==='mirror'));
  h=setup();for(let i=0;i<=28;i++){const a=i*Math.PI*2/28;h.move(64+65*Math.cos(a),64+65*Math.sin(a),45);}assert.ok(h.played.some(e=>e.group==='orbit'));
});
test('failed playback consumes neither cooldown nor variant; accepted variants rotate',()=>{
  const h=setup({accepted:false});assert.equal(h.d.emit('pet'),false);assert.equal(h.d.snapshot().accepted,0);
  h.allow(true);assert.equal(h.d.emit('pet'),true);for(let i=0;i<5;i++){h.advance(10000);h.d.emit('pet');}
  assert.equal(new Set(h.played.map(e=>e.name)).size,3);
  for(let i=1;i<h.played.length;i++)assert.notEqual(h.played[i].name,h.played[i-1].name);
});
test('a stationary pointer does not cause endless catch games; a hand click completes the invitation',()=>{
  let h=setup();h.move(65,65);h.advance(1500);h.d.tick();assert.equal(h.played.at(-1).group,'catch');
  h.advance(15000);h.d.tick();assert.equal(h.played.length,1);
  h=setup();h.move(10,40);h.advance(1300);h.d.tick();assert.equal(h.played.at(-1).name,'performance_mouse_five');
  h.d.input({type:'press',mousePoint:{x:20,y:25,hand:'left'}});h.d.input({type:'ball-click'});assert.equal(h.played.at(-1).name,'performance_mouse_bump');
});
test('task progress, quiet and disabled preferences cancel chains; work uses small reactions',()=>{
  const h=setup();h.d.emit('pet');h.d.input({type:'task-lifecycle'});assert.equal(h.d.snapshot().chain,null);
  h.context.quiet=true;h.advance(10000);assert.equal(h.d.emit('pet'),false);h.d.input({type:'hover-move',ballPoint:{x:50,y:25}});assert.equal(h.d.snapshot().samples,0);
  h.context.quiet=false;h.context.status='running';assert.equal(h.d.emit('catch'),false);assert.equal(h.d.emit('pet'),true);assert.equal(h.played.at(-1).busy,true);
  h.context.enabled=false;h.d.input({type:'hover-move',ballPoint:{x:50,y:25}});assert.equal(h.d.snapshot().chain,null);
});

test('a task interruption cannot resume an old stationary invitation',()=>{
  const h=setup();h.move(65,65);h.advance(1500);h.d.tick();assert.equal(h.played.length,1);
  h.d.interrupt();h.advance(12000);h.d.tick();assert.equal(h.played.length,1);assert.equal(h.d.snapshot().chain,null);
  h.move(85,65);h.advance(1600);h.d.tick();assert.equal(h.played.length,2);
});
test('press and drag never initiate entertainment; release chooses a contextual landing',()=>{
  const h=setup();h.d.input({type:'press',ballPoint:{x:40,y:60}});assert.equal(h.d.emit('pet'),false);
  h.d.input({type:'drag-start'});assert.equal(h.d.emit('pet'),false);
  h.d.input({type:'drag-end',edgeHit:true,edgeDirection:'right'});assert.equal(h.played.at(-1).name,'performance_mouse_edge');assert.equal(h.played.at(-1).side,'right');
});

test('continuous response follows direction, decays on pause and stops for menu or urgent tasks',()=>{
  const h=setup();h.move(35,25);h.d.emit('pet');assert.equal(h.d.response().kind,'pet');assert.ok(h.d.response().x<0);
  h.move(85,25);assert.ok(h.d.response().x>0);h.advance(2800);assert.equal(h.d.response().intensity,0);
  h.context.menu=true;assert.equal(h.d.response(),null);assert.equal(h.d.emit('pet'),false);
  h.advance(10000);assert.equal(h.d.command('greet'),true);assert.equal(h.played.at(-1).explicit,true);
  h.context.status='needs_attention';assert.equal(h.d.command('greet'),false);assert.equal(h.d.response(),null);
});
