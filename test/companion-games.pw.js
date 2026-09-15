async(page)=>{
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html?companion=1');
  await page.waitForFunction(()=>!!window.panelDemo);
  const panel=page.frameLocator('iframe[title="panel"]');
  await panel.getByRole('button',{name:'短时互动',exact:true}).click();
  const ids=await panel.locator('#companionGameSelect option').evaluateAll(nodes=>nodes.map(n=>n.value));
  const passed=[];
  for(const id of ids){
    await panel.locator('#companionGameSelect').selectOption(id);await panel.getByRole('button',{name:'开始',exact:true}).click();
    await page.waitForFunction(id=>panelDemo.bot().companion.game?.id===id,id);
    const game=panel.locator('#companionGame');await game.scrollIntoViewIfNeeded();await page.waitForTimeout(100);
    const r=await game.boundingBox();const click=(x,y=50)=>page.mouse.click(r.x+r.width*x/100,r.y+r.height*y/100);
    const view=await page.evaluate(()=>panelDemo.bot().companion.gameView());
    if(id==='catch')await click(view.target);
    if(id==='hands'){await page.waitForFunction(()=>panelDemo.bot().companion.gameView().beat>1&&panelDemo.bot().companion.gameView().beat<1.6);await click((view.round+Math.floor(view.seed*10))%2?75:25);}
    if(id==='mirror')await page.mouse.move(r.x+r.width*(100-view.target)/100,r.y+r.height*.7);
    if(id==='balance')await page.mouse.move(r.x+r.width*.5,r.y+r.height*.7);
    if(id==='stretch'||id==='water'){await game.focus();await page.keyboard.down('Space');await page.waitForTimeout(id==='water'?1500:2200);await page.keyboard.up('Space');}
    if(id==='trace')await click(20,25);
    if(id==='five'){await page.waitForFunction(()=>panelDemo.bot().companion.gameView().beat>1.05&&panelDemo.bot().companion.gameView().beat<1.5);await click(50);}
    if(id==='rhythm'){await page.waitForFunction(()=>panelDemo.bot().companion.gameView().beat<.2);await click(50);}
    if(id==='sort')await click(20,70);
    if(id==='stack'){await page.waitForFunction(()=>Math.abs(panelDemo.bot().companion.gameView().moving-50)<8);await click(50);}
    if(id==='plane'){await page.mouse.move(r.x+r.width*.2,r.y+r.height*.5);await page.mouse.down();await page.mouse.move(r.x+r.width*.82,r.y+r.height*.5,{steps:8});await page.mouse.up();}
    await page.waitForFunction(()=>panelDemo.bot().companion.game?.score>0,{},{timeout:4000});passed.push(id);
    await panel.getByRole('button',{name:'收好',exact:true}).click();
    await page.waitForFunction(()=>!panelDemo.bot().companion.game);
  }
  return {playedAndScored:passed};
}
