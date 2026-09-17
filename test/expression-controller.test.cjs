const test = require("node:test");
const assert = require("node:assert/strict");
const { createExpressionController, poolFor, weightedPick, createSeededRandom } = require("../src/expression-controller.js");
const Base=require('../src/base-emotions.js');

function fakeClock(start = 0) {
  let time = start;
  let nextId = 0;
  const timers = new Map();
  return {
    now: () => time,
    setTimeout: (callback, delay) => { const id = ++nextId; timers.set(id, { callback, due: time + delay }); return id; },
    clearTimeout: (id) => timers.delete(id),
    advance(milliseconds) {
      const target = time + milliseconds;
      while (true) {
        const next = [...timers.entries()].sort((left, right) => left[1].due - right[1].due)[0];
        if (!next || next[1].due > target) break;
        time = next[1].due;
        timers.delete(next[0]);
        next[1].callback();
      }
      time = target;
    },
    pending: () => timers.size
  };
}

function harness(settings = {}) {
  const clock = fakeClock();
  const expressions = [];
  const motions = [];
  const gazes = [];
  const active = [];
  const controller = createExpressionController({
    now: clock.now,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    intervalMs: 2500,
    standbyAfter: 2500,
    sleepAfter: 5000,
    random: () => 0,
    setExpression: (name, options) => expressions.push({ name, options }),
    setMotion: (motion) => motions.push(motion),
    setGaze: (x, y) => gazes.push({ x, y }),
    clearGaze: () => gazes.push(null),
    setActive: (value) => active.push(value),
    ...settings
  });
  return { clock, controller, expressions, motions, gazes, active };
}

test('mouse playback yields to press, drag, task queues and game preference without consuming selection',()=>{
  const {Director}=require('../src/mouse-director');const h=harness();h.clock.advance(1000);
  h.controller.update('idle',0,{quiet:true});h.controller.interact('companion-mode',{active:true});
  const d=new Director({now:h.clock.now,play:detail=>h.controller.playMouse(detail)});
  h.controller.interact('press');assert.equal(d.emit('pet'),false);assert.equal(d.snapshot().accepted,0);
  h.controller.interact('ball-click');assert.equal(d.emit('pet'),true);assert.match(h.controller.getState().activity.name,/performance_mouse_/);
  h.controller.interact('drag-start');assert.equal(h.controller.playMouse({name:'performance_mouse_melt',group:'pet'}),false);
  h.controller.interact('drag-end');
  h.controller.interact('task-lifecycle',{events:[{id:'mouse-task',kind:'started',taskId:'mouse-task'}]});
  assert.equal(h.controller.playMouse({name:'performance_mouse_soft',group:'landing'}),false);
  h.clock.advance(200);assert.ok(!h.controller.getState().activity?.name.startsWith('performance_mouse_'));
  h.controller.stop();h.controller.interact('companion-mode',{active:true,quiet:true});
  assert.equal(h.controller.playMouse({name:'performance_mouse_melt',group:'pet'}),false);
  h.controller.interact('companion-mode',{active:false,quiet:false,enabled:false});
  assert.equal(h.controller.playMouse({name:'performance_mouse_melt',group:'pet'}),false);h.controller.stop();
});

test('reduced mouse response is brief and disabling mouse cancels its frames',()=>{
  const h=harness();h.controller.update('idle',0,{quiet:true});h.controller.interact('companion-mode',{active:true});
  h.controller.setMotionLevel('reduced');
  assert.equal(h.controller.playMouse({name:'performance_mouse_melt',group:'pet'}),true);
  assert.equal(h.controller.getState().activity,null);h.clock.advance(200);assert.equal(h.controller.getState().transient,null);
  h.controller.setMotionLevel('full');assert.equal(h.controller.playMouse({name:'performance_mouse_melt',group:'pet'}),true);
  h.controller.interact('companion-mode',{active:false,enabled:false});assert.equal(h.controller.getState().activity,null);
  h.clock.advance(3500);assert.ok(!h.controller.getState().activity?.name.startsWith('performance_mouse_'));h.controller.stop();assert.equal(h.clock.pending(),0);
});

test('holding a drag still settles gently, resumes immediately and never leaves timers behind',()=>{
  const h=harness();h.controller.update('idle',0,{quiet:true});h.controller.interact('companion-mode',{active:true});
  h.controller.interact('drag-start');h.clock.advance(750);assert.equal(h.controller.getCurrent(),'hold');
  h.controller.interact('drag-move',{velocity:{x:800,y:0,speed:800}});assert.equal(h.controller.getCurrent(),'fast_drag');
  h.controller.interact('drag-end',{releaseSpeed:800});h.controller.stop();assert.equal(h.clock.pending(),0);
});

