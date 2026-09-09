async(page)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/m1-visual.html');
  await page.waitForFunction(()=>Boolean(window.review));
  await page.evaluate(()=>review.showCatalog('artStyles'));
  if(await page.locator('#artStyles figure').count()!==5)throw Error('Missing styles');
  await page.locator('#artStyles').screenshot({path:'output/playwright/companion-art-styles.png'});
  for(const style of ['mime','clay','pixel','rubber']){
    await page.locator('#artPreview').selectOption(style);await page.locator('#activitySelect').selectOption('performance_start_card');await page.locator('#play').click();
    await page.waitForTimeout(900);
    if(await page.locator('#preview svg').getAttribute('data-art-style')!==style)throw Error('Style not applied '+style);
    if(await page.locator('#preview').evaluate(node=>/NaN|Infinity/.test(node.innerHTML)))throw Error('Geometry '+style);
    await page.locator('#preview').screenshot({path:'output/playwright/companion-style-'+style+'.png'});
  }
  await page.locator('#artPreview').selectOption('classic');
  await page.evaluate(()=>{review.startInteractive('idle');review.previewDirector.interact('activity-request',{name:'story_practice'});});
  await page.waitForTimeout(5700);
  await page.evaluate(()=>review.previewDirector.interact('task-lifecycle',{events:[{id:'practice-delivery',kind:'completed',taskId:'demo'}]}));
  await page.waitForFunction(()=>review.previewDirector.getState().activity?.name==='story_delivery');
  await page.waitForTimeout(900);await page.locator('#preview').screenshot({path:'output/playwright/companion-story-delivery.png'});
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');await page.waitForFunction(()=>Boolean(window.panelDemo));
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.windows.toast?.visible);
  await page.getByRole('button',{name:'展开面板',exact:true}).click();
  const panel=page.frameLocator('iframe[title="panel"]');
  await panel.getByRole('button',{name:'设置与连接诊断',exact:true}).click();
  await panel.locator('[data-settings-tab="appearance"]').click();await panel.locator('#artMode').selectOption('fixed');await panel.locator('#artStyle').selectOption('clay');
  await panel.getByRole('button',{name:'应用',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.stored['config.json'].appearance.artStyle==='clay'&&panelDemo.frames.ball.contentDocument.querySelector('svg[data-art-style="clay"]'));
  await panel.locator('[data-settings-tab="motion"]').click();await panel.locator('#companionMode').selectOption('quiet');
  await panel.getByRole('button',{name:'应用',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getPerformanceState().personality==='quiet');
  if(await panel.locator('[data-settings-tab="library"]').count())throw Error('Collection menu remains');
  await page.evaluate(()=>{const frame=panelDemo.frames.panel;frame.srcdoc=frame.srcdoc;});
  await page.waitForFunction(()=>panelDemo.frames.panel.contentDocument.querySelector('#artStyle')?.value==='clay');
  const unauthorized=await page.evaluate(async()=>{try{await panelDemo.bot().action('panel','performance-preference',['magic',{favorite:true}]);return false;}catch{return true;}});
  if(!unauthorized)throw Error('Retired collection API is still available');
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.frames.completions.contentDocument.body.dataset.phase==='visible');
  await page.frameLocator('iframe[title="completions"]').getByRole('button',{name:'确认并接下一项'}).click();
  await page.waitForFunction(()=>panelDemo.bot().inbox.items.size===0);
  await page.setViewportSize({width:390,height:844});
  await page.locator('iframe[title="panel"]').screenshot({path:'output/playwright/companion-panel-narrow.png'});
  if(errors.length)throw Error(errors.join('\n'));
  return {styles:5,storyDelivery:true,persisted:true,collectionRemoved:true,errors};
}
