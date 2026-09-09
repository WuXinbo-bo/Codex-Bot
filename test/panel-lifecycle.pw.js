async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1100,height:850});
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>Boolean(window.panelDemo));
  await page.getByRole('button',{name:'多任务',exact:true}).click();
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.bot().inbox.items.size===2&&panelDemo.frames.completions.contentDocument.body.dataset.phase==='visible');
  const start=await page.evaluate(()=>panelDemo.events.length);
  await page.evaluate(async()=>{
    const bot=panelDemo.bot();
    await bot.action('panel','completion-preferences',[{autoCloseCompletions:true,completionCloseMinutes:1}]);
    for(const item of bot.inbox.items.values())item.receivedAt=Date.now()-86400000;
    await bot.action('panel','completion-preferences',[{}]);
    for(let i=0;i<6;i++)await bot.showPanel(i%2===0,true);
    await Promise.all([bot.showPanel(true),bot.showPanel(false),bot.showPanel(true)]);
    await bot.showPanel(true,true);
    await bot.action('panel','panel-view',[true]);await bot.action('panel','panel-view',[false]);
  });
  const inspect=()=>page.evaluate(()=>{
    const frame=panelDemo.frames.completions,doc=frame.contentDocument,main=doc.querySelector('main'),style=frame.contentWindow.getComputedStyle(main);
    const button=doc.querySelector('[aria-label="确认并接下一项"]'),r=button.getBoundingClientRect();
    return {visible:panelDemo.windows.completions.visible,opacity:style.opacity,phase:doc.body.dataset.phase,controls:r.top>=0&&r.bottom<=frame.contentWindow.innerHeight,count:panelDemo.bot().inbox.items.size};
  });
  let state=await inspect();if(!state.visible||state.opacity!=='1'||!state.controls||state.count!==2)throw Error('Retained surface not usable '+JSON.stringify(state));
  await page.frameLocator('iframe[title="completions"]').getByRole('button',{name:'确认并接下一项'}).click();
  await page.waitForFunction(()=>panelDemo.bot().inbox.items.size===1);
  state=await inspect();if(!state.visible||state.opacity!=='1')throw Error('Handoff hid the remaining completion');
  const hides=await page.evaluate(start=>panelDemo.events.slice(start).filter(e=>e.topic==='window'&&e.target==='completions'&&e.data.action==='hide').length,start);
  if(hides)throw Error('Completion window hidden without final acknowledgement');
  await page.evaluate(()=>{
    const bot=panelDemo.bot();bot.center.update({tasks:[{id:'urgent',source:'codex',title:'需要批准 · 保留直到处理',status:'needs_attention',turnId:'urgent-1',eventAt:new Date().toISOString()}],sources:{codex:'connected'},sourceHealth:{codex:{state:'connected'}}});
  });
  const toast=page.frameLocator('iframe[title="toast"]');
  await toast.getByRole('button',{name:'查看任务',exact:true}).waitFor({state:'visible'});
  await page.waitForTimeout(5200);
  if(!await page.evaluate(()=>panelDemo.windows.toast.visible&&panelDemo.frames.toast.contentWindow.getComputedStyle(panelDemo.frames.toast.contentDocument.querySelector('main')).opacity==='1'))throw Error('Urgent expired');
  await toast.getByRole('button',{name:'查看任务',exact:true}).click();
  if(!await page.evaluate(()=>panelDemo.windows.toast.visible))throw Error('Open dismissed urgent');
  await page.locator('#stage').screenshot({path:'output/playwright/panel-lifecycle-persistent.png'});
  await toast.getByRole('button',{name:'确认提醒',exact:true}).click();
  await page.waitForFunction(()=>!panelDemo.windows.toast.visible);
  state=await inspect();if(!state.visible||state.count!==1)throw Error('Urgent ack touched completion');
  await page.evaluate(()=>{
    const frame=panelDemo.frames.completions,m=frame.contentWindow.MetaBotPanelMotion;
    m.play({phase:'visible',duration:0,version:10000});m.play({phase:'leaving',duration:100,version:9999});
  });
  await page.waitForTimeout(200);if((await inspect()).opacity!=='1')throw Error('Stale animation hid surface');
  await page.evaluate(()=>{
    panelDemo.stored['config.json'].notifications.autoCloseCompletions=true;
    panelDemo.stored['config.json'].notifications.completionCloseMinutes=1;
    for(const label of ['completions','ball'])panelDemo.frames[label].srcdoc=panelDemo.frames[label].srcdoc;
  });
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__nativeBot?.inbox.items.size===1&&panelDemo.frames.completions.contentDocument.body.dataset.phase==='visible');
  if(await page.evaluate(()=>panelDemo.stored['config.json'].notifications.autoCloseCompletions))throw Error('Legacy settings did not migrate');
  state=await inspect();if(!state.controls||state.opacity!=='1')throw Error('Restart did not restore usable completion');
  if(errors.length)throw Error(errors.join('\n'));return {retained:true,unexpectedHides:hides,urgentRetained:true,staleAnimationRejected:true,restart:true,errors};
}
