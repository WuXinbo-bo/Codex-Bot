async(page)=>{
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>!!window.panelDemo);
  const ball=page.frameLocator('iframe[title="ball"]'),panel=page.frameLocator('iframe[title="panel"]');
  // Native mouse coordinates, not direct calls to the expression renderer.
  await page.evaluate(()=>{const g=panelDemo.bot().geometry();panelDemo.mouse({kind:'move',x:g.x+64,y:g.y+34});});
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity?.name==='performance_companion_pet',{},{timeout:7000});
  await page.locator('iframe[title="ball"]').screenshot({path:'output/playwright/companion-pet.png'});
  await page.evaluate(()=>{const g=panelDemo.bot().geometry();panelDemo.mouse({kind:'down',x:g.x+64,y:g.y+64});panelDemo.mouse({kind:'move',x:g.x+100,y:g.y+70});panelDemo.mouse({kind:'up',x:g.x+100,y:g.y+70});});
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity?.name==='performance_companion_land');
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity?.priority===55);
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await panel.locator('[data-status="completed"]').waitFor();
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity?.name==='performance_companion_work_review');
  await panel.locator('[data-status="completed"]').getByRole('button',{name:'确认提醒',exact:true}).click();
  await page.waitForTimeout(2200);
  await page.evaluate(()=>{const g=panelDemo.bot().geometry();panelDemo.mouse({kind:'down',x:g.x+32,y:g.y+105});panelDemo.mouse({kind:'up',x:g.x+32,y:g.y+105});});
  await panel.locator('#spaceButtons').waitFor({state:'visible'});
  await panel.locator('#companionMouse').uncheck();
  await page.waitForFunction(()=>panelDemo.bot().companion.state.mouse===false);
  await page.emulateMedia({reducedMotion:'reduce'});
  await panel.locator('[data-space="box"]').click();
  await ball.locator('.companion-space[data-space="box"]').waitFor();
  if(await ball.locator('.companion-space').evaluate(e=>e.getAnimations({subtree:true}).length)!==0)throw Error('Reduced motion not respected');
  await page.emulateMedia({reducedMotion:'no-preference'});
  return {nativePet:true,nativeDragLanding:true,taskPreemption:true,completionReview:true,propOpensTools:true,mousePreference:true,reducedMotion:true};
}
