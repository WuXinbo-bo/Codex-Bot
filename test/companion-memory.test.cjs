const test=require('node:test'),assert=require('node:assert/strict');
const Memory=require('../src/companion-memory'),Library=require('../src/performance-library'),Appearance=require('../src/appearance'),Activities=require('../src/m1-activities'),Rig=require('../src/m1-rig');
test('six whole-body styles and three personalities normalize independently',()=>{
  assert.equal(Object.keys(Appearance.ART_STYLES).length,7);assert.equal(Object.keys(Appearance.PERSONALITIES).length,3);
  for(const artStyle of Object.keys(Appearance.ART_STYLES))assert.equal(Appearance.normalize({artStyle,eyeStyle:'anime',personality:'quiet'}).artStyle,artStyle);
  assert.equal(Appearance.normalize({artStyle:'bad'}).artStyle,'auto');assert.equal(Appearance.normalize({stories:false}).stories,false);
});
test('practice changes delivery, confirmation releases afterglow, three completions unlock cleanup',()=>{
  let time=0;const m=Memory.create(()=>time);
  m.observe('finished','story_practice');assert.equal(m.observe('completed'),'story_delivery');assert.equal(m.snapshot().afterglow,true);
  assert.equal(m.observe('confirmed'),'story_acknowledge');assert.equal(m.snapshot().afterglow,false);
  m.observe('finished','story_delivery');m.observe('completed');m.observe('completed');time=50000;
  assert.equal(m.next('idle',false),'story_cleanup');assert.equal(m.next('running',false),null);
  m.observe('finished','story_cleanup');assert.equal(m.snapshot().completed,0);
});
test('noticed props and interrupted paper are resumed only after quiet time and expire',()=>{
  let time=0;const m=Memory.create(()=>time);
  assert.equal(m.observe('noticed','story_fidget'),'story_hide_cube');assert.equal(m.next('idle',false),null);
  time=46000;assert.equal(m.next('idle',true),null);assert.equal(m.next('idle',false),'story_resume_cube');
  m.observe('finished','story_resume_cube');assert.equal(m.snapshot().stored,null);
  m.observe('interrupted','story_letter');time+=46000;assert.equal(m.next('idle',false),'story_return_letter');
  time+=600001;assert.notEqual(m.next('idle',false),'story_return_letter');m.reset();assert.equal(m.snapshot().stored,null);
});
test('nine narrative segments use valid assets, clean exits and no synthetic task signals',()=>{
  assert.equal(Object.keys(Activities.NARRATIVES).length,9);
  for(const name of Object.keys(Activities.NARRATIVES)){
    assert.ok(Activities.duration(name)<6000);
    for(const frame of Activities.CLIPS[name]){const pose=Rig.merge(Rig.getExpression(frame.expression),frame.pose);assert.ok(Object.values(pose.effects).every(n=>n===0));}
    const end=Activities.CLIPS[name].at(-1);assert.ok(Object.values(Rig.merge(Rig.getExpression(end.expression),end.pose).accessories).every(p=>p.opacity===0));
  }
});
test('collection preserves preferences, separates encounters from completion and rejects unknown IDs',()=>{
  let records=Library.record({},'story_practice',false);assert.equal(records.story_practice.completed,0);
  records=Library.preference(records,'story_practice',{favorite:true,frequency:'less',seen:false});
  records=Library.record(records,'story_practice',true);assert.equal(records.story_practice.completed,1);assert.equal(records.story_practice.favorite,true);
  assert.deepEqual(Library.normalize(JSON.parse(JSON.stringify(records))),records);
  assert.deepEqual(Library.record(records,'unknown',true),records);assert.throws(()=>Library.preference(records,'unknown',{}));
  assert.equal(Library.catalog(records).length,Object.keys(Activities.CLIPS).length);
});
