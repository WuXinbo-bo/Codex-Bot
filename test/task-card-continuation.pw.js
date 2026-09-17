async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1100,height:780});
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>!!window.panelDemo);
  const panel=page.frameLocator('iframe[title="panel"]');
  const start=()=>page.getByRole('button',{name:'开始任务',exact:true}).click();
  const finish=async()=>{await page.getByRole('button',{name:'完成任务',exact:true}).click();await panel.getByRole('button',{name:'确认提醒',exact:true}).waitFor();};
  const retained=()=>page.evaluate(()=>{const p=panelDemo;return p.windows.panel.visible&&p.bot().inbox.items.size===1&&p.stored['completion-inbox.json'].length===1;});
  await start();await finish();
  await page.evaluate(()=>window.originalCard=panelDemo.frames.panel.contentDocument.querySelector('.board-card'));
  for(let i=0;i<3;i++){
    if(i===0)await page.evaluate(async()=>{
      await panelDemo.act('start');
      const until=performance.now()+2500,w=panelDemo.frames.ball.contentWindow;
      while(performance.now()<until){
        if(w.__metaBotDebug.getExpressionState().activity?.name==='performance_companion_panel_resume')return;
        await new Promise(resolve=>setTimeout(resolve,30));
      }
      throw Error('Continuation gesture was not played by the production controller');
    });else await start();
    await panel.locator('[data-status="running"]').waitFor();
    if(!await page.evaluate(()=>originalCard===panelDemo.frames.panel.contentDocument.querySelector('.board-card')&&panelDemo.frames.panel.contentDocument.querySelectorAll('.board-card').length===1))throw Error('Rerun replaced or duplicated the DOM card');
    if(await panel.getByRole('button',{name:'确认提醒',exact:true}).count())throw Error('Running card kept completed actions');
    if(i===0){await page.waitForTimeout(4500);if(!await retained())throw Error('Carried card expired');await page.locator('#stage').screenshot({path:'output/playwright/continued-task-running.png'});}
    await finish();if(!await retained())throw Error('Completion accumulated turns');
  }
  await page.locator('#stage').screenshot({path:'output/playwright/continued-task-complete.png'});
  // Legacy duplicates must be merged in storage, not only hidden by the view.
  await page.evaluate(()=>{
    const p=panelDemo,item=structuredClone([...p.bot().inbox.items.values()][0]);
    p.stored['completion-inbox.json']=[item,{...item,id:'legacy-older',turnId:'legacy',eventAt:'2000-01-01T00:00:00Z',receivedAt:1}];
    for(const id of ['panel','ball'])p.frames[id].srcdoc=p.frames[id].srcdoc;
  });
  await page.waitForFunction(()=>panelDemo.bot()?.inbox.items.size===1&&panelDemo.stored['completion-inbox.json'].length===1);
  await panel.getByRole('button',{name:'确认提醒',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.bot().inbox.items.size===0);
  await start();await panel.locator('[data-status="running"]').waitFor();
  if(!await page.evaluate(()=>panelDemo.events.some(e=>e.topic==='board:update'&&e.data.rows.some(r=>r.kind==='resumed'))))throw Error('Acknowledged rerun lost continuation');
  await page.mouse.move(1000,730);await page.waitForFunction(()=>!panelDemo.windows.panel.visible,{},{timeout:9000});
  await finish();
  // Opening Codex may be slow: a start while it is opening must keep the card.
  await page.evaluate(()=>panelDemo.faults.delayOpen=true);
  await panel.getByRole('button',{name:'查看任务',exact:true}).click();
  await page.waitForFunction(()=>!!panelDemo.faults.releaseOpen);
  await start();await page.evaluate(()=>panelDemo.faults.releaseOpen());
  await panel.locator('[data-status="running"]').waitFor();
  if(!await retained())throw Error('Opening an old completion acknowledged the new run');
  await finish();
  // Also guard a start while the confirmation is already writing to disk.
  await page.evaluate(()=>panelDemo.faults.delayStore='completion-inbox.json');
  await panel.getByRole('button',{name:'确认提醒',exact:true}).click();
  await page.waitForFunction(()=>!!panelDemo.faults.releaseStore);
  await start();await page.evaluate(()=>panelDemo.faults.releaseStore());
  await panel.locator('[data-status="running"]').waitFor();
  await page.waitForFunction(()=>panelDemo.stored['completion-inbox.json'].length===1);
  if(!await retained())throw Error('Confirmation race lost pending card');
  await page.evaluate(()=>{
    const p=panelDemo,bot=p.bot(),task=bot.center.view().tasks[0].task;
    bot.center.update({tasks:[{...task,turnId:'turn-1',status:'completed',eventAt:new Date().toISOString()}],sources:{codex:'connected'}});
  });
  if(!await panel.locator('[data-status="running"]').isVisible())throw Error('Late completion reverted current state');
  await page.evaluate(()=>panelDemo.faults.store='completion-inbox.json');
  await finish();
  await page.waitForFunction(()=>panelDemo.stored['completion-inbox.json'][0]?.id===[...panelDemo.bot().inbox.items.keys()][0],{},{timeout:8000});
  await panel.getByRole('button',{name:'查看任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.bot().inbox.items.size===0&&panelDemo.stored['completion-inbox.json'].length===0);
  await page.getByRole('button',{name:'多任务',exact:true}).click();
  await page.evaluate(()=>{const p=panelDemo,bot=p.bot();bot.center.update({tasks:bot.center.view().tasks.map(e=>({...e.task,title:'同名任务'})),sources:{codex:'connected'}});});
  await page.waitForFunction(()=>panelDemo.frames.panel.contentDocument.querySelectorAll('.board-card').length===2);
  if(errors.length)throw Error(errors.join('\n'));
  return {singleCardAcrossThreeReruns:true,continuationGesture:true,retainedRunning:true,latestCompletionOnly:true,legacyMigration:true,acknowledgedRestart:true,openRace:true,confirmationRace:true,lateCompletionIgnored:true,saveRetry:true,distinctSameTitleTasks:true,errors};
}
