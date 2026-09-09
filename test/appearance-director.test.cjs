const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../src/appearance.js');
const {createSeededRandom,createExpressionController}=require('../src/expression-controller.js');

test('automatic defaults and legacy migration preserve deliberate overrides and accessibility',()=>{
  const a=A.migrate({artStyle:'classic',skin:'lemon',motion:'reduced'});
  assert.equal(a.artStyle,'auto');assert.equal(a.eyeStyle,'auto');assert.equal(a.skin,'lemon');assert.equal(a.reducedMotion,true);
  assert.deepEqual(A.migrate(a),a);
  assert.equal(A.migrate({artStyle:'clay',eyeStyle:'anime',shape:'star'}).artStyle,'clay');
  assert.equal(A.migrate({schemaVersion:2,artStyle:'classic'}).artStyle,'classic');
  for(const companionMode of Object.keys(A.COMPANION_MODES)){
    const p=A.normalize({companionMode});assert.equal(p.personality,A.COMPANION_MODES[companionMode].personality);
    assert.equal(A.normalize({...p,reducedMotion:true}).motion,'reduced');
    assert.equal(A.normalize({...p,reducedMotion:false}).motion,A.COMPANION_MODES[companionMode].motion);
  }
});

test('automatic dimensions have bounded holds and only one changes at a safe boundary',()=>{
  let time=0;const d=A.createDirector({skin:'auto'},{now:()=>time,random:createSeededRandom(32)});
  d.sample();const start=d.snapshot();
  for(const [key,[min,max]] of Object.entries({artStyle:[120000,300000],eyeStyle:[30000,90000],shape:[10000,20000],skin:[180000,480000]}))assert.ok(start.due[key]>=min&&start.due[key]<=max);
  time=9999;d.sample();assert.deepEqual(d.snapshot().current,start.current);
  time=600000;d.sample({blocked:true});assert.deepEqual(d.snapshot().current,start.current);
  d.sample({boundary:false});assert.deepEqual(d.snapshot().current,start.current);
  d.sample();assert.equal(Object.keys(start.current).filter(k=>start.current[k]!==d.snapshot().current[k]).length,1);
});

test('weighted coverage visits every automatic style, base eye, shape and skin without immediate repeats',()=>{
  let time=0;const d=A.createDirector({skin:'auto',shape:'random'},{now:()=>time,random:createSeededRandom(914)});
  let last={};
  for(let i=0;i<2500;i++){
    time+=8000;const before=d.snapshot().events.at(-1);d.sample();const event=d.snapshot().events.at(-1);
    if(event&&event!==before&&event.at===time){assert.notEqual(last[event.key],event.value);last[event.key]=event.value;}
  }
  const counts=d.snapshot().counts;
  assert.equal(Object.keys(counts.artStyle).length,4);assert.equal(Object.keys(counts.eyeStyle).length,8);
  assert.equal(Object.keys(counts.shape).length,18);assert.equal(Object.keys(counts.skin).length,8);
  assert.equal(d.snapshot().preferences.artStyle,'auto');assert.equal(d.snapshot().preferences.skin,'auto');
});

test('fixed choices remain stable but base eye drawings still express task emotions',()=>{
  const fixed={artStyle:'clay',eyeStyle:'anime',shape:'star',skin:'pink'};
  const d=A.createDirector(fixed,{random:createSeededRandom(1)});
  for(let i=0;i<50;i++){const resolved=d.sample({force:true});for(const key of Object.keys(fixed))assert.equal(resolved[key],fixed[key]);}
  assert.equal(A.eyeConfig('deep_focus',fixed).baseId,'anime');assert.equal(A.eyeConfig('deep_focus',fixed).emotion,'focus');
  d.configure({...fixed,artStyle:'auto'});assert.ok(A.ART_STYLES[d.sample().artStyle]);assert.equal(d.snapshot().preferences.eyeStyle,'anime');
});

test('reduced motion pauses automatic rotations without disabling explicit preview or fixed settings',()=>{
  let time=0;const d=A.createDirector({reducedMotion:true},{now:()=>time,random:createSeededRandom(1)});
  d.sample();const before=d.snapshot().current;time=900000;d.sample();assert.deepEqual(d.snapshot().current,before);
  d.sample({force:true});assert.notEqual(d.snapshot().current.artStyle,before.artStyle);
  d.configure({reducedMotion:true,artStyle:'clay'});assert.equal(d.sample().artStyle,'clay');
});

test('real expression controller holds resolved appearance across every frame of a long performance',()=>{
  let time=0,id=0,read;const timers=new Map(),frames=[];
  const controller=createExpressionController({seed:44,now:()=>time,appearanceNow:()=>time*100,
    setTimeout:(fn,delay)=>{timers.set(++id,{fn,at:time+delay});return id;},clearTimeout:id=>timers.delete(id),
    onPerformanceDiagnostics:fn=>read=fn,setExpression:(name,options)=>frames.push({name,...options})});
  controller.update('idle',0,{quiet:true});
  controller.interact('activity-request',{name:'theater_masks'});
  const performing=controller.getState().activity;assert.ok(performing);
  const start=frames.length-1,appearance=read().appearance.current;
  while(controller.getState().activity?.name===performing.name){
    const [key,timer]=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];time=timer.at;timers.delete(key);timer.fn();
    if(time>40000)throw Error('Performance failed to end');
  }
  for(const frame of frames.slice(start).filter(f=>f.performanceId===performing.name))for(const key of Object.keys(appearance))assert.equal(frame.appearance[key],appearance[key]);
  assert.ok(frames.slice(start).length>2);controller.stop();assert.equal(timers.size,0);
});
