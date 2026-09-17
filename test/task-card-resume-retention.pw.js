async(page)=>{
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>!!window.panelDemo);
  const panel=page.frameLocator('iframe[title="panel"]');
  await page.getByRole('button',{name:'多任务',exact:true}).click();
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.bot().inbox.items.size===2);
  // Same turn resumes, while an unrelated completion must stay visible.
  await page.evaluate(()=>{
    const p=panelDemo;window.previousCompletions=structuredClone(p.stored['completion-inbox.json']);
    p.faults.store='completion-inbox.json';
    p.bot().center.update({tasks:p.bot().center.view().tasks.map(e=>({...e.task,...(e.task.id==='demo-a'?{status:'running',eventAt:new Date().toISOString()}: {})})),sources:{codex:'connected'}});
  });
  await panel.locator('[data-status="running"]').waitFor();
  await page.getByRole('button',{name:'收起面板',exact:true}).click();
  await page.waitForFunction(()=>{
    const p=panelDemo,rows=p.frames.panel.contentDocument.querySelectorAll('.board-card');
    return p.windows.panel.visible&&rows.length===1&&rows[0].dataset.status==='completed'&&p.stored['completion-inbox.json'].length===1;
  });
  // Even if a source temporarily loses the running task, the old completion is gone.
  await page.evaluate(()=>{
    const p=panelDemo;
    p.bot().center.update({tasks:p.bot().center.view().tasks.filter(e=>e.task.id!=='demo-a').map(e=>e.task),sources:{codex:'connected'}});
    // Model an old inbox left on disk by an interrupted save. Persisted task state
    // must repair it at bootstrap before the panel can show the obsolete record.
    p.stored['completion-inbox.json']=previousCompletions;
    for(const id of ['panel','ball'])p.frames[id].srcdoc=p.frames[id].srcdoc;
  });
  await page.waitForFunction(()=>{
    const p=panelDemo,bot=p.bot();
    return bot?.inbox.items.size===1&&[...bot.inbox.items.values()][0].task.id==='demo-b'&&p.stored['completion-inbox.json'].length===1;
  });
  await panel.getByRole('button',{name:'确认提醒',exact:true}).click();
  await page.waitForFunction(()=>!panelDemo.windows.panel.visible);
  // Rapid completion/resume behind a blocked disk write must not reinsert the
  // superseded completion when its queued lifecycle callback finally runs.
  await page.evaluate(()=>{
    const p=panelDemo;p.faults.delayStore='completion-inbox.json';
    p.act('start');p.act('finish');
  });
  await page.waitForFunction(()=>!!panelDemo.faults.releaseStore);
  await page.evaluate(()=>{panelDemo.act('start');panelDemo.faults.releaseStore();});
  await panel.locator('[data-status="running"]').waitFor();
  await page.waitForFunction(()=>panelDemo.stored['completion-inbox.json'].length===0&&panelDemo.bot().inbox.items.size===0);
  await page.getByRole('button',{name:'收起面板',exact:true}).click();
  await page.waitForFunction(()=>!panelDemo.windows.panel.visible);
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await panel.getByRole('button',{name:'确认提醒',exact:true}).waitFor();
  await page.getByRole('button',{name:'收起面板',exact:true}).click();
  await page.waitForTimeout(4300);
  if(!await page.evaluate(()=>panelDemo.windows.panel.visible&&panelDemo.bot().inbox.items.size===1))throw Error('New unconfirmed completion expired');
  return {sameTurnResumeCollapses:true,otherCompletionUnaffected:true,cleanupSaveRetry:true,noReappearanceAfterMissingTaskOrRestart:true,delayedCompletionWriteCannotPinRun:true,newCompletionStillPersistent:true};
}
