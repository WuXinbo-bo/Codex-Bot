const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/m1-activities.js'),Props=require('../src/m1-accessories.js'),Rig=require('../src/m1-rig.js');
const {createExpressionController,createSeededRandom}=require('../src/expression-controller.js');

test('21 new props and 44 scores are complete, routed, bounded and free of removed accessories',()=>{
  assert.equal(Object.keys(Props.NEW).length,21);assert.equal(Rig.ACCESSORIES.length,45);
  assert.deepEqual(new Set(Rig.ACCESSORIES),new Set(Object.keys(Props.DEFINITIONS)));
  assert.equal(Object.keys(A.PropScores.meta).length,44);
  for(const id of ['headphones','scarf','headband']){
    assert.ok(!Props.DEFINITIONS[id]);assert.ok(!A.CLIPS['prop_'+id]);
    assert.ok(!Object.values(A.PropScores.meta).some(m=>m.prop===id));
  }
  assert.ok(!A.CLIPS.performance_start_headphones);
  for(const [id,m] of Object.entries(A.PropScores.meta)){
    assert.ok(Props.DEFINITIONS[m.prop]);assert.equal(A.family(id),m.family);
    if(m.type==='short')assert.ok(A.POOLS[m.route].includes(id));
    if(m.type==='theater')assert.ok(A.THEATERS[id]);
    if(m.type==='task')assert.ok(A.PERFORMANCES[m.route].includes(id.replace('performance_','')));
    const before=JSON.stringify(A.CLIPS[id]);
    for(const variant of [0,1,2]){
      const frames=A.PropScores.frames(id,variant);
      assert.equal(frames.reduce((n,f)=>n+f.duration,0),A.duration(id));
      assert.equal(frames[0].phase,'prepare');assert.equal(frames.at(-2).phase,'stow');assert.equal(frames.at(-1).phase,'exit');
      for(const f of frames){
        const p=Rig.merge(Rig.getExpression(f.expression),f.pose);
        assert.ok(Object.values(p.accessories).filter(v=>v.opacity>0).length<=1,id);
        assert.deepEqual(p.effects,{complete:0,input:0,error:0});
        for(const v of Object.values(p.accessories))assert.ok(Object.values(v).every(Number.isFinite));
      }
      assert.ok(Object.values(Rig.merge(Rig.getExpression(frames.at(-1).expression),frames.at(-1).pose).accessories).every(v=>v.opacity===0));
    }
    assert.equal(JSON.stringify(A.CLIPS[id]),before);
    assert.notDeepEqual(A.PropScores.frames(id,1),A.PropScores.frames(id,2));
  }
});

