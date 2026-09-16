async(page)=>{
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>!!window.panelDemo);
  const ball=page.frameLocator('iframe[title="ball"]'),panel=page.frameLocator('iframe[title="panel"]');
  await page.evaluate(()=>{const g=panelDemo.bot().geometry();panelDemo.mouse({kind:'move',x:g.x+64,y:g.y+34});});
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity?.name==='performance_companion_pet',{},{timeout:7000});
  await page.evaluate(()=>{const g=panelDemo.bot().geometry();panelDemo.mouse({kind:'down',x:g.x+64,y:g.y+64});panelDemo.mouse({kind:'move',x:g.x+100,y:g.y+70});panelDemo.mouse({kind:'up',x:g.x+100,y:g.y+70});});
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity?.name==='performance_companion_land');
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity?.name==='performance_companion_panel_receive');
  await panel.getByRole('button',{name:'小互动',exact:true}).first().click();
  await panel.locator('#companionMouse').uncheck();
  await page.waitForFunction(()=>panelDemo.bot().companion.state.mouse===false);
  await page.emulateMedia({reducedMotion:'reduce'});
  if(await ball.locator('.companion-space').count())throw Error('Living space still rendered');
  await page.emulateMedia({reducedMotion:'no-preference'});
  return {nativePet:true,nativeDragLanding:true,taskPreemption:true,mousePreference:true,noLivingSpace:true};
}
