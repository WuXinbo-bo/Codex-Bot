async(page)=>{
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html?companion=1');
  await page.waitForFunction(()=>Boolean(window.panelDemo));
  const panel=page.frameLocator('iframe[title="panel"]');
  await page.evaluate(()=>{panelDemo.faults.delayStore='companion.json';panelDemo.faults.store='companion.json';});
  await panel.locator('#companionMouse').uncheck();
  await page.waitForFunction(()=>!!panelDemo.faults.releaseStore);
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  await page.evaluate(()=>panelDemo.faults.releaseStore());
  await panel.locator('#companionFeedback').filter({hasText:'模拟保存失败'}).waitFor();
  if(await page.evaluate(()=>panelDemo.bot().companion.state.mouse)!==true)throw Error('Failed preference changed state');
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await panel.locator('[data-status="completed"]').waitFor();
  if(await page.evaluate(()=>panelDemo.stored['companion.json']?.mouse)===false)throw Error('Failed preference persisted');
  return {saveRollback:true,taskEventsContinue:true};
}
