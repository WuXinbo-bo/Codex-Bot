async(page)=>{
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>Boolean(window.panelDemo));
  await page.evaluate(()=>panelDemo.bot().action('panel','setup',[true]));
  const f=page.frameLocator('iframe[title="panel"]');
  await f.locator('#setup').waitFor({state:'visible'});
  await f.getByRole('button',{name:'稍后',exact:true}).waitFor({state:'visible'});
  const defaults=await page.evaluate(()=>({width:panelDemo.windows.panel.width,height:panelDemo.windows.panel.height,skin:panelDemo.frames.ball.contentDocument.querySelector('#ball svg').dataset.skin}));
  if(defaults.width!==360||defaults.height!==430||defaults.skin!=='lemon')throw Error(JSON.stringify(defaults));
  const result=await page.evaluate(()=>{
    const d=panelDemo.frames.panel.contentDocument,box=d.getElementById('setup'),done=d.getElementById('setupDone');
    return {expanded:d.querySelectorAll('#setup details[open]').length,scroll:box.scrollHeight>box.clientHeight,doneBottom:done.getBoundingClientRect().bottom,height:box.clientHeight};
  });
  if(result.expanded||result.scroll||result.doneBottom>result.height)throw Error(JSON.stringify(result));
  await page.locator('iframe[title="panel"]').screenshot({path:'output/playwright/setup-compact.png'});
  await f.getByText('连接详情与修复',{exact:true}).click();
  await f.locator('#setupExecutable').waitFor({state:'visible'});
  await f.getByText('连接详情与修复',{exact:true}).click();
  await f.getByRole('button',{name:'稍后',exact:true}).click();
  await f.locator('#setup').waitFor({state:'hidden'});
  return {passed:true,...result};
}
