async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>Boolean(window.panelDemo));
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.windows.toast?.visible);
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.windows.completions?.visible);
  await page.getByRole('button',{name:'展开面板',exact:true}).click();
  const frame=page.frameLocator('iframe[title="panel"]');
  await frame.getByRole('button',{name:'设置与连接诊断',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.windows.panel.height===380);
  for(const label of ['连接与同步','外观皮肤','动作与随机']){
    await frame.getByRole('button',{name:label,exact:true}).click();
    const dimensions=await page.evaluate(()=>{
      const d=panelDemo.frames.panel.contentDocument,w=panelDemo.frames.panel.contentWindow,section=d.getElementById('diagnostics');
      return {height:section.clientHeight,width:section.clientWidth,scrollWidth:section.scrollWidth,buttonFont:parseFloat(w.getComputedStyle(d.getElementById('setupReopen')).fontSize),completion:panelDemo.windows.completions.visible};
    });
    if(dimensions.height<250||dimensions.scrollWidth>dimensions.width+1||dimensions.buttonFont>13||!dimensions.completion)throw Error(JSON.stringify(dimensions));
    await page.locator('iframe[title="panel"]').screenshot({path:`output/playwright/settings-${label}.png`});
  }
  await frame.getByRole('button',{name:'外观皮肤',exact:true}).click();
  await frame.locator('#shapeSelect').selectOption('cushion');
  await page.waitForFunction(()=>panelDemo.stored['config.json'].appearance.shape==='cushion');
  await frame.getByRole('button',{name:'设置与连接诊断',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.windows.panel.height===154);
  if(!await page.evaluate(()=>panelDemo.windows.completions.visible))throw Error('Closing settings dismissed completion');
  const rejected=await page.evaluate(async()=>{try{await panelDemo.bot().action('toast','panel-view',[true]);return false;}catch{return true;}});
  if(!rejected||errors.length)throw Error(JSON.stringify({rejected,errors}));
  return {passed:true,tabs:3,settingsHeight:380,taskHeight:154};
}