test('rehearsal and acknowledgement connect to real lifecycle without extra task events',()=>{
  const events=[];let read;const h=harness({onLifecycle:event=>events.push(event.kind),onPerformanceDiagnostics:fn=>read=fn});
  h.controller.update('idle',0,{quiet:true});h.controller.interact('activity-request',{name:'story_practice'});h.clock.advance(6000);
  h.controller.interact('task-lifecycle',{events:[{id:'story-done',kind:'completed',taskId:'a'}]});h.clock.advance(180);
  assert.equal(h.controller.getState().activity.name,'story_delivery');assert.deepEqual(events,['completed']);
  h.controller.interact('completion-confirmed');assert.equal(h.controller.getState().activity.name,'performance_companion_panel_file');assert.equal(read().story.afterglow,false);
  h.controller.stop();assert.equal(h.clock.pending(),0);
});
test('noticed narrative hides its prop instead of resuming it immediately',()=>{
  let read;const h=harness({onPerformanceDiagnostics:fn=>read=fn});h.controller.update('idle',0,{quiet:true});
  h.controller.interact('activity-request',{name:'story_fidget'});h.controller.interact('hover-enter');
  assert.equal(h.controller.getState().activity.name,'story_hide_cube');assert.equal(h.controller.getState().suspendedActivity,null);
  h.clock.advance(2200);h.controller.interact('pointer-leave');assert.notEqual(h.controller.getState().activity?.name,'story_fidget');assert.equal(read().story.stored,'cube');
  h.controller.stop();
});
test('personality applies through configuration and manual replay cannot override running work',()=>{
  let configure,read;const h=harness({onBehaviorControl:fn=>configure=fn,onPerformanceDiagnostics:fn=>read=fn});
  configure({personality:'quiet',stories:false});h.controller.update('idle',0,{quiet:true});h.controller.interact('hover-enter');assert.equal(h.controller.getCurrent(),'attentive');
  assert.equal(read().personality,'quiet');h.controller.update('running',1,{quiet:true});h.controller.interact('library-replay',{name:'magic'});assert.notEqual(h.controller.getState().activity?.name,'magic');h.controller.stop();
});
test('disabling random animation stops an ambient narrative immediately',()=>{
  let toggle;const h=harness({onRandomControl:fn=>toggle=fn});
  h.controller.update('idle',0,{quiet:true});
  for(let elapsed=0;elapsed<44000&&!h.controller.getState().activity;elapsed+=250)h.clock.advance(250);
  assert.equal(h.controller.getState().activity.name,'story_practice');
  assert.equal(h.controller.getState().activity.priority,5);
  toggle(false);assert.equal(h.controller.getState().activity,null);
  h.controller.stop();assert.equal(h.clock.pending(),0);
});

test('long theater lasts about fifteen seconds and releases every mask',()=>{
  const masks=[];
  const h=harness({onTheaterMask:id=>masks.push(id)});
  h.controller.update('idle',0,{quiet:true});
  h.controller.interact('activity-request',{name:'theater_masks'});
  assert.equal(h.controller.getState().activity.name,'theater_masks');
  h.clock.advance(8000);
  assert.equal(h.controller.getState().activity.name,'theater_masks');
  assert.ok(masks.includes('shy'));
  h.clock.advance(8000);
  assert.equal(h.controller.getState().activity,null);
  assert.ok(masks.includes('cool'));
  assert.equal(masks.at(-1),null);
  h.controller.stop();assert.equal(h.clock.pending(),0);
});

test('lifecycle scores rotate fully and survive their own toast choreography',()=>{
  let diagnostics;
  const h=harness({random:createSeededRandom(21),onPerformanceDiagnostics:read=>diagnostics=read});
  const A=require('../src/m1-activities');
  for(const kind of ['started','joined','completed','attention','failed','stopped']){
    const size=A.PERFORMANCES[kind==='joined'?'started':kind].length;
    const seen=new Set();
    for(let index=0;index<size;index++){
      h.controller.interact('task-lifecycle',{events:[{id:kind+index,kind,taskId:'a',turnId:kind+index}]});h.clock.advance(180);
      const name=h.controller.getState().activity.name;seen.add(name);
      h.controller.interact('panel-phase',{label:kind==='completed'?'completions':'toast',phase:'entering',duration:220});
      assert.equal(h.controller.getState().activity.name,name);
      h.controller.interact('hover-enter');h.controller.interact('pointer-leave');
      assert.equal(h.controller.getState().activity.name,name);
      h.clock.advance(A.duration(name)*1.3+1000);
    }
    assert.equal(seen.size,size,kind);
  }
  assert.ok(diagnostics().history.length<=32);
  h.controller.stop();assert.equal(h.clock.pending(),0);
});

test('native entering-only panel phases rotate gestures without waiting for preparing',()=>{
  const h=harness({random:createSeededRandom(45)});
  h.controller.update('idle',0,{quiet:true});
  const seen=[];
  for(let i=0;i<12;i++){
    h.controller.interact('panel-phase',{label:'panel',phase:'entering',side:'right',duration:220});
    seen.push(h.controller.getState().activity.name);h.clock.advance(1600);
  }
  assert.equal(new Set(seen).size,4);
  assert.ok(seen.every((name,index)=>index===0||name!==seen[index-1]));
  h.controller.stop();assert.equal(h.clock.pending(),0);
});

test('completion nudges go through priority and accessibility controls',()=>{
  const h=harness();h.controller.update('idle',0,{quiet:true});
  h.controller.interact('completion-nudge',{stage:3});assert.equal(h.controller.getCurrent(),'special_overload');
  h.controller.interact('drag-start');h.controller.interact('completion-nudge',{stage:3});
  assert.equal(h.controller.getState().activity.name,'lifted');
  h.controller.interact('drag-end');h.controller.setMotionLevel('reduced');
  h.controller.interact('completion-nudge',{stage:2});h.clock.advance(150);
  assert.equal(h.controller.getState().transient,null);h.controller.stop();
});