function harness(seed=82,extra={}){
  let time=0,seq=0,read;const timers=new Map(),calls=[];
  const c=createExpressionController({seed,random:createSeededRandom(seed),now:()=>time,setTimeout:(f,ms)=>{timers.set(++seq,{f,at:time+ms});return seq;},clearTimeout:id=>timers.delete(id),setExpression:(id,detail)=>calls.push({id,detail,at:time}),onPerformanceDiagnostics:fn=>read=fn,...extra});
  const advance=ms=>{const end=time+ms;for(;;){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;time=next[1].at;timers.delete(next[0]);next[1].f();}time=end;};
  return {c,calls,advance,read:()=>read(),pending:()=>timers.size};
}
test('every short prop score is reachable through the real controller only in its legal route',()=>{
  for(const [name,m] of Object.entries(A.PropScores.meta).filter(([,m])=>m.type==='short')){
    const h=harness();h.c.update(m.route,m.route==='running'?1:0,{quiet:true});
    h.c.interact('activity-request',{name});assert.equal(h.c.getState().activity?.name,name);
    h.advance(6500);assert.notEqual(h.c.getState().activity?.name,name);
    assert.ok(h.read().props.exposure[m.prop]>0);
    h.c.stop();assert.equal(h.pending(),0);
  }
  const h=harness();h.c.update('running',1,{quiet:true});
  for(const name of ['prop_yoyo','prop_blanket','prop_fan']){h.c.interact('activity-request',{name});assert.notEqual(h.c.getState().activity?.name,name);}
  h.c.stop();
});
test('exposure measures played time, gives way to lifecycle immediately and freezes after cancellation',()=>{
  const h=harness();h.c.update('idle',0,{quiet:true});h.c.interact('activity-request',{name:'prop_yoyo'});h.advance(1000);
  h.c.update('running',1,{quiet:true});
  h.c.interact('task-lifecycle',{events:[{id:'start',taskId:'a',kind:'started'}]});h.advance(200);
  assert.equal(h.c.getState().activity?.priority,55);const used=h.read().props.exposure.yoyo;
  assert.ok(used>0&&used<=1200);h.advance(7000);assert.equal(h.read().props.exposure.yoyo,used);
  h.c.stop();assert.equal(h.pending(),0);
});
test('renderer exposure takes precedence over timeline estimates',()=>{
  const h=harness(1,{getAccessoryExposure:()=>({card:5000})});assert.deepEqual(h.read().props.exposure,{card:5000});assert.equal(h.read().props.source,'renderer');h.c.stop();
});
test('new task props follow the contacting panel side and retain lifecycle priority',()=>{
  const h=harness();h.c.update('idle',0,{quiet:true});let checked=0;
  for(let i=0;i<14;i++){
    h.c.interact('task-lifecycle',{events:[{id:'side-'+i,taskId:'a',turnId:String(i),kind:'started'}]});h.advance(200);
    const name=h.c.getState().activity?.name;
    h.c.interact('panel-phase',{label:'toast',phase:'entering',side:'left',duration:220});h.advance(600);
    assert.equal(h.c.getState().activity?.priority,55);
    if(A.PropScores.meta[name]){assert.equal(h.calls.at(-1).detail.pose.accessories[A.PropScores.meta[name].prop].hand,-1);checked++;}
    h.advance(6500);
  }
  assert.ok(checked>=2);h.c.stop();assert.equal(h.pending(),0);
});
test('same-family selection balances prop coverage instead of duplicate clip count',()=>{
  const pool=['research','cards','compare','organize','prop_folder'];let folder=0,random=createSeededRandom(82);
  for(let i=0;i<1000;i++)if(A.chooseActivity(pool,random,{exposure:{card:120000,glasses:120000,folder:0}})==='prop_folder')folder++;
  assert.ok(folder>650,folder);
});
test('short stories lead to bounded same-context followups and reduced motion cancels them',()=>{
  const h=harness();h.c.update('idle',0,{quiet:true});h.c.interact('activity-request',{name:'prop_yoyo'});h.advance(6000);
  assert.equal(h.read().props.followup.name,'theater_prop_yoyo_practice');h.advance(180000);
  assert.ok(h.calls.some(c=>c.detail?.performanceId==='theater_prop_yoyo_practice'));
  h.c.setMotionLevel('reduced');assert.equal(h.c.getState().activity,null);h.c.stop();assert.equal(h.pending(),0);
});
test('all task variants rotate through actual lifecycle and confirmation cleans the same delivery prop',()=>{
  const h=harness();h.c.update('idle',0,{quiet:true});const seen=new Set();
  for(let i=0;i<22;i++){
    h.c.interact('task-lifecycle',{events:[{id:'done-'+i,taskId:'a',turnId:String(i),kind:'completed'}]});h.advance(200);
    const name=h.c.getState().activity?.name;seen.add(name);h.advance(6500);
    if(A.PropScores.meta[name]){
      h.c.interact('completion-confirmed',{taskId:'a',turnId:String(i)});
      assert.ok(h.calls.at(-1).detail.pose.accessories[A.PropScores.meta[name].prop]);
      h.advance(2500);assert.equal(h.c.getState().activity,null);
    }
  }
  for(const name of A.PERFORMANCES.completed)assert.ok(seen.has('performance_'+name),name);
  h.c.stop();assert.equal(h.pending(),0);
});
