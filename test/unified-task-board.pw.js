async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1100,height:780});
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>Boolean(window.panelDemo));
  const panel=page.frameLocator('iframe[title="panel"]');
  const report={};
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  await panel.locator('.board-card').waitFor({state:'visible'});
  if(await panel.getByRole('button',{name:'复制任务链接',exact:true}).count()!==1)throw Error('Missing inline actions');
  await page.waitForFunction(()=>!panelDemo.windows.panel.visible,{},{timeout:8000});
  report.transientExpired=true;
  await page.getByRole('button',{name:'展开面板',exact:true}).click();
  await page.waitForTimeout(4300);
  if(!await page.evaluate(()=>panelDemo.windows.panel.visible))throw Error('Manual panel auto-closed');
  report.manualRetained=true;
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await panel.locator('[data-status="completed"]').waitFor({state:'visible'});
  await page.waitForFunction(()=>panelDemo.bot().inbox.items.size===1);
  await page.getByRole('button',{name:'收起面板',exact:true}).click();
  if(!await page.evaluate(()=>panelDemo.bot().inbox.items.size===1&&panelDemo.windows.panel.visible))throw Error('Collapse acknowledged completion');
  await panel.getByRole('button',{name:'查看任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.bot().inbox.items.size===0&&panelDemo.stored['completion-inbox.json'].length===0);
  report.openAcknowledged=true;
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await panel.locator('[data-status="completed"]').waitFor({state:'visible'});
  await panel.getByRole('button',{name:'设置与连接诊断',exact:true}).click();
  await panel.locator('#diagnostics').waitFor({state:'visible'});
  if(!await panel.locator('[data-status="completed"]').isVisible())throw Error('Settings hid pending card');
  await page.locator('#stage').screenshot({path:'output/playwright/unified-board-settings.png'});
  await panel.getByRole('button',{name:'设置与连接诊断',exact:true}).click();
  report.settingsRetained=true;
  await page.getByRole('button',{name:'多任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.frames.panel.contentDocument.querySelectorAll('.board-card').length===3);
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.bot().inbox.items.size===3);
  const shape=await panel.locator('.board-card').first().evaluate(el=>({color:getComputedStyle(el).backgroundColor,shadow:getComputedStyle(el).boxShadow,width:el.getBoundingClientRect().width}));
  if(shape.color!=='rgb(237, 248, 239)'||shape.shadow!=='none'||shape.width>270)throw Error('Card visual contract '+JSON.stringify(shape));
  await page.locator('#stage').screenshot({path:'output/playwright/unified-board-completions.png'});
  await page.evaluate(async()=>{
    const bot=panelDemo.bot();
    for(const pos of [{x:0,y:0},{x:770,y:0},{x:770,y:390},{x:0,y:390}]){
      await bot.move(pos,true);
      if(!panelDemo.windows.panel.visible||panelDemo.windows.completions?.visible||panelDemo.windows.toast?.visible)throw Error('Unexpected separate window');
    }
    await bot.move({x:60,y:130},true);
    const before=panelDemo.windows.panel.x;
    await bot.action('panel','board-drag',[{phase:'start',x:100,y:100}]);
    await bot.action('panel','board-drag',[{phase:'end',x:120,y:100}]);
    if(panelDemo.windows.panel.x-before!==20)throw Error('Board drag did not move panel');
    await bot.action('panel','board-drag',[{phase:'reset'}]);
  });
  report.dragAndCorners=true;
  await panel.getByRole('button',{name:'确认提醒',exact:true}).first().click();
  await page.waitForFunction(()=>panelDemo.bot().inbox.items.size===2);
  if(!await page.evaluate(()=>panelDemo.windows.panel.visible))throw Error('Acknowledgement hid remaining cards');
  report.perTurnRetention=true;
  await page.evaluate(()=>{
    for(const label of ['panel','ball'])panelDemo.frames[label].srcdoc=panelDemo.frames[label].srcdoc;
  });
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__nativeBot?.inbox.items.size===2&&panelDemo.frames.panel.contentDocument.querySelectorAll('[data-status="completed"]').length===2);
  report.restartRestored=true;
  await page.evaluate(async()=>{
    const bot=panelDemo.bot();await bot.showPanel(false);
    for(const item of [...bot.inbox.items.values()])await bot.action('panel','completion',[item.id,'ack']);
    bot.center.update({tasks:[{source:'codex',id:'urgent',turnId:'u1',status:'needs_attention',title:'需要批准',eventAt:new Date().toISOString()}],sources:{codex:'connected'},sourceHealth:{codex:{state:'connected'}}});
  });
  await panel.locator('[data-status="needs_attention"]').waitFor({state:'visible'});
  await panel.getByRole('button',{name:'5 分钟后提醒',exact:true}).click();
  await page.waitForFunction(()=>!panelDemo.windows.panel.visible);
  await page.evaluate(()=>{
    const bot=panelDemo.bot(),task={...bot.center.view().tasks[0].task,status:'running'};
    bot.center.update({tasks:[task],sources:{codex:'connected'},sourceHealth:{codex:{state:'connected'}}});
  });
  await panel.locator('[data-status="running"]').waitFor({state:'visible'});
  if(!await page.evaluate(()=>panelDemo.events.some(e=>e.topic==='board:update'&&e.data.rows.some(r=>r.kind==='resumed'))))throw Error('Resume not connected');
  report.resumeAndSnooze=true;
  await page.mouse.move(1050,740);
  await page.waitForFunction(()=>!panelDemo.windows.panel.visible,{},{timeout:9000});
  // Enter in the same browser turn as rendering: paced automation calls can
  // otherwise consume the entire four-second notice before hover arrives.
  await page.evaluate(async()=>{
    await panelDemo.act('start');
    const w=panelDemo.frames.panel.contentWindow;
    while(!w.document.querySelector('.board-card'))await new Promise(w.requestAnimationFrame);
    w.document.querySelector('#panel').dispatchEvent(new w.PointerEvent('pointerenter'));
  });
  await page.waitForTimeout(4400);
  if(!await page.evaluate(()=>panelDemo.windows.panel.visible))throw Error('Hover did not pause timer');
  await page.evaluate(()=>{const w=panelDemo.frames.panel.contentWindow;w.document.querySelector('#panel').dispatchEvent(new w.PointerEvent('pointerleave'));});
  await page.waitForFunction(()=>!panelDemo.windows.panel.visible,{},{timeout:7000});
  report.hoverPauses=true;
  await page.getByRole('button',{name:'多任务',exact:true}).click();
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await panel.locator('[data-status="completed"]').first().waitFor({state:'visible'});
  await page.waitForTimeout(4300);
  if(!await page.evaluate(()=>panelDemo.windows.panel.visible))throw Error('Old start timer hid completion');
  await page.setViewportSize({width:390,height:740});
  await page.evaluate(()=>panelDemo.bot().move({x:0,y:100},true));
  await panel.locator('[data-status="completed"]').first().screenshot({path:'output/playwright/unified-board-mobile-card.png'});
  report.rapidCompletion=true;
  if(errors.length)throw Error(errors.join('\n'));
  return {...report,errors};
}