test('completion delivery never waits for the longer start performance',()=>{
  const notices=[];const h=harness({onLifecycle:notice=>notices.push(notice.kind)});
  h.controller.interact('task-lifecycle',{events:[{id:'start-fast',kind:'started',taskId:'a'}]});h.clock.advance(180);
  h.controller.interact('task-lifecycle',{events:[{id:'done-fast',kind:'completed',taskId:'a'}]});h.clock.advance(180);
  assert.deepEqual(notices,['started','completed']);
  assert.match(h.controller.getState().activity.name,/performance_done_/);h.controller.stop();
});

test('nine work scores remain available with a permanently open task board',()=>{
  let read;const h=harness({intervalMs:8500,random:createSeededRandom(73),onPerformanceDiagnostics:fn=>read=fn});
  h.controller.update('running',1,{quiet:true});h.controller.interact('bubble-open');
  h.clock.advance(3600000);
  const counts=Object.entries(read().counts).filter(([name])=>name.startsWith('performance_work_'));
  assert.equal(counts.length,9);assert.ok(Math.max(...counts.map(([,n])=>n))-Math.min(...counts.map(([,n])=>n))<=1);
  h.controller.stop();assert.equal(h.clock.pending(),0);
});

test('observing and opening a panel do not starve the thirty-minute theater rotation',t=>{
  for(const status of ['running','idle']){
    const h=harness({random:createSeededRandom(42),intervalMs:8500});
    h.controller.update(status,status==='running'?1:0,{quiet:true});
    h.controller.interact('bubble-open');
    for(let elapsed=0;elapsed<1800000;elapsed+=1000){
      if (elapsed%20000===0) h.controller.interact('hover-enter',{local:{x:.3,y:.2}});
      if (elapsed%20000===5000) h.controller.interact('pointer-leave');
      h.clock.advance(1000);
    }
    const state=h.controller.getState().theater;
    const counts=Object.values(state.completed);
    assert.equal(counts.length,status==='running'?12:13);
    assert.ok(Math.max(...counts)-Math.min(...counts)<=1);
    assert.ok(state.events.filter(e=>e.kind==='completed').length>=10);
    t.diagnostic(JSON.stringify({status,completed:state.completed}));
    h.controller.stop();assert.equal(h.clock.pending(),0);
  }
});

test('a click resumes a theater with an open panel and restores mask ownership',()=>{
  const masks=[],ownership=[];
  const h=harness({onTheaterMask:id=>masks.push(id),onPerformance:active=>ownership.push(active)});
  h.controller.update('idle',0,{quiet:true});
  h.controller.interact('activity-request',{name:'theater_masks'});
  h.clock.advance(5000);
  h.controller.interact('press');h.controller.interact('ball-click');h.controller.interact('bubble-open');
  h.clock.advance(4000);
  assert.equal(h.controller.getState().activity?.name,'theater_masks');
  assert.ok(['shy','cool'].includes(masks.at(-1)));assert.equal(ownership.at(-1),true);
  h.clock.advance(15000);
  assert.equal(h.controller.getState().theater.completed.theater_masks,1);
  assert.equal(ownership.at(-1),false);
  h.controller.stop();assert.equal(h.clock.pending(),0);
});

test('aborted stories receive a short retry, no completion credit, and no stale resume',()=>{
  const h=harness();h.controller.update('running',1,{quiet:true});
  h.controller.interact('activity-request',{name:'theater_notes'});h.clock.advance(1000);
  h.controller.interact('press');h.controller.interact('drag-start');
  assert.equal(h.controller.getState().suspendedActivity,null);
  assert.deepEqual(h.controller.getState().theater.completed,{});
  assert.ok(h.controller.getState().theater.nextAt<=h.clock.now()+15000);
  h.controller.interact('drag-end');
  assert.notEqual(h.controller.getState().activity?.name,'theater_notes');
  h.controller.stop();assert.equal(h.clock.pending(),0);
});

test('every non-retained theater runs through the production director to completion',()=>{
  const A=require('../src/m1-activities.js');
  for(const [name,story] of Object.entries(A.THEATERS)){
    if(story.route==='retained')continue;
    const h=harness();h.controller.update(story.route,story.route==='idle'?0:1,{quiet:true,lifecycleManaged:true});
    h.controller.interact('activity-request',{name});
    assert.equal(h.controller.getState().activity?.name,name);
    h.clock.advance(14000);assert.equal(h.controller.getState().activity?.name,name);
    h.clock.advance(2000);assert.equal(h.controller.getState().activity,null,name);
    h.controller.stop();assert.equal(h.clock.pending(),0,name);
  }
});

test('lifecycle and drag interrupt long stories without resuming stale performance',()=>{
  for(const type of ['task-lifecycle','drag-start']){
    const h=harness();h.controller.update('running',1,{quiet:true,lifecycleManaged:true});
    h.controller.interact('activity-request',{name:'theater_notes'});h.clock.advance(7000);
    h.controller.interact(type,{events:[{id:'done',kind:'completed',taskId:'a',turnId:'one'}]});
    h.clock.advance(180);
    assert.ok(h.controller.getState().transient.priority>=55);
    assert.equal(h.controller.getState().suspendedActivity,null);
    h.controller.stop();assert.equal(h.clock.pending(),0);
  }
});

