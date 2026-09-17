async(page)=>{
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');await page.waitForFunction(()=>!!window.panelDemo);
  const panel=page.frameLocator('iframe[title="panel"]');
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await panel.getByRole('button',{name:'确认提醒',exact:true}).waitFor();
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  await page.getByRole('button',{name:'任务失败',exact:true}).click();
  await panel.locator('[data-status="failed"]').waitFor();
  await page.evaluate(()=>panelDemo.faults.store='completion-inbox.json');
  await panel.getByRole('button',{name:'确认提醒',exact:true}).click();
  await panel.locator('.board-action-error').filter({hasText:'模拟保存失败'}).waitFor();
  const state=await page.evaluate(()=>{const p=panelDemo,key=p.bot().center.view().tasks[0].key;return {memory:p.bot().inbox.items.size,disk:p.stored['completion-inbox.json'].length,ack:p.stored['task-notices.json'][key].acknowledged};});
  if(state.memory!==1||state.disk!==1||state.ack)throw Error('Partial acknowledgement persisted '+JSON.stringify(state));
  await panel.getByRole('button',{name:'确认提醒',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.bot().inbox.items.size===0&&!panelDemo.windows.panel.visible);
  return {carriedCompletionSaveFailureRolledBack:true,retryClearsBothRecords:true};
}
