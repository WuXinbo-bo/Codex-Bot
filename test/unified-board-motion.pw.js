async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1100,height:780});
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>Boolean(window.panelDemo));
  const panel=page.frameLocator('iframe[title="panel"]');
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug?.getExpressionState().activity?.priority===55);
  const start=await page.evaluate(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity.name);
  const pixelsA=await page.locator('iframe[title="ball"]').screenshot();
  await page.waitForTimeout(380);
  const pixelsB=await page.locator('iframe[title="ball"]').screenshot();
  if(pixelsA.equals(pixelsB))throw Error('Robot did not render actual motion');
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await panel.locator('[data-status="completed"]').waitFor({state:'visible'});
  await page.waitForFunction(()=>{const w=panelDemo.frames.ball.contentWindow,s=w.__metaBotDebug.getExpressionState();return s.activity?.priority===55&&(w.MetaBotActivities.PERFORMANCES.completed.some(id=>'performance_'+id===s.activity.name)||['work_review','work_recovered','work_relief'].some(id=>'performance_companion_'+id===s.activity.name));});
  const finish=await page.evaluate(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity.name);
  await page.locator('#stage').screenshot({path:'output/playwright/unified-board-acting.png'});
  await page.mouse.move(1050,740);
  await page.evaluate(async()=>{
    const bot=panelDemo.bot();await bot.action('panel','completion-preferences',[{completionEscalation:'angry'}]);
    for(const item of bot.inbox.items.values())item.receivedAt=Date.now()-121000;
  });
  await page.waitForFunction(()=>panelDemo.events.some(e=>e.topic==='completion:nudge'&&e.target==='panel'));
  await page.waitForFunction(()=>panelDemo.frames.panel.contentDocument.querySelector('.board-card').getAnimations().length>0);
  await page.locator('#stage').screenshot({path:'output/playwright/unified-board-nudge.png'});
  await page.waitForTimeout(2300);
  const nudgeCount=await page.evaluate(()=>panelDemo.events.filter(e=>e.topic==='completion:nudge'&&e.target==='panel').length);
  await page.waitForTimeout(1200);
  if(await page.evaluate(()=>panelDemo.events.filter(e=>e.topic==='completion:nudge'&&e.target==='panel').length)!==nudgeCount)throw Error('Nudge repeated after acknowledgement');
  await page.evaluate(async()=>{
    const bot=panelDemo.bot();await bot.action('panel','completion-preferences',[{boardAnimation:false}]);
    const w=panelDemo.frames.panel.contentWindow;
    w.MetaBotPanelMotion.play({phase:'visible',duration:0,version:100000});
    w.MetaBotPanelMotion.play({phase:'leaving',duration:100,version:99999});
  });
  await page.waitForTimeout(250);
  if(await panel.locator('main').evaluate(el=>getComputedStyle(el).opacity)!=='1')throw Error('Stale phase hid board');
  if(await panel.locator('.board-card').evaluate(el=>el.getAnimations({subtree:true}).length)!==0)throw Error('Disabled animations remain');
  // Reject an old running action after the same card has completed.
  const rejected=await page.evaluate(async()=>{
    const update=panelDemo.events.find(e=>e.topic==='board:update'&&e.data.rows.some(r=>r.status==='running'));
    const row=update.data.rows.find(r=>r.status==='running');
    return panelDemo.bot().action('panel','board-task',[{id:row.id,eventId:row.eventId,action:'copy'}]);
  });
  if(rejected.ok)throw Error('Stale action was accepted');
  await panel.getByRole('button',{name:'确认提醒',exact:true}).click();
  await page.waitForFunction(()=>!panelDemo.windows.panel.visible);
  const phases=await page.evaluate(()=>panelDemo.events.filter(e=>e.topic==='panel:phase'&&e.target==='panel').map(e=>e.data));
  for(const phase of ['preparing','entering','visible','leaving','hidden'])if(!phases.some(e=>e.phase===phase))throw Error('Missing panel phase '+phase);
  if(phases.some(e=>e.duration>220))throw Error('Excessive native animation latency');
  const bounds=await page.evaluate(()=>panelDemo.events.filter(e=>e.topic==='window'&&e.data.action==='bounds'&&e.target==='panel').length);
  if(bounds>40)throw Error('Per-frame native movement regression: '+bounds);
  if(errors.length)throw Error(errors.join('\n'));
  return {start,finish,pixelsChanged:true,nudgeAcknowledged:true,reduced:true,stalePhaseRejected:true,staleActionRejected:true,bounds,errors};
}
