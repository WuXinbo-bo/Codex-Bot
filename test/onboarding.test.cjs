const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('src/onboarding.js','utf8');
function setup(env={}){
  const nodes=new Map();const $=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',checked:false,disabled:false,hidden:true});return nodes.get(id);};
  let listener;const calls=[];
  const api={onSetup:f=>listener=f,inspectConnection:async()=>({state:'connected',executable:'C:/Codex/codex.exe',codexHome:'C:/Users/test/.codex',executableFound:true,homeReadable:true,watching:true,activeCount:0,...env}),setup:async v=>listener(v),refresh:async()=>{},saveConnectionPaths:async p=>calls.push(p),pickConnectionPath:async()=>null,finishSetup:async(...args)=>calls.push(args),copyConnectionDiagnostic:async()=>true};
  vm.runInNewContext(source,{window:{metaBot:api},document:{getElementById:$,body:{classList:{toggle(){}}}},URLSearchParams,location:{search:''}});
  return {$,api,calls,show:()=>listener(true)};
}
test('setup keeps long local paths in details rather than the status summary',async()=>{
  const s=setup();s.show();await settle();
  assert.doesNotMatch(s.$('setupChecks').textContent,/C:\//);
  assert.match(s.$('setupDetails').textContent,/C:\/Codex/);
});
const settle=()=>new Promise(r=>setImmediate(r));
test('onboarding connects with zero tasks but requires explicit human verification',async()=>{
  const s=setup();s.show();await settle();assert.match(s.$('setupChecks').textContent,/没有进行中任务/);assert.equal(s.$('setupDone').disabled,true);
  s.$('setupVerified').checked=true;s.$('setupVerified').onchange();assert.equal(s.$('setupDone').disabled,false);
  await s.$('setupDone').onclick();assert.deepEqual(s.calls[0],['verified',true]);
});
test('offline and missing home cannot be marked verified',async()=>{
  const s=setup({state:'offline',homeReadable:false});s.show();await settle();s.$('setupVerified').checked=true;s.$('setupVerified').onchange();assert.equal(s.$('setupDone').disabled,true);assert.match(s.$('setupChecks').textContent,/未连接/);assert.match(s.$('setupDetails').textContent,/不能断言没有任务/);
});
test('picker cancellation preserves input and blank paths restore auto discovery',async()=>{
  const s=setup();s.show();await settle();s.$('setupExecutable').value='existing';await s.$('pickExecutable').onclick();assert.equal(s.$('setupExecutable').value,'existing');
  s.$('setupExecutable').value='';await s.$('setupSave').onclick();assert.equal(s.calls[0].executable,'');
});
test('reopening actually refreshes the checks and failed save remains retryable',async()=>{
  const s=setup();s.$('setupReopen').onclick();await settle();assert.match(s.$('setupChecks').textContent,/已连接/);
  s.api.saveConnectionPaths=async()=>{throw Error('拒绝访问');};await s.$('setupSave').onclick();assert.match(s.$('setupMessage').textContent,/拒绝访问/);assert.equal(s.$('setupSave').disabled,false);
});
test('poller pause drains an in-flight request before path switching and resume works',async()=>{
  const {createSourcePoller}=await import('../native/source-poller.js');let release,calls=0;
  const p=createSourcePoller({names:['codex'],run:()=>{calls++;return new Promise(r=>release=r);},delay:()=>null});
  const first=p.refresh('codex');let drained=false;const pause=p.pause().then(()=>drained=true);await p.refresh('codex');assert.equal(calls,1);assert.equal(drained,false);release();await first;await pause;
  p.resume();const second=p.refresh('codex');assert.equal(calls,2);release();await second;p.stop();
});