test('automatic theaters respect route, cooldown and accessibility controls',()=>{
  for(const mode of ['normal','reduced','disabled']){
    let toggle;const h=harness({motionLevel:mode==='reduced'?'reduced':'full',onRandomControl:fn=>toggle=fn});
    if(mode==='disabled')toggle(false);
    h.controller.update('running',1,{quiet:true,lifecycleManaged:true});
    let previous=null;const starts=[];
    for(let t=0;t<900000;t+=100){
      h.clock.advance(100);const id=h.controller.getState().activity?.name;
      if(id?.startsWith('theater_')&&id!==previous)starts.push({id,time:h.clock.now()});
      previous=id;
    }
    if(mode==='normal'){
      assert.ok(starts.length>0);
      const history=new Map();
      starts.forEach((s,i)=>{
        assert.equal(require('../src/m1-activities.js').THEATERS[s.id].route,'running');
        if(i)assert.ok(s.time-starts[i-1].time>=89000);
        if(history.has(s.id))assert.ok(s.time-history.get(s.id)>300000);
        history.set(s.id,s.time);
      });
    }else assert.equal(starts.length,0);
    h.controller.stop();assert.equal(h.clock.pending(),0);
  }
});

test('retained stories require completion presence and are capped at two per panel visit',()=>{
  const h=harness();h.controller.update('idle',0,{quiet:true});
  let starts=0;
  for(let i=0;i<8;i++){
    h.controller.stop();h.clock.advance(310000);
    h.controller.interact('panel-phase',{phase:'attending',label:'completions'});
    if(h.controller.getState().activity?.name.startsWith('theater_'))starts++;
  }
  assert.equal(starts,2);
  h.controller.interact('panel-phase',{phase:'leaving',label:'completions',duration:150});
  h.controller.stop();h.clock.advance(310000);
  h.controller.interact('panel-phase',{phase:'attending',label:'completions'});
  assert.ok(h.controller.getState().activity?.name.startsWith('theater_'));
  h.controller.stop();
});
test('thirty minute production schedules reach new emotions and props without timer buildup',()=>{
  const seen=new Set(),props=new Set();
  const h=harness({random:createSeededRandom(927),standbyAfter:3600000,sleepAfter:3600000,setExpression:(name,options)=>{seen.add(name);for(const [id,p] of Object.entries(options?.pose?.accessories||{}))if(p.opacity>0)props.add(id);}});
  for(const status of ['running','idle','queued','paused']){h.controller.update(status,status==='idle'?0:1);h.clock.advance(450000);}
  assert.ok([...seen].some(id=>id.startsWith('emotion_')));
  assert.ok(['notebook','pencil','hourglass','stamp','flag'].some(id=>props.has(id)));
  h.controller.stop();assert.equal(h.clock.pending(),0);
});

test("lifecycle completion survives primary changes and is deduplicated", () => {
  const notices = []; const { controller, clock } = harness({ onLifecycle: e => notices.push(e) });
  const event = { id: "done-a", kind: "completed", taskId: "a", turnId: "one" };
  controller.update("running", 1, { taskId: "b", quiet: true, lifecycleManaged: true });
  controller.interact("task-lifecycle", { events: [event] }); clock.advance(180);
  assert.equal(controller.getState().activity.priority, 55);
  controller.update("idle", 0, { quiet: true, lifecycleManaged: true });
  assert.equal(controller.getState().activity.priority, 55);
  controller.interact("task-lifecycle", { events: [event] }); clock.advance(4000);
  assert.equal(notices.length, 1);
  assert.equal(controller.getState().status, "idle"); controller.stop();
});
test("drag defers and merges simultaneous completions until release", () => {
  const notices = []; const { controller, clock } = harness({ onLifecycle: e => notices.push(e) });
  controller.interact("drag-start");
  controller.interact("task-lifecycle", { events: ["a", "b"].map(id => ({ id, kind: "completed" })) });
  clock.advance(2000); assert.equal(notices.length, 0);
  controller.interact("drag-end", { releaseSpeed: 0 });
  assert.equal(notices.length, 1); assert.equal(notices[0].events.length, 2);
  controller.stop(); assert.equal(clock.pending(), 0);
});
test("reduced motion keeps lifecycle text and returns to current base", () => {
  const notices = []; const { controller, clock } = harness({ motionLevel: "reduced", onLifecycle: e => notices.push(e) });
  controller.update("idle", 0, { quiet: true });
  controller.interact("task-lifecycle", { events: [{ id: "a", kind: "completed" }] });
  clock.advance(500);
  assert.equal(notices.length, 1); assert.equal(controller.getState().activity, null);
  assert.equal(controller.getState().transient, null); controller.stop();
});
test("a short completed turn supersedes its deferred start", () => {
  const notices = []; const { controller, clock } = harness({ onLifecycle: e => notices.push(e) });
  controller.interact("task-lifecycle", { events: [{ id: "start", taskId: "a", turnId: "one", kind: "started" }, { id: "done", taskId: "a", turnId: "one", kind: "completed" }] });
  clock.advance(5000); assert.deepEqual(notices.map(e => e.kind), ["completed"]); controller.stop();
});

test("semantic pools cover all task states and prioritize running work", () => {
  for (const status of ["offline", "running", "queued", "paused", "needs_attention", "completed", "failed"]) {
    assert.ok(poolFor(status, 0).length >= 3, status);
  }
  assert.ok(poolFor("running", 1).includes("focus"));
  for (const name of ["retry", "cautious_retry", "external_wait", "fatigue_reset", "complete"]) {
    assert.equal(poolFor("running", 1).includes(name), false);
  }
  assert.ok(poolFor("needs_attention", 1).includes("input"));
});

