const test=require('node:test'),assert=require('node:assert/strict'),{create}=require('../src/task-relay.js');
const item=id=>({id,title:id});
test('relay preserves current card when new completions arrive',()=>{const r=create();r.update([item('a'),item('b')]);r.move(1);assert.equal(r.update([item('a'),item('b'),item('c')]).item.id,'b');assert.equal(r.view().total,3);});
test('relay hands off after authoritative removal and navigation never removes',()=>{const r=create();r.update([item('a'),item('b'),item('c')]);assert.equal(r.move(-1).item.id,'c');assert.equal(r.view().total,3);assert.equal(r.update([item('a'),item('b')]).item.id,'b');assert.equal(r.update([]).item,null);assert.equal(r.move(1).total,0);});
test('relay deduplicates IDs and refreshes titles',()=>{const r=create();r.update([item('a'),item('a')]);assert.equal(r.view().total,1);assert.equal(r.update([{id:'a',title:'new'}]).item.title,'new');});
