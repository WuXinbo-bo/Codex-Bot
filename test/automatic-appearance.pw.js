async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1100,height:850});
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>Boolean(window.panelDemo));
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.windows.toast?.visible);
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.windows.completions?.visible);
  await page.getByRole('button',{name:'展开面板',exact:true}).click();
  const panel=page.frameLocator('iframe[title="panel"]');
  await panel.getByRole('button',{name:'设置与连接诊断',exact:true}).click();
  await panel.locator('[data-settings-tab="appearance"]').click();
  await page.waitForFunction(()=>panelDemo.frames.panel.contentWindow.__appearancePreview?.state().active);
  await page.evaluate(()=>{
    const w=panelDemo.frames.panel.contentWindow,host=w.document.createElement('div');w.document.body.append(host);
    let time=0;const appearance={artStyle:'classic',shape:'circle',maskAuto:false};
    const bot=w.MetaBotM1.create(host,{now:()=>time,appearance});
    bot.setMask(w.MetaBotMaskSystem.names[0],'classic');
    if(!bot.getMaskState().current)throw Error('Test mask did not start');
    for(let i=0;i<15;i++){time+=30;bot.setExpression('curious',{appearance:{...appearance,skin:i%2?'lemon':'pink'}});}
    if(!bot.getMaskState().current)throw Error('Resolved appearance reset the active mask');
    bot.destroy();host.remove();
  });
  const inspect=()=>page.evaluate(()=>({settings:panelDemo.stored['config.json'].appearance,preview:panelDemo.frames.panel.contentWindow.__appearancePreview.state(),runtime:panelDemo.frames.ball.contentWindow.__metaBotDebug.getPerformanceState().appearance,completion:panelDemo.windows.completions.visible}));
  const initial=await inspect();
  if(initial.settings.artStyle!=='auto'||initial.settings.eyeStyle!=='auto'||initial.settings.skin!=='lemon')throw Error('Defaults did not migrate');
  if(await panel.locator('#artStyle').isVisible()||await panel.locator('#eyeStyle').isVisible())throw Error('Fixed presets should be collapsed');
  await panel.getByRole('button',{name:'换一套预览',exact:true}).click();
  const shuffled=await inspect();
  if(JSON.stringify(initial.settings)!==JSON.stringify(shuffled.settings)||initial.preview.runtime.current.artStyle===shuffled.preview.runtime.current.artStyle)throw Error('Shuffle persisted or failed to rotate');
  await panel.getByRole('button',{name:'固定当前预览',exact:true}).click();
  const pinned=await inspect();
  if(pinned.preview.draft.artStyle!==pinned.preview.runtime.current.artStyle||pinned.settings.artStyle!=='auto')throw Error('Pin did not remain a draft');
  await panel.getByRole('button',{name:'应用',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.stored['config.json'].appearance.artStyle!=='auto');
  const applied=await inspect();
  for(const key of ['artStyle','eyeStyle','shape','skin'])if(applied.settings[key]!==applied.runtime.current[key])throw Error('Live appearance diverged: '+key);
  await panel.getByRole('button',{name:'恢复自动外观，保留颜色',exact:true}).click();
  await panel.getByRole('button',{name:'撤销未应用修改',exact:true}).click();
  if((await inspect()).preview.draft.artStyle!==applied.settings.artStyle)throw Error('Discard lost saved appearance');
  await panel.getByRole('button',{name:'恢复自动外观，保留颜色',exact:true}).click();
  await panel.locator('#skinMode').selectOption('auto');
  await panel.getByRole('button',{name:'应用',exact:true}).click();
  if((await inspect()).settings.skin!=='auto')throw Error('Random skin did not persist');
  await panel.locator('#skinMode').selectOption('fixed');
  await panel.getByRole('button',{name:'柠檬黄',exact:true}).click();
  await panel.getByRole('button',{name:'应用',exact:true}).click();
  for(const width of [1100,390]){
    await page.setViewportSize({width,height:850});
    await panel.locator('#diagnostics').evaluate(node=>{node.scrollTop=0;});
    const bounds=await page.evaluate(()=>{const doc=panelDemo.frames.panel.contentDocument,d=doc.getElementById('diagnostics');return {width:d.clientWidth,scroll:d.scrollWidth,svg:doc.querySelector('#appearancePreview svg')?.getBoundingClientRect().width};});
    if(bounds.scroll>bounds.width+1||!bounds.svg)throw Error('Settings overflow or blank preview '+JSON.stringify(bounds));
    await page.locator('iframe[title="panel"]').screenshot({path:`output/playwright/automatic-appearance-${width}.png`});
  }
  await page.setViewportSize({width:1100,height:850});
  await panel.locator('[data-settings-tab="motion"]').click();
  if((await inspect()).preview.active)throw Error('Hidden preview still active');
  for(const mode of ['quiet','lively','natural']){
    await panel.locator('#companionMode').selectOption(mode);
    await panel.getByRole('button',{name:'应用',exact:true}).click();
    if((await inspect()).settings.companionMode!==mode)throw Error('Mode did not persist');
  }
  await panel.locator('#reducedMotion').check();await panel.getByRole('button',{name:'应用',exact:true}).click();
  if(!await page.evaluate(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getMotionLevel()==='reduced'))throw Error('Accessibility not connected');
  await panel.locator('#reducedMotion').uncheck();await panel.getByRole('button',{name:'应用',exact:true}).click();
  await page.locator('iframe[title="panel"]').screenshot({path:'output/playwright/companion-mode.png'});
  await panel.locator('[data-settings-tab="appearance"]').click();
  await panel.locator('#artMode').selectOption('fixed');await panel.locator('#artStyle').selectOption('clay');
  await page.evaluate(()=>{const w=panelDemo.frames.panel.contentWindow;w.realSetAppearance=w.metaBot.setAppearance;w.metaBot.setAppearance=async()=>({ok:false,error:'测试保存失败'});});
  await panel.getByRole('button',{name:'应用',exact:true}).click();
  if((await inspect()).settings.artStyle!=='auto'||!await panel.locator('[data-settings-section="appearance"]').getByText('测试保存失败',{exact:true}).isVisible())throw Error('Save failure lost draft or reported success');
  await page.evaluate(()=>{const w=panelDemo.frames.panel.contentWindow;w.metaBot.setAppearance=w.realSetAppearance;});
  await panel.getByRole('button',{name:'撤销未应用修改',exact:true}).click();
  await panel.getByRole('button',{name:'设置与连接诊断',exact:true}).click();
  if((await inspect()).preview.active||!(await inspect()).completion)throw Error('Hidden preview or completion retention failed');
  await page.evaluate(()=>{const f=panelDemo.frames.ball;f.srcdoc=f.srcdoc;});
  await page.waitForFunction(()=>Boolean(panelDemo.frames.ball.contentWindow.__metaBotDebug?.getPerformanceState().appearance));
  if((await inspect()).settings.artStyle!=='auto'||!(await inspect()).completion)throw Error('Restart lost automatic preference or retained completion');
  if(errors.length)throw Error(errors.join('\n'));
  return {draftIsolation:true,liveApply:true,automaticRestart:true,modes:3,accessibility:true,saveFailure:true,completionRetained:true,errors};
}