test("click responses exclude the last three and panel events do not overwrite them", () => {
  const item = harness({ random: createSeededRandom(42) });
  item.controller.update("running", 1);
  const seen = [];
  for (let i = 0; i < 16; i++) {
    item.controller.interact("press"); item.controller.interact("ball-click");
    const state = item.controller.getState();
    assert.equal(state.reaction.group, "click");
    assert.ok(!seen.slice(-3).includes(state.activity.name));
    seen.push(state.activity.name);
    item.controller.interact(i % 2 ? "bubble-close" : "bubble-open");
    assert.equal(item.controller.getState().activity.name, state.activity.name);
    item.clock.advance(1800);
  }
  assert.ok(new Set(seen).size >= 5); item.controller.stop();
  assert.equal(item.clock.pending(), 0);
});

test("rapid pokes build temporary wariness, and quiet time resets it", () => {
  const item = harness(); item.controller.update("idle", 0);
  for (let i = 0; i < 3; i++) { item.controller.interact("press"); item.controller.interact("ball-click"); item.clock.advance(200); }
  assert.equal(item.controller.getState().mood, "wary");
  assert.equal(item.controller.getState().reaction.group, "hold");
  item.clock.advance(9000);
  assert.equal(item.controller.getState().mood, "neutral");
  assert.equal(item.controller.getState().pressStreak, 0); item.controller.stop();
});

test("drag expression is sampled once and stays stable across telemetry", () => {
  const item = harness(); item.controller.update("running", 1);
  const faces = [];
  for (let i = 0; i < 4; i++) {
    item.controller.interact("drag-start");
    faces.push(JSON.stringify(item.expressions.at(-1).options.pose.eyes));
    const selected = item.controller.getState().reaction.name;
    for (let j = 0; j < 30; j++) { item.controller.interact("drag-move", { velocity: { x: j * 20, speed: j * 20 } }); item.clock.advance(33); }
    assert.equal(item.controller.getState().reaction.name, selected);
    item.controller.interact("drag-end", { releaseSpeed: 0 });
  }
  assert.equal(new Set(faces).size, 4); item.controller.stop();
});

test("task reminders take priority over social responses and impart only temporary mood", () => {
  const item = harness(); item.controller.update("running", 1, { quiet: true });
  item.controller.interact("ball-click");
  item.controller.interact("task-lifecycle", { events: [{ id: "done", kind: "completed" }] }); item.clock.advance(180);
  for (const type of ["hover-enter", "hover-dwell", "bubble-open", "bubble-close"]) item.controller.interact(type);
  assert.equal(item.controller.getState().activity.priority, 55);
  assert.equal(item.controller.getState().mood, "pleased");
  item.clock.advance(21000); assert.equal(item.controller.getState().mood, "neutral"); item.controller.stop();
});

test("reduced motion keeps click feedback bounded without activity timers", () => {
  const item = harness({ motionLevel: "reduced" }); item.controller.update("idle", 0);
  for (let i = 0; i < 100; i++) {
    item.controller.interact("press"); item.controller.interact("ball-click");
    assert.equal(item.controller.getState().activity, null);
    assert.ok(item.clock.pending() <= 2); item.clock.advance(150);
  }
  item.controller.stop(); assert.equal(item.clock.pending(), 0);
});

test("rare costumes have a cooldown and never appear during work", () => {
  const A = require("../src/m1-activities.js");
  for (const status of ["idle", "running", "needs_attention"]) {
    const item = harness({ random: () => 0.9999 }); item.controller.update(status, 1, { quiet: true });
    let lastRare = -Infinity;
    for (let i = 0; i < 80; i++) {
      item.controller.interact("ball-click");
      if (A.RARE.has(item.controller.getState().reaction.name)) {
        assert.equal(status, "idle"); assert.ok(item.clock.now() - lastRare >= 120000); lastRare = item.clock.now();
      }
      item.clock.advance(4000);
    }
    item.controller.stop();
  }
});

test("weighted picker excludes recent expressions while alternatives exist", () => {
  const pool = ["focus", "deep_focus", "quiet_progress", "double_check", "idea_trace"];
  const picked = weightedPick(pool, () => 0, ["focus", "deep_focus", "quiet_progress", "double_check"]);
  assert.equal(picked, "idea_trace");
});

test("seeded behavior randomization is reproducible", () => {
  const first = createSeededRandom(42);
  const second = createSeededRandom(42);
  assert.deepEqual([first(), first(), first()], [second(), second(), second()]);
});

test("interaction poses override status and restore the latest base state", () => {
  const item = harness();
  item.controller.update("running", 1);
  assert.ok(Base.routes.running.includes(Base.entries[item.controller.getCurrent()]?.family));
  item.controller.interact("press", { local: { x: 0.2, y: -0.1 } });
  assert.equal(item.controller.getCurrent(), "pressed");
  item.controller.interact("refresh-start");
  assert.equal(item.controller.getCurrent(), "pressed");
  item.controller.interact("drag-start");
  assert.equal(item.controller.getState().activity.name, "lifted");
  item.controller.update("failed", 0);
  item.controller.interact("drag-end", { edgeHit: false, releaseSpeed: 900 });
  assert.equal(item.controller.getCurrent(), "landing");
  item.clock.advance(2500);
  assert.ok(poolFor("failed", 0).includes(item.controller.getCurrent()));
  item.controller.stop();
});

test("drag telemetry selects speed and sharp-turn poses", () => {
  const item = harness();
  item.controller.update("running", 1);
  item.controller.interact("drag-start");
  item.controller.interact("drag-move", { velocity: { x: 300, y: 0, speed: 300 } });
  assert.equal(item.controller.getState().activity.name, "lifted");
  item.clock.advance(1300);
  assert.equal(item.controller.getCurrent(), "slow_drag");
  item.controller.interact("drag-move", { velocity: { x: 900, y: -300, speed: 949 }, directionChanged: true });
  assert.equal(item.controller.getCurrent(), "sharp_turn");
  assert.ok(item.motions.at(-1).rotate > 0);
  item.controller.stop();
});

