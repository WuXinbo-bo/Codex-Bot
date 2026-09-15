const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/m1-activities'),R=require('../src/m1-rig'),S=A.Scores;
const {createExpressionController,createSeededRandom}=require('../src/expression-controller');
function harness(seed=61){
  let time=0,seq=0,diagnostics,behavior,randomControl;const timers=new Map(),calls=[],events=[];
  const c=createExpressionController({seed,random:createSeededRandom(seed),now:()=>time,setTimeout:(f,ms)=>{timers.set(++seq,{f,at:time+ms});return seq;},clearTimeout:id=>timers.delete(id),setExpression:(name,detail)=>calls.push({name,detail,at:time}),onPerformanceDiagnostics:fn=>diagnostics=fn,onBehaviorControl:fn=>behavior=fn,onRandomControl:fn=>randomControl=fn,onLifecycle:e=>events.push(e)});
  const advance=ms=>{const end=time+ms;for(;;){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;time=next[1].at;timers.delete(next[0]);next[1].f();}time=end;};
  return {c,advance,calls,events,read:()=>diagnostics(),configure:v=>behavior(v),random:v=>randomControl(v),pending:()=>timers.size};
}
test('180 complete scores cover 108 base expressions and all 45 retained props',()=>{
  assert.equal(Object.keys(S.meta).length,180);assert.equal(Object.keys(A.CLIPS).filter(id=>!id.startsWith('performance_companion_')).length,435);
  assert.equal(Object.keys(A.CLIPS).filter(id=>id.startsWith('performance_companion_')).length,35);
  assert.deepEqual(Object.values(S.meta).reduce((a,m)=>(a[m.type]=(a[m.type]||0)+1,a),{}),{emotion:96,task:36,panel:16,social:16,theater:12,continuation:4});
  const used=new Set(Object.values(S.clips).flat().map(f=>f.expression));
  for(const id of R.CORE_EXPRESSION_NAMES)assert.ok(used.has(id),id);
  assert.deepEqual(new Set(Object.values(S.meta).map(m=>m.prop).filter(Boolean)),new Set(R.ACCESSORIES));
  assert.equal(R.SYMBOLS.length,8);
  const fingerprints=new Set();
  for(const [id,m] of Object.entries(S.meta)){
    assert.equal(A.LABELS[id],m.label);assert.ok(A.CLIPS[id]);
    const signature=JSON.stringify(S.clips[id].map(f=>[f.expression,f.pose,f.operation]));assert.ok(!fingerprints.has(signature),id);fingerprints.add(signature);
  }
});
test('all score variants preserve duration, task effects, source data and clean exits',()=>{
  for(const [id,m] of Object.entries(S.meta)){
    const original=JSON.stringify(S.clips[id]);
    for(const variant of [0,1,2]){
      const frames=S.frames(id,variant);assert.equal(frames.reduce((n,f)=>n+f.duration,0),m.duration,id);
      assert.equal(frames[0].phase,'prepare');assert.equal(frames.at(-2).phase,'stow');assert.equal(frames.at(-1).phase,'exit');
      for(const f of frames){
        assert.ok(R.EXPRESSIONS[f.expression],f.expression);assert.ok(f.duration>0&&f.transition<=f.duration);
        const p=R.merge(R.getExpression(f.expression),f.pose);
        assert.deepEqual(p.effects,{complete:0,input:0,error:0});
        assert.ok(!JSON.stringify(p).includes('mouth'));
        assert.ok(Object.values(p.accessories).filter(v=>v.opacity>0).length<=1,id);
        assert.ok(Object.values(p.accessories).every(v=>Object.values(v).every(Number.isFinite)),id);
      }
      assert.deepEqual(frames.at(-1),S.clips[id].at(-1));
      assert.ok(Object.values(R.merge(R.getExpression(frames.at(-1).expression),frames.at(-1).pose).accessories).every(v=>v.opacity===0));
    }
    assert.equal(JSON.stringify(S.clips[id]),original);
    assert.notDeepEqual(S.frames(id,1),S.frames(id,2));
  }
});
test('every emotion and long story plays through production control with local beat clocks',()=>{
  for(const [id,m] of Object.entries(S.meta).filter(([,m])=>['emotion','theater','continuation'].includes(m.type)&&m.route!=='confirmation')){
    const h=harness();h.c.update(m.route,m.route==='running'?1:0,{quiet:true,taskId:'a'});h.c.interact('activity-request',{name:id});
    assert.equal(h.c.getState().activity?.name,id);h.advance(m.duration*1.3+500);
    assert.equal(h.read().activities.counts[id].completed,1,id);
    const calls=h.calls.filter(c=>c.detail.performanceId===id);
    assert.equal(calls.length,S.clips[id].length);assert.equal(new Set(calls.map(c=>c.detail.beatId)).size,calls.length);
    for(const call of calls){assert.ok(call.detail.beatMs>0);assert.deepEqual(call.detail.appearance,calls[0].detail.appearance);}
    h.c.stop();assert.equal(h.pending(),0);
  }
});
test('36 task scores are reachable from real lifecycle and running scheduling',()=>{
  const seen=new Set();
  for(const kind of ['started','completed','attention','failed','stopped']){
    const h=harness();h.c.update('idle',0,{quiet:true});
    for(let i=0;i<A.PERFORMANCES[kind].length*2;i++){
      h.c.interact('task-lifecycle',{events:[{id:kind+i,taskId:'a',turnId:String(i),kind}]});h.advance(180);
      const name=h.c.getState().activity?.name;seen.add(name);assert.equal(h.c.getState().activity?.priority,55);
      h.c.interact('panel-phase',{label:'toast',phase:'entering',duration:220});h.advance(250);
      h.c.interact('panel-phase',{label:'toast',phase:'visible',duration:0});assert.equal(h.c.getState().activity?.name,name);
      h.advance(8500);
    }
    h.c.stop();assert.equal(h.pending(),0);
  }
  const work=harness();work.c.update('running',1,{quiet:true});work.advance(6*3600000);
  for(const id of Object.keys(work.read().activities.counts))seen.add(id);
  for(const [id,m] of Object.entries(S.meta).filter(([,m])=>m.type==='task'))assert.ok(seen.has(id),id);
  assert.equal(work.events.length,0);work.c.stop();assert.equal(work.pending(),0);
});
test('all mouse and panel choreography groups are used by actual interaction events',()=>{
  const seen=new Set(),h=harness();h.c.update('idle',0,{quiet:true});
  for(const event of ['hover-dwell','ball-click','hold-ready','hold-release'])for(let i=0;i<240;i++){
    h.c.interact('pointer-leave');h.advance(5000);h.c.interact(event,{local:{x:.5,y:0}});if(h.c.getState().activity)seen.add(h.c.getState().activity.name);h.advance(6000);
  }
  for(const event of ['entering','panel-switch','panel-move'])for(let i=0;i<16;i++){
    if(event==='entering')h.c.interact('panel-phase',{phase:event,label:'panel',side:i%2?'left':'right',duration:220});else h.c.interact(event);
    seen.add(h.c.getState().activity?.name);h.advance(2000);
  }
  for(let i=0;i<100;i++){
    h.c.interact('task-lifecycle',{events:[{id:'confirm'+i,taskId:'a',turnId:String(i),kind:'completed'}]});h.advance(180);h.advance(8500);
    h.c.interact('completion-confirmed',{taskId:'a',turnId:String(i)});seen.add(h.c.getState().activity?.name);h.advance(20000);
  }
  for(const [id,m] of Object.entries(S.meta).filter(([,m])=>['panel','social'].includes(m.type)||m.route==='confirmation'))assert.ok(seen.has(id),id);
  h.c.stop();assert.equal(h.pending(),0);
});
test('a visible phase never truncates panel acting, and new task feedback preempts it',()=>{
  const h=harness();h.c.update('idle',0,{quiet:true});h.c.interact('panel-phase',{phase:'entering',label:'panel',side:'left'});
  const name=h.c.getState().activity.name;h.advance(220);h.c.interact('panel-phase',{phase:'visible',label:'panel'});assert.equal(h.c.getState().activity.name,name);
  h.c.interact('task-lifecycle',{events:[{id:'start',taskId:'a',kind:'started'}]});h.advance(180);
  assert.equal(h.c.getState().activity.priority,55);assert.equal(h.events.length,1);
  h.c.stop();assert.equal(h.pending(),0);
});
test('new routines release promptly on drag, state change, disabled randomness and reduced motion',()=>{
  for(const interrupt of ['drag','state','random','reduced']){
    const h=harness();h.c.update('idle',0,{quiet:true});h.c.interact('activity-request',{name:'activity_cube_edge'});h.advance(1500);
    if(interrupt==='drag')h.c.interact('drag-start');
    if(interrupt==='state')h.c.update('running',1,{taskId:'new',quiet:true});
    if(interrupt==='random'){h.c.stop();h.c.update('idle',0,{quiet:true});h.advance(20000);h.random(false);}
    if(interrupt==='reduced')h.c.setMotionLevel('reduced');
    assert.notEqual(h.c.getState().activity?.name,'activity_cube_edge');h.c.stop();assert.equal(h.pending(),0);
  }
});
test('continuations wait for a safe same-context boundary and can be disabled',()=>{
  const h=harness();h.c.update('idle',0,{quiet:true,taskId:'a'});h.c.interact('activity-request',{name:'activity_yoyo_early'});h.advance(12500);
  assert.equal(h.read().continuation?.name,'theater_activity_practice_again');h.advance(180000);
  assert.ok(h.calls.some(c=>c.detail.performanceId==='theater_activity_practice_again'));
  h.configure({stories:false});assert.equal(h.read().continuation,null);h.c.stop();assert.equal(h.pending(),0);
});

