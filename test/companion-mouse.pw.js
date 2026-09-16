async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>!!window.panelDemo);
  const panel=page.frameLocator('iframe[title="panel"]');
  // Project from the rendered, transformed body into native physical coordinates.
  const move=async(fx,fy)=>page.evaluate(({fx,fy})=>{
    const w=panelDemo.frames.ball.contentWindow,b=w.document.querySelector('[data-part="body"]'),r=b.getBBox();
    const p=new w.DOMPoint(r.x+r.width*fx,r.y+r.height*fy).matrixTransform(b.getScreenCTM()),g=panelDemo.bot().geometry();
    panelDemo.mouse({kind:'move',x:g.x+p.x*g.scale,y:g.y+p.y*g.scale});
  },{fx,fy});
  await move(.5,.18);await page.waitForTimeout(950);
  if(await page.evaluate(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getMouseState().events.some(e=>e.group==='pet')))throw Error('Static head hover was mistaken for petting');
  await page.waitForTimeout(2600);
  for(const x of [.3,.4,.5,.6,.7,.6,.5,.4,.3,.4]){await move(x,.18);await page.waitForTimeout(110);}
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getMouseState().events.some(e=>e.group==='pet'));
  await page.locator('iframe[title="ball"]').screenshot({path:'output/playwright/mouse-pet-live.png'});
  await page.evaluate(()=>{const g=panelDemo.bot().geometry();panelDemo.mouse({kind:'down',x:g.x+64*g.scale,y:g.y+64*g.scale});panelDemo.mouse({kind:'move',x:g.x+100*g.scale,y:g.y+70*g.scale});panelDemo.mouse({kind:'up',x:g.x+100*g.scale,y:g.y+70*g.scale});});
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getMouseState().events.some(e=>e.group==='landing'));
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity?.name==='performance_companion_panel_receive');
  if(await page.evaluate(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getMouseState().chain)!==null)throw Error('Task did not cancel chain');
  await panel.locator('#companionButton').click();await panel.locator('#companionMouse').uncheck();
  await page.waitForFunction(()=>panelDemo.bot().companion.state.mouse===false);
  const count=await page.evaluate(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getMouseState().accepted);
  for(const x of [.3,.5,.7,.5,.3,.5]){await move(x,.18);await page.waitForTimeout(100);}
  if(await page.evaluate(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getMouseState().accepted)!==count)throw Error('Disabled mouse still acts');
  if(errors.length)throw Error(errors.join('\n'));
  return {staticIsNotPet:true,transformedBodyPet:true,nativeDragLanding:true,taskPreemption:true,chainCancelled:true,mousePreference:true,errors};
}