test("edge collision direction selects the matching deformation", () => {
  const item = harness();
  item.controller.update("running", 1);
  item.controller.interact("drag-start");
  item.controller.interact("drag-end", { edgeHit: true, edgeDirection: "top-left" });
  assert.equal(item.controller.getCurrent(), "edge_left");
  item.controller.stop();
});

test("idle lifecycle reaches rest and wakes on pointer proximity", () => {
  const item = harness();
  item.controller.update("offline", 0);
  assert.ok(Base.entries[item.controller.getCurrent()]);
  item.clock.advance(5000);
  assert.equal(Base.entries[item.controller.getCurrent()].family, 'sleepy');
  item.controller.interact("proximity-enter", { local: { x: 0.5, y: 0 } });
  assert.equal(item.controller.getState().activity.name, "wake");
  item.clock.advance(1200);
  assert.notEqual(Base.entries[item.controller.getCurrent()]?.family, 'sleepy');
  item.controller.stop();
});

test("reduced motion disables continuous activity and shortens transients", () => {
  const item = harness({ motionLevel: "reduced" });
  item.controller.update("running", 1);
  assert.deepEqual(item.active, [false]);
  item.controller.interact("drag-end", { edgeHit: true });
  assert.equal(item.motions.at(-1).mode, "settling");
  item.controller.stop();
  assert.equal(item.clock.pending(), 0);
});

test("quick refresh preserves the existing ambient behavior deadline", () => {
  const item = harness();
  item.controller.update("running", 1);
  const dueAt = item.controller.getState().baseDueAt;
  item.clock.advance(100);
  item.controller.interact("refresh-start");
  item.controller.interact("refresh-success");
  item.clock.advance(520);
  assert.equal(item.controller.getState().baseDueAt, dueAt);
  item.controller.stop();
});

test("ten minutes of work balance focus with short performances and never invent task events", (t) => {
  const item = harness({ intervalMs: 8500, random: createSeededRandom(42) });
  item.controller.update("running", 1);
  const occupancy = {};
  const seen = new Set();
  let firstActivityAt = null;
  for (let elapsed = 0; elapsed < 600000; elapsed += 100) {
    item.clock.advance(100);
    const name = item.controller.getCurrent();
    occupancy[name] = (occupancy[name] || 0) + 100;
    const activity = item.controller.getState().activity;
    if (activity) { seen.add(activity.name); firstActivityAt ??= elapsed + 100; }
    const activities = require("../src/m1-activities.js");
    assert.ok(poolFor("running", 1).includes(name) || activities.POOLS.running.includes(activity?.name) || activities.THEATERS[activity?.name]?.route === 'running', name);
  }
  const focused = Object.entries(occupancy).filter(([name])=>Base.entries[name]&&Base.routes.running.includes(Base.entries[name].family)||['focus','deep_focus','quiet_progress'].includes(name)).reduce((sum,[,time])=>sum+time,0);
  assert.ok(focused / 600000 >= 0.6, JSON.stringify(occupancy));
  assert.ok(Math.max(...Object.values(occupancy)) / 600000 < 0.35, JSON.stringify(occupancy));
  assert.ok(Object.keys(occupancy).length >= 4);
  assert.ok(seen.size >= 6, [...seen].join(","));
  assert.ok(firstActivityAt <= 30000, String(firstActivityAt));
  t.diagnostic(JSON.stringify({ seed: 42, firstActivityAt, workActivities: [...seen], focusPercent: focused / 6000 }));
  item.controller.stop();
  assert.equal(item.clock.pending(), 0);
});

test("hover dwell selects contextual responses and yields immediately to press", () => {
  const item = harness();
  item.controller.update("running", 1);
  for (const stage of ["short", "medium", "long"]) {
    item.controller.interact("hover-dwell", { stage });
    assert.equal(item.controller.getState().activity.priority, 28);
    assert.equal(item.controller.getState().reaction.group, stage === "long" ? "dwell" : "hover");
  }
  item.controller.interact("press");
  item.clock.advance(2000);
  assert.equal(item.controller.getCurrent(), "pressed");
  item.controller.interact("ball-click");
  assert.equal(item.controller.getState().activity.priority, 45);
  item.clock.advance(1400);
  assert.ok(Base.routes.running.includes(Base.entries[item.controller.getCurrent()]?.family));
  item.controller.stop();
});

test("fast drags decelerate and interrupted turns use the latest speed", () => {
  const item = harness();
  item.controller.update("running", 1);
  item.controller.interact("drag-start");
  const move = (speed, directionChanged = false) => item.controller.interact("drag-move", { velocity: { x: speed, y: 0, speed }, directionChanged });
  move(1200);
  item.clock.advance(1300);
  assert.equal(item.controller.getCurrent(), "fast_drag");
  move(200);
  assert.equal(item.controller.getCurrent(), "slow_drag");
  move(1200, true);
  move(200);
  item.clock.advance(300);
  assert.equal(item.controller.getCurrent(), "slow_drag");
  item.controller.stop();
});

