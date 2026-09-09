async(page)=>{
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>Boolean(window.panelDemo));
  await page.getByRole('button',{name:'多任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.windows.toast?.visible);
  if(await page.evaluate(()=>panelDemo.windows.toast.width)!==280)throw Error('Toast width');
  await page.getByRole('button',{name:'完成任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.windows.completions?.visible);
  await page.getByRole('button',{name:'展开面板',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.windows.panel?.visible);
  await page.waitForFunction(()=>panelDemo.frames.panel.contentDocument.body.dataset.phase==='visible');
  const widths=await page.evaluate(()=>['panel','completions','toast'].map(id=>panelDemo.frames[id].contentDocument.querySelector('main').getBoundingClientRect().width));
  if(Math.max(...widths)-Math.min(...widths)>1)throw Error('Visible surface widths differ '+widths);
  const start=await page.evaluate(()=>({index:panelDemo.events.length,count:panelDemo.bot().inbox.items.size}));
  await page.evaluate(()=>{window.navigationEvents=[];panelDemo.frames.ball.contentWindow.metaBot.onInteraction(e=>navigationEvents.push(e.type));});
  for(const name of ['下一项，保留未确认','上一项，保留未确认']){
    await page.frameLocator('iframe[title="completions"]').getByRole('button',{name,exact:true}).click();
  }
  await page.waitForFunction(()=>navigationEvents.filter(e=>e==='panel-switch').length===2);
  if(await page.evaluate(()=>panelDemo.bot().inbox.items.size)!==start.count)throw Error('Navigation acknowledged a completion');
  for(const [x,y] of [[0,0],[772,0],[772,392],[0,392]]){
    await page.evaluate(({x,y})=>{
      const g=panelDemo.bot().geometry();
      panelDemo.mouse({kind:'down',x:g.x+64,y:g.y+64});
      panelDemo.mouse({kind:'move',x:x+64,y:y+64});
      panelDemo.mouse({kind:'up',x:x+64,y:y+64});
    },{x,y});
    await page.waitForFunction(({x,y})=>panelDemo.bot().geometry().x===x&&panelDemo.bot().geometry().y===y,{x,y});
    await page.waitForTimeout(150);
    const state=await page.evaluate(()=>({panel:panelDemo.windows.panel,completion:panelDemo.windows.completions,count:panelDemo.bot().inbox.items.size}));
    if(!state.panel.visible||!state.completion.visible||state.count!==start.count)throw Error('Drag dismissed a panel');
    if(state.panel.width!==280||state.panel.height!==154||state.completion.width!==280)throw Error('Panel sizing');
  }
  const hidden=await page.evaluate(index=>panelDemo.events.slice(index).filter(e=>e.topic==='window'&&['panel','completions'].includes(e.target)&&e.data.action==='hide'),start.index);
  if(hidden.length)throw Error('Unexpected hide '+JSON.stringify(hidden));
  const shadows=await page.evaluate(()=>{
    const failures=[];
    for(const [label,frame] of Object.entries(panelDemo.frames))for(const el of frame.contentDocument.querySelectorAll('*'))for(const pseudo of [null,'::before','::after']){
      const s=frame.contentWindow.getComputedStyle(el,pseudo);
      if(s.boxShadow!=='none'||s.textShadow!=='none'||s.backdropFilter!=='none')failures.push(label+':'+el.tagName+':'+pseudo);
    }
    document.getElementById('stage').style.background='#202020';
    return failures;
  });
  if(shadows.length)throw Error('Unexpected surface shadows '+shadows.join(','));
  await page.screenshot({path:'output/playwright/panel-retained-corner.png'});
  await page.frameLocator('iframe[title="completions"]').getByRole('button',{name:'查看任务',exact:true}).click();
  await page.waitForTimeout(200);
  if(!await page.evaluate(()=>panelDemo.windows.completions.visible&&panelDemo.bot().inbox.items.size>0))throw Error('Opening acknowledged completion');
  await page.frameLocator('iframe[title="completions"]').getByRole('button',{name:'确认并接下一项'}).click();
  await page.waitForFunction(()=>panelDemo.bot().inbox.items.size===1&&panelDemo.frames.completions.contentDocument.body.dataset.phase==='visible');
  if(!await page.evaluate(()=>panelDemo.windows.panel.visible))throw Error('Handoff closed main panel');
  await page.frameLocator('iframe[title="completions"]').getByRole('button',{name:'确认并接下一项'}).click();
  await page.waitForFunction(()=>!panelDemo.windows.completions.visible);
  if(!await page.evaluate(()=>panelDemo.windows.panel.visible))throw Error('Acknowledgement closed main panel');
  return {passed:true,corners:4,unexpectedHides:hidden.length};
}
