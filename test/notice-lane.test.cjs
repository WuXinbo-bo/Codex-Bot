const test=require('node:test');const assert=require('node:assert/strict');const {NoticeLane}=require('../shared/notice-lane.cjs');
test('persistent notices survive time and transient notices expire',()=>{let t=0;const lane=new NoticeLane(()=>t);lane.reconcile({tasks:[{key:'a',eventId:'e1',unread:true,fresh:true,task:{id:'a',status:'needs_attention',title:'需要处理'}}]});assert.equal(lane.peek().persistent,true);t=999999;assert.equal(lane.peek().id,'e1');lane.push({id:'start',label:'开始',duration:4000});lane.next();assert.equal(lane.peek().id,'e1');});
test('lane deduplicates records and removes completed urgent entries',()=>{const lane=new NoticeLane();lane.push({id:'x',label:'开始'});lane.push({id:'x',label:'开始'});assert.equal(lane.queue.length,1);lane.reconcile({tasks:[]});assert.equal(lane.urgent.length,0);});
test('transient timer begins on presentation and stale notices cannot dismiss successors',()=>{
  let t=0;const lane=new NoticeLane(()=>t);lane.push({id:'a'});t=1000;assert.equal(lane.remaining(),4000);lane.presented(true);t=2500;assert.equal(lane.remaining(),2500);lane.presented(false);t=5000;assert.equal(lane.remaining(),4000);lane.presented(true);t=9000;assert.equal(lane.remaining(),0);lane.expire('a');lane.push({id:'b'});lane.expire('a');assert.equal(lane.peek().id,'b');t=40000;assert.equal(lane.peek(),null);
});
test('urgent state resolves explicitly and simultaneous items remain independently actionable',()=>{
  const lane=new NoticeLane();const entry=(key,status='needs_attention')=>({key,eventId:key,unread:true,fresh:true,task:{id:key,status}});
  lane.reconcile({tasks:[entry('a'),entry('b','failed')]});assert.equal(lane.peek().count,2);lane.next();assert.equal(lane.peek().id,'b');lane.reconcile({tasks:[entry('a','running'),{...entry('b','failed'),unread:false}]});assert.equal(lane.peek(),null);
});