test("gentle placement restores focus, click releases press, and a new press interrupts recoil", () => {
  const item = harness();
  item.controller.update("running", 1);
  item.controller.interact("drag-start");
  item.controller.interact("drag-end", { releaseSpeed: 30 });
  assert.ok(Base.routes.running.includes(Base.entries[item.controller.getCurrent()]?.family));
  assert.ok(item.motions.at(-1).intensity < 0.03);
  item.controller.interact("press");
  item.controller.interact("ball-click");
  item.controller.interact("bubble-open");
  assert.equal(item.controller.getState().activity.priority, 45);
  assert.equal(item.controller.getState().reaction.group, "click");
  item.controller.interact("drag-start");
  item.controller.interact("drag-end", { releaseSpeed: 900 });
  item.controller.interact("press");
  assert.equal(item.controller.getCurrent(), "pressed");
  item.clock.advance(800);
  assert.equal(item.controller.getCurrent(), "pressed");
  item.controller.stop();
});

test("completion settles once and stale failure reactions cannot outlive recovery", () => {
  const item = harness({ intervalMs: 12000 });
  item.controller.update("running", 1);
  item.controller.update("completed", 0);
  assert.equal(item.controller.getState().activity.name, "hero");
  item.clock.advance(2600);
  assert.ok(Base.routes.completed.includes(Base.entries[item.controller.getCurrent()]?.family));
  item.controller.update("failed", 0);
  item.controller.update("running", 1);
  item.clock.advance(1800);
  assert.ok(Base.routes.running.includes(Base.entries[item.controller.getCurrent()]?.family));
  item.controller.stop();
});

test("each task identity reminds once, including completion deferred by dragging", () => {
  const item = harness({ intervalMs: 8500 });
  item.controller.update("running", 2, { taskId: "a" });
  item.controller.interact("press");
  item.controller.interact("drag-start");
  item.controller.update("completed", 1, { taskId: "a" });
  assert.ok(item.controller.getState().pendingReminder);
  item.controller.interact("drag-end", { releaseSpeed: 0 });
  assert.equal(item.controller.getState().activity.name, "hero");
  item.clock.advance(3000);
  item.controller.update("completed", 1, { taskId: "a" });
  assert.equal(item.controller.getState().activity, null);
  item.controller.update("completed", 1, { taskId: "b" });
  assert.equal(item.controller.getState().activity.name, "hero");
  item.controller.update("running", 1, { taskId: "c" });
  item.clock.advance(3000);
  assert.equal(item.controller.getState().activity, null);
  item.controller.stop();
});

test("cached states never celebrate and reduced motion cancels activity timers", () => {
  const item = harness();
  item.controller.update("running", 1);
  item.controller.update("completed", 1, { taskId: "cached", fresh: false });
  assert.equal(item.controller.getState().activity, null);
  item.controller.update("needs_attention", 1, { taskId: "live" });
  assert.equal(item.controller.getState().activity.name, "attention");
  item.controller.setMotionLevel("reduced");
  assert.equal(item.controller.getState().activity, null);
  item.clock.advance(2000);
  assert.ok(Base.routes.needs_attention.includes(Base.entries[item.controller.getCurrent()]?.family));
  item.controller.stop();
  assert.equal(item.clock.pending(), 0);
});

test("ten idle minutes produce diverse complete activities and stop without leftover timers", () => {
  const item = harness({ intervalMs: 8500, random: createSeededRandom(7) });
  item.controller.update("offline", 0);
  const seen = new Set();
  for (let i = 0; i < 6000; i++) {
    item.clock.advance(100);
    const activity = item.controller.getState().activity;
    if (activity) seen.add(activity.name);
  }
  assert.ok(seen.size >= 8, [...seen].join(","));
  item.controller.stop();
  assert.equal(item.clock.pending(), 0);
});

test("lift survives 33 ms telemetry, follows latest speed, and releases before clip completion", () => {
  const item = harness({ intervalMs: 12000 });
  item.controller.update("running", 1);
  item.controller.interact("drag-start");
  item.clock.advance(33);
  item.controller.interact("drag-move", { velocity: { x: 1000, y: 0, speed: 1000 } });
  assert.equal(item.controller.getState().activity.name, "lifted");
  assert.equal(item.gazes.at(-1).x, 1);
  assert.ok(item.motions.at(-1).stretch > 0);
  item.clock.advance(1267);
  assert.equal(item.controller.getCurrent(), "fast_drag");
  item.controller.interact("drag-end", { releaseSpeed: 0 });
  item.controller.interact("drag-start");
  item.clock.advance(100);
  item.controller.interact("drag-end", { releaseSpeed: 0 });
  item.clock.advance(1300);
  assert.ok(Base.routes.running.includes(Base.entries[item.controller.getCurrent()]?.family));
  item.controller.stop();
});

test("proximity and hover form one visit; edge jitter does not greet, a real return does", () => {
  const item = harness();
  item.controller.update("running", 1);
  item.controller.interact("proximity-enter");
  item.clock.advance(100);
  item.controller.interact("hover-enter");
  assert.equal(item.controller.getState().reaction.group, "hover");
  item.controller.interact("pointer-leave");
  item.clock.advance(100);
  item.controller.interact("proximity-enter");
  assert.equal(item.controller.getState().reaction.group, "leave");
  item.controller.interact("pointer-leave");
  item.clock.advance(1000);
  item.controller.interact("proximity-enter");
  assert.equal(item.controller.getState().reaction.group, "return");
  const greeting = item.controller.getState().activity.name;
  item.clock.advance(100);
  item.controller.interact("hover-enter");
  item.controller.interact("hover-dwell", { stage: "short" });
  assert.equal(item.controller.getState().activity.name, greeting);
  item.controller.stop();
});

