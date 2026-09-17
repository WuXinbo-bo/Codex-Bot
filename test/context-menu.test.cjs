const test=require('node:test'),assert=require('node:assert/strict');
const {menuPosition,contains}=require('../shared/context-menu.cjs');
test('context menu stays within work areas at fractional DPI and avoids visible cards where possible',()=>{
  for(const scale of [1,1.25,1.5,2])for(const area of [{x:0,y:0,width:1920,height:1080},{x:-1920,y:-200,width:1920,height:1080},{x:0,y:0,width:360,height:420}])for(const right of [false,true]){
    const ball={x:right?area.x+area.width-128*scale:area.x,y:area.y+30,width:128*scale,height:128*scale};
    const p=menuPosition(ball,area,[],scale);assert.ok(p.x>=area.x&&p.y>=area.y&&p.x+p.width<=area.x+area.width&&p.y+p.height<=area.y+area.height);assert.ok(contains(p,{x:p.x+1,y:p.y+1}));
  }
  const area={x:0,y:0,width:1000,height:700},ball={x:400,y:200,width:128,height:128},card={x:536,y:200,width:280,height:200};
  const p=menuPosition(ball,area,[card]);assert.ok(p.x+p.width<=card.x||p.y+p.height<=card.y||p.y>=card.y+card.height);
});
