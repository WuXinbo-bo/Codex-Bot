const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/base-emotions.js'),Rig=require('../src/m1-rig.js'),A=require('../src/appearance.js');
const {createExpressionController,createSeededRandom,weightedPick}=require('../src/expression-controller.js');
test('108 authored base scores cover 24 families, 12 mixed thoughts and 18 explicit accents',()=>{
  assert.equal(Object.keys(E.families).length,24);assert.equal(Object.keys(E.entries).length,108);
  assert.equal(Object.values(E.entries).filter(e=>e.mixed).length,12);assert.equal(E.accentNames.length,18);
  const seen=new Set(),accents=new Set();
  for(const [id,e] of Object.entries(E.entries)){
    assert.ok(Object.isFrozen(e.pose));assert.equal(e.id,id);assert.ok(E.families[e.family]);
    const pose=Rig.getExpression(id),geometry=JSON.stringify({...pose,accents:{}});
    assert.ok(!seen.has(geometry),'duplicate pose '+id);seen.add(geometry);
    assert.ok(!/mouth|NaN|Infinity|undefined/.test(geometry));
    assert.ok(Object.values(pose.accessories).every(p=>p.opacity===0));assert.ok(Object.values(pose.effects).every(v=>v===0));
    assert.ok(Object.keys(e.pose.accents).length<=2);
    Object.keys(e.pose.accents).forEach(key=>{assert.ok(E.accentNames.includes(key));accents.add(key);});
    assert.ok(e.pose.micro.at>=0&&e.pose.micro.at+e.pose.micro.span<1);
  }
  assert.equal(accents.size,18);for(const group of Object.values(E.families))assert.equal(group.items.length,4);
});
test('base eye emotion survives all 15 drawing styles, not just classic eyes',()=>{
  for(const id of Object.keys(E.entries))for(const eyeStyle of A.EYE_STYLES){
    const pose=Rig.getExpression(id),config=A.eyeConfig(id,{eyeStyle},pose.eyeStyle),styled=Rig.styleEyes(pose,config);
    assert.deepEqual(styled.gaze,pose.gaze);assert.deepEqual(config.mood,{});assert.equal(config.design.tear,undefined);
    for(const side of ['left','right']){
      assert.equal(styled.eyes[side].closed,pose.eyes[side].closed);assert.equal(styled.eyes[side].upper,pose.eyes[side].upper);assert.equal(styled.eyes[side].arc,pose.eyes[side].arc);
    }
  }
});
test('seeded director reaches every score in legal contexts with bounded history and no consecutive repetition',()=>{
  let t=0;const d=E.createDirector({now:()=>t,random:createSeededRandom(44)}),seen=new Set();let previous;
  for(const status of Object.keys(E.routes))for(const social of ['neutral','pleased','wary'])for(const feeling of ['settled','satisfied','playful'])for(let i=0;i<500;i++){
    t+=10000;const context={social,feeling,fatigue:i>300,sleep:i>400};
    const id=d.choose(status,context);assert.ok(E.eligible(status,context).some(e=>e.id===id));assert.notEqual(id,previous);previous=id;seen.add(id);
  }
  assert.equal(seen.size,108);assert.ok(d.snapshot().events.length<=100);assert.ok(d.snapshot().recent.length<=12);
});
test('context gates prevent random fatigue, blame, victory and despair at work',()=>{
  for(const status of ['running','queued','needs_attention','unknown'])for(const social of ['neutral','pleased','wary'])for(const feeling of ['satisfied','concerned','playful','impatient']){
    const pool=E.eligible(status,{social,feeling,fatigue:true,sleep:true});assert.ok(pool.length>=8);
    assert.ok(pool.every(e=>!['happy','proud','sad','sulky','sleepy','embarrassed'].includes(e.family)));
  }
  assert.ok(E.eligible('idle').every(e=>e.family!=='sleepy'&&e.family!=='proud'));
  assert.ok(E.eligible('offline',{fatigue:true,sleep:true}).every(e=>e.family==='sleepy'));
});
test('small legacy pools never immediately repeat even when history covers the pool',()=>{
  assert.equal(weightedPick(['a','b'],()=>.99,['a','b']),'a');assert.equal(weightedPick(['a'],()=>0,['a']),'a');
});
function harness(){
  let time=0,seq=0,read,toggle;const timers=new Map(),calls=[];
  const c=createExpressionController({seed:88,now:()=>time,setTimeout:(f,ms)=>{timers.set(++seq,{f,at:time+ms});return seq;},clearTimeout:id=>timers.delete(id),setExpression:(id,detail)=>calls.push({id,detail}),onPerformanceDiagnostics:fn=>read=fn,onRandomControl:fn=>toggle=fn});
  const advance=ms=>{const end=time+ms;for(;;){const item=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!item||item[1].at>end)break;time=item[1].at;timers.delete(item[0]);item[1].f();}time=end;};
  return {c,calls,advance,read:()=>read(),toggle:v=>toggle(v),pending:()=>timers.size};
}
test('actual controller restores emotional variants and bounds timers without replacing lifecycle or drag',()=>{
  const h=harness(),seen=new Set();h.c.update('running',1,{quiet:true});
  for(let i=0;i<10;i++){
    const id=h.c.getCurrent();assert.ok(E.entries[id]);seen.add(id);
    const call=h.calls.at(-1);assert.ok(call.detail.performanceMs>=6000&&call.detail.performanceMs<=12000);assert.equal(call.detail.duration,550);
    h.c.interact('refresh-start');h.c.interact('refresh-success');h.advance(550);
  }
  assert.ok(seen.size>=4);assert.equal(h.read().base.current,h.c.getCurrent());
  h.c.interact('task-lifecycle',{events:[{id:'done',kind:'completed',taskId:'a'}]});h.advance(180);
  assert.equal(h.c.getState().activity.priority,55);const clip=h.c.getState().activity.name;
  h.c.interact('panel-phase',{label:'toast',phase:'entering'});assert.equal(h.c.getState().activity.name,clip);
  h.c.interact('drag-start');h.advance(9000);assert.ok(h.c.getState().transient.priority>=70);
  h.c.interact('drag-end',{releaseSpeed:0});h.c.stop();assert.equal(h.pending(),0);
});
test('random off and reduced motion have separate contracts',()=>{
  const h=harness();h.c.update('running',1,{quiet:true});h.c.setMotionLevel('reduced');h.advance(30000);
  assert.ok(E.entries[h.c.getCurrent()]);assert.equal(h.c.getState().activity,null);
  h.toggle(false);h.advance(30000);assert.equal(h.c.getCurrent(),'focus');h.c.stop();assert.equal(h.pending(),0);
});
test('base rotation holds 6-12 seconds and never uses the old 2.3-second transient loop',()=>{
  const h=harness();h.c.update('unknown',0,{quiet:true});let previous=h.c.getCurrent(),changedAt=0;
  for(let t=100;t<=120000;t+=100){
    h.advance(100);assert.equal(h.c.getState().transient,null);
    const id=h.c.getCurrent();
    if(id!==previous){assert.ok(t-changedAt>=6000&&t-changedAt<=12100);changedAt=t;previous=id;}
  }
  assert.ok(h.read().base.recent.length>=8);h.c.stop();assert.equal(h.pending(),0);
});
