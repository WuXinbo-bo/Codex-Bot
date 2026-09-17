async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html?companion=1');await page.waitForFunction(()=>!!window.panelDemo);
  const panel=page.frameLocator('iframe[title="panel"]');
  if(await panel.locator('#companionGame,#companionGameSelect,#companionButton,#companionEnabled').count())throw Error('Retired game UI remains');
  if(await page.evaluate(()=>panelDemo.bot().companion.game!==undefined))throw Error('Game state remains');
  await panel.locator('#companionMouse').uncheck();await page.waitForFunction(()=>panelDemo.stored['companion.json']?.mouse===false);
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity?.name==='performance_companion_panel_receive');
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity?.name==='performance_companion_panel_stamp');
  await panel.getByRole('button',{name:'确认提醒',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getExpressionState().activity?.name==='performance_companion_panel_file');
  await page.evaluate(()=>{for(const id of ['panel','ball'])panelDemo.frames[id].srcdoc=panelDemo.frames[id].srcdoc;});
  await page.waitForFunction(()=>panelDemo.bot()?.companion.state.mouse===false);
  if(errors.length)throw Error(errors.join('\n'));return {gamesRemoved:true,mousePersisted:true,receive:true,stamp:true,file:true,errors};
}
