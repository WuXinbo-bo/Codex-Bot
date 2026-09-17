const test=require('node:test'),assert=require('node:assert/strict');
const {Companion}=require('../src/companion-system.js');
test('legacy games and tools cannot be restored; mouse preference remains independent',()=>{
  const c=new Companion({enabled:false,mouse:true,game:{id:'catch'},space:'plant',timer:{until:1}});
  assert.deepEqual(c.export(),{mouse:true});assert.deepEqual(c.snapshot(),{mouse:true,quietUntil:0});
  for(const action of ['game','game-input','game-stop','timer','note','space'])assert.throws(()=>c.command(action,{}),/未知陪伴操作/);
  c.command('preferences',{enabled:true,game:{id:'catch'},mouse:false});assert.deepEqual(c.export(),{mouse:false});
});
test('quiet expires without restoring games or changing saved mouse preference',()=>{
  let time=1000;const c=new Companion({mouse:true},{now:()=>time});
  c.command('quiet',{minutes:15});assert.equal(c.snapshot().quietUntil,901000);
  assert.deepEqual(c.export(),{mouse:true});time=901001;assert.equal(c.snapshot().quietUntil,0);
  c.command('quiet',{minutes:30});c.command('quiet',{minutes:0});assert.equal(c.snapshot().quietUntil,0);
  for(const minutes of [-1,1,Infinity,'15'])assert.throws(()=>c.command('quiet',{minutes}));
});
