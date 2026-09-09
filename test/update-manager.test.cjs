const test=require('node:test'),assert=require('node:assert/strict');
const {createUpdateManager,normalize}=require('../shared/update-manager.cjs');
function harness(extra={}){
  const calls=[],saved=[],events=[],timers=new Map();let seq=0,time=0;
  const manager=createUpdateManager({invoke:async op=>{calls.push(op);if(op==='update-info')return {currentVersion:'0.3.0',configured:true};if(op==='update-check')return {version:'0.4.0',notes:'hello'};return {verified:true};},publish:s=>events.push(s),persist:async v=>saved.push(v),now:()=>time,random:()=>0,setTimeout:(fn,ms)=>{timers.set(++seq,{fn,ms});return seq;},clearTimeout:id=>timers.delete(id),...extra});
  return {manager,calls,saved,events,timers,advance:ms=>time+=ms};
}
test('update preferences preserve false and default to confirmation-driven download',()=>{
  assert.deepEqual(normalize({}),{autoCheck:true,autoDownload:false,notifications:true,ignoredVersion:'',remindAfter:0});
  assert.equal(normalize({autoCheck:false}).autoCheck,false);
});
test('check, verified download and explicit install remain separate',async()=>{
  const h=harness();await h.manager.start();assert.equal([...h.timers.values()][0].ms,30000);
  await h.manager.check();assert.equal(h.manager.snapshot().phase,'available');assert.ok(!h.calls.includes('update-download'));
  await h.manager.download();assert.equal(h.manager.snapshot().phase,'ready');assert.ok(!h.calls.includes('update-install'));
  await h.manager.install();assert.equal(h.calls.at(-1),'update-install');h.manager.stop();assert.equal(h.timers.size,0);
});
test('auto download verifies but never auto installs',async()=>{
  const h=harness({initial:{autoDownload:true}});await h.manager.check();assert.equal(h.manager.snapshot().phase,'ready');assert.ok(!h.calls.includes('update-install'));
});
test('network and signature failure never look current or enable installation',async()=>{
  for(const fail of ['update-check','update-download']){
    const calls=[];const h=harness({invoke:async op=>{calls.push(op);if(op===fail)throw Error('network or signature failure');if(op==='update-info')return {configured:true};if(op==='update-check')return {version:'0.4.0'};}});
    await h.manager.check();if(fail==='update-download')await h.manager.download();
    assert.equal(h.manager.snapshot().phase,'error');await h.manager.install();assert.ok(!calls.includes('update-install'));
  }
});
test('unconfigured builds do not contact a release endpoint',async()=>{
  const calls=[];const h=harness({invoke:async op=>{calls.push(op);return {configured:false};}});
  await h.manager.check();assert.equal(h.manager.snapshot().phase,'unconfigured');assert.deepEqual(calls,['update-info']);
});
test('overlapping checks coalesce into one native request',async()=>{
  let finish,count=0;const h=harness({invoke:async op=>{if(op==='update-info')return {configured:true};count++;return new Promise(resolve=>finish=resolve);}});
  const first=h.manager.check();const second=h.manager.check();await Promise.resolve();finish(null);await Promise.all([first,second]);assert.equal(count,1);assert.equal(h.manager.snapshot().phase,'current');
});
test('postpone and ignore survive saved preferences; manual check can reveal ignored version',async()=>{
  const h=harness();await h.manager.check();await h.manager.dismiss();assert.equal(h.saved.at(-1).remindAfter,86400000);
  await h.manager.check();assert.equal(h.manager.snapshot().notify,false);h.advance(86400001);await h.manager.check();assert.equal(h.manager.snapshot().notify,true);
  await h.manager.dismiss(true);const next=harness({initial:h.saved.at(-1)});await next.manager.check();assert.equal(next.manager.snapshot().notify,false);await next.manager.check(true);assert.equal(next.manager.snapshot().notify,true);
});
test('turning off checks clears the scheduled request and install flushes persistence first',async()=>{
  let flushed=false;const h=harness({beforeInstall:async()=>{flushed=true;}});await h.manager.start();await h.manager.preferences({autoCheck:false});assert.equal(h.timers.size,0);
  await h.manager.check();await h.manager.download();await h.manager.install();assert.ok(flushed);
});