test("completed task revisits dedupe while observed reruns and new event IDs can celebrate", () => {
  const item = harness({ intervalMs: 12000 });
  item.controller.update("completed", 1, { taskId: "a" });
  item.clock.advance(2600);
  item.controller.update("needs_attention", 1, { taskId: "b" });
  item.clock.advance(2500);
  item.controller.update("completed", 1, { taskId: "a" });
  assert.equal(item.controller.getState().activity, null);
  item.controller.update("running", 1, { taskId: "a" });
  item.controller.update("completed", 1, { taskId: "a" });
  assert.equal(item.controller.getState().activity.name, "hero");
  item.clock.advance(2600);
  item.controller.update("completed", 1, { taskId: "a", eventId: "new-turn" });
  assert.equal(item.controller.getState().activity.name, "hero");
  item.controller.stop();
});

test("cached-to-fresh celebrates once, interrupted reminders are not prematurely delivered", () => {
  const item = harness({ intervalMs: 12000 });
  item.controller.update("completed", 1, { taskId: "a", fresh: false });
  item.controller.update("completed", 1, { taskId: "a", fresh: true });
  assert.equal(item.controller.getState().activity.name, "hero");
  item.clock.advance(400);
  item.controller.interact("press");
  item.controller.interact("ball-click");
  assert.equal(item.controller.getState().activity.name, "hero");
  item.controller.update("needs_attention", 1, { taskId: "b" });
  item.clock.advance(2300);
  item.controller.update("completed", 1, { taskId: "a" });
  assert.equal(item.controller.getState().activity.name, "hero");
  item.clock.advance(2600);
  item.controller.update("completed", 1, { taskId: "a" });
  assert.equal(item.controller.getState().activity, null);
  item.controller.stop();
});

test("cached attention cannot repeat after closing panel; reduced reminders stay static", () => {
  const item = harness({ intervalMs: 12000 });
  item.controller.update("needs_attention", 1, { taskId: "cached", fresh: false });
  item.controller.interact("bubble-close");
  item.clock.advance(70000);
  assert.equal(item.expressions.some(entry => entry.options.pose?.effects?.input), false);
  item.controller.setMotionLevel("reduced");
  item.controller.update("completed", 1, { taskId: "a" });
  item.controller.setMotionLevel("full");
  item.controller.update("completed", 1, { taskId: "a" });
  assert.equal(item.controller.getState().activity, null);
  item.controller.stop();
});

test("ambient interruption resumes the same step and remaining duration after pointer leaves", () => {
  const item = harness({ intervalMs: 12000 });
  item.controller.update("idle", 0);
  item.controller.interact("activity-request", { name: "magic" });
  item.clock.advance(850);
  item.controller.interact("proximity-enter");
  assert.equal(item.controller.getState().activity.name, "caught");
  const saved = item.controller.getState().suspendedActivity;
  assert.equal(saved.index, 2);
  assert.equal(saved.remaining, 600);
  item.controller.interact("hover-enter");
  item.controller.interact("hover-dwell", { stage: "short" });
  item.clock.advance(2000);
  assert.equal(item.controller.getState().activity, null);
  item.controller.interact("pointer-leave");
  assert.equal(item.controller.getState().activity.name, "magic");
  assert.equal(item.controller.getState().activity.index, 2);
  item.clock.advance(599);
  assert.equal(item.controller.getState().activity.index, 2);
  item.clock.advance(1);
  assert.equal(item.controller.getState().activity.index, 3);
  item.controller.stop();
  assert.equal(item.clock.pending(), 0);
});

test("resumption expires, respects open panel, and clears on context change or reduced motion", () => {
  for (const condition of ["expired", "status", "reduced", "panel"]) {
    const item = harness({ intervalMs: 12000 });
    item.controller.update("idle", 0);
    item.controller.interact("activity-request", { name: "magic" });
    item.clock.advance(850);
    item.controller.interact("press");
    if (condition === "expired") item.clock.advance(16000);
    if (condition === "status") item.controller.update("running", 1);
    if (condition === "reduced") item.controller.setMotionLevel("reduced");
    if (condition === "panel") item.controller.interact("bubble-open");
    item.controller.interact("ball-click");
    assert.notEqual(item.controller.getState().activity?.name, "magic", condition);
    if (condition === "panel") {
      item.controller.interact("bubble-close");
      item.clock.advance(1400);
      assert.equal(item.controller.getState().activity?.name, "magic");
    }
    item.controller.stop();
  }
});

test("mimic reacts to actual pointer samples and yields to pressing; running never mimics", () => {
  for (const status of ["idle", "running"]) {
    const item = harness();
    item.controller.update(status, 1);
    item.controller.interact("hover-enter", { local: { x: 0, y: 0 } });
    for (const x of [-0.5, 0.5, -0.8]) item.controller.interact("hover-move", { local: { x, y: 0.2 } });
    if (status === "idle") {
      assert.equal(item.controller.getState().activity.name, "mimic");
      assert.ok(item.motions.at(-1).rotate < 0);
      item.controller.interact("hover-move", { local: { x: 0.8, y: -0.3 } });
      assert.ok(item.motions.at(-1).rotate > 0);
      assert.equal(item.gazes.at(-1).x, 0.8);
    } else assert.notEqual(item.controller.getState().activity?.name, "mimic");
    item.controller.interact("press");
    assert.equal(item.controller.getCurrent(), "pressed");
    item.controller.stop();
  }
});