test('passive pointer movement does not cut an authored emotion score',()=>{
  const h=harness();h.c.update('idle',0,{quiet:true});h.c.interact('activity-request',{name:'activity_cube_edge'});h.advance(1500);
  for(const event of ['hover-enter','hover-move','hover-dwell','pointer-leave']){
    h.c.interact(event,{local:{x:.5,y:0}});assert.equal(h.c.getState().activity?.name,'activity_cube_edge');
  }
  h.advance(14000);assert.equal(h.read().activities.counts.activity_cube_edge.completed,1);h.c.stop();
});

test('articulated props retain their state between beats until explicitly closed',()=>{
  for(const id of ['activity_light_return','activity_notes_lines','performance_activity_compare_pages'])for(const variant of [0,1,2]){
    const frames=S.frames(id,variant),prop=S.meta[id].prop;
    for(const f of frames.slice(1,-2))assert.equal(f.pose.accessories[prop].open,1,id);
    assert.equal(frames.at(-2).pose.accessories[prop].open,0);
  }
  const fan=S.frames('activity_fan_pause');assert.equal(fan[1].pose.accessories.fan.open,0);assert.equal(fan[3].pose.accessories.fan.open,1);
});

test('interrupted continuation cannot cross task context or revive after disabling',()=>{
  for(const change of ['task','reduced','stories','random']){
    const h=harness();h.c.update('running',1,{quiet:true,taskId:'a'});h.c.interact('activity-request',{name:'activity_clip_edges'});h.advance(1000);
    if(change==='task')h.c.update('running',1,{quiet:true,taskId:'b'});
    if(change==='reduced')h.c.setMotionLevel('reduced');
    if(change==='stories')h.configure({stories:false});
    if(change==='random')h.random(false);
    h.c.interact('ball-click');assert.equal(h.read().continuation,null,change);h.c.stop();
  }
});

test('rolling ambient budget includes in-flight activity and bounds work and idle playback',()=>{
  for(const [route,limit] of [['running',90000],['idle',150000]]){
    const h=harness();h.c.update(route,route==='running'?1:0,{quiet:true});let peak=0;
    for(let i=0;i<1800;i++){
      h.advance(1000);const played=h.read().activities.ambientMs;peak=Math.max(peak,played);assert.ok(played<=limit+1,route+' '+played);
    }
    assert.ok(peak>30000,route);h.c.stop();
  }
});

test('confirmation replaces the original prop instead of merging two props',()=>{
  for(const prop of R.ACCESSORIES)for(const side of ['left','right']){
    const frames=S.panelFrames('theater_activity_take_delivery',side,prop);
    for(const f of frames.slice(0,-1))assert.deepEqual(Object.keys(f.pose.accessories),[prop]);
    assert.ok(Object.values(R.merge(R.getExpression(frames.at(-1).expression),frames.at(-1).pose).accessories).every(p=>p.opacity===0));
  }
});
