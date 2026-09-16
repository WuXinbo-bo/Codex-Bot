async(page)=>{
  let stage='initialization';try{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1100,height:800});
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html?companion=1');
  await page.waitForFunction(()=>!!window.panelDemo);
  const panel=page.frameLocator('iframe[title="panel"]'),ball=page.frameLocator('iframe[title="ball"]');
  await panel.locator('.companion-tools').waitFor({state:'visible'});
  if(await panel.locator('#spaceButtons,#startHourglass,#taskNote,#companionInspect').count())throw Error('Removed tool still appears');
  if(await ball.locator('.companion-space').count())throw Error('Living space remains on avatar');
  if(await panel.locator('#companionGameSelect option').count()!==12)throw Error('Missing games');
  await panel.locator('#companionGameSelect').selectOption('catch');
  await panel.getByRole('button',{name:'开始',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.bot().companion.game?.id==='catch');
  await panel.locator('#companionGame').scrollIntoViewIfNeeded();
  const target=await page.evaluate(()=>panelDemo.bot().companion.gameView().target),r=await panel.locator('#companionGame').boundingBox();
  await page.mouse.click(r.x+r.width*target/100,r.y+r.height/2);
  stage='game score';
  await page.waitForFunction(()=>panelDemo.bot().companion.game?.score===1);
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  stage='task interruption';
  await page.waitForFunction(()=>!panelDemo.bot().companion.game);
  stage='receive performance';
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity?.name==='performance_companion_panel_receive');
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await panel.locator('[data-status="completed"]').waitFor();
  stage='stamp performance';
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity?.name==='performance_companion_panel_stamp');
  await panel.locator('[data-status="completed"]').getByRole('button',{name:'确认提醒',exact:true}).click();
  stage='file performance';
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity?.name==='performance_companion_panel_file');
  await panel.locator('#companionEnabled').uncheck();
  await page.waitForFunction(()=>panelDemo.stored['companion.json']?.enabled===false);
  if(await panel.getByRole('button',{name:'开始',exact:true}).isEnabled())throw Error('Disabled games can still start');
  if(await panel.locator('#companionMouse').isChecked()!==true)throw Error('Disabling games also disabled mouse reactions');
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity?.name==='performance_companion_panel_receive');
  await panel.locator('#companionMouse').uncheck();
  await page.waitForFunction(()=>panelDemo.stored['companion.json']?.mouse===false);
  await page.evaluate(()=>{for(const id of ['panel','ball'])panelDemo.frames[id].srcdoc=panelDemo.frames[id].srcdoc;});
  await page.waitForFunction(()=>panelDemo.bot()?.companion.state.mouse===false);
  if(errors.length)throw Error(errors.join('\n'));
  return {removedTools:true,removedLivingSpace:true,games:12,scored:true,taskInterrupt:true,receive:true,stamp:true,file:true,independentPreferences:true,persistedMouse:true,errors};
  }catch(error){throw Error(stage+': '+error.message);}
}
