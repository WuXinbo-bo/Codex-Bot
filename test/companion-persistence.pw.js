async(page)=>{
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>Boolean(window.panelDemo));
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.stored['companion.json']?.records.length===1);
  const panel=page.frameLocator('iframe[title="panel"]');
  await panel.getByRole('button',{name:'陪伴工具',exact:true}).click();
  await panel.getByRole('button',{name:'生活物件',exact:true}).click();
  await page.evaluate(()=>{panelDemo.faults.delayStore='companion.json';panelDemo.faults.store='companion.json';});
  await panel.locator('[data-space="box"]').click();
  await page.waitForFunction(()=>!!panelDemo.faults.releaseStore);
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await page.evaluate(()=>panelDemo.faults.releaseStore());
  await page.waitForFunction(()=>panelDemo.stored['companion.json']?.history.length===1);
  if(await page.evaluate(()=>panelDemo.bot().companion.state.space)!=='mat')throw Error('Failed setting was retained');
  if(await page.evaluate(()=>panelDemo.bot().companion.state.history.length)!==1)throw Error('Concurrent completion was lost');
  return {concurrentSaveRollback:true,completionPersisted:true};
}
