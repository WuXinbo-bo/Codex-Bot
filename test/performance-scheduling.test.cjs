const test=require('node:test'),assert=require('node:assert/strict');
const Masks=require('../src/mask-system.js'),Activities=require('../src/m1-activities.js');
test('activity selection avoids the previous clip when alternatives exist',()=>{
  for(let i=0;i<100;i++)assert.notEqual(Activities.chooseActivity(['ponder','research'],()=>i/100,{name:'ponder'}),'ponder');
  assert.equal(Activities.chooseActivity([],()=>0),undefined);
});
test('coordinated automatic masks respect cooldown even for lifecycle events',()=>{
  let now=0;const c=Masks.createController({now:()=>now,random:()=>.5});c.configure({coordinated:true,maskFrequency:'lively'});
  c.status('running');assert.equal(c.state().current,null);
  now=40000;assert.equal(c.tick().visible,true);now=46000;c.lifecycle('completed',['a']);assert.equal(c.tick().visible,false);
});
test('props and panel ownership suppress automatic masks but explicit previews remain available',()=>{
  let now=0;const c=Masks.createController({now:()=>now});c.configure({coordinated:true,maskFrequency:'lively'});now=40000;c.tick();c.context(true);assert.equal(c.tick().visible,false);
  c.preview('happy');assert.equal(c.tick().visible,true);
});
test('ten minute lively automatic mask exposure remains below 15 percent',()=>{
  let now=0,visible=0;const c=Masks.createController({now:()=>now,random:()=>.5});c.configure({coordinated:true,maskFrequency:'lively'});
  for(now=0;now<600000;now+=100){if(now%1000===0)c.lifecycle('completed',[String(now)]);if(c.tick().visible)visible+=100;}
  assert.ok(visible/600000<.15);
});
test('activity family selection is not dominated by the number of card clips',()=>{
  const names=['research','cards','compare','trace','organize','keyboard','inspect','ponder'];const counts={};let seed=1;
  const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<10000;i++){const name=Activities.chooseActivity(names,random);const family=Activities.family(name);counts[family]=(counts[family]||0)+1;}
  assert.ok(counts.work<4000);assert.ok(counts.inspect>2500);assert.ok(counts.gesture>2500);
});
