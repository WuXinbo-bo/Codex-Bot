async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>Boolean(window.panelDemo));
  await page.getByRole('button',{name:'展开面板',exact:true}).click();
  const frame=page.frameLocator('iframe[title="panel"]');
  await frame.getByRole('button',{name:'设置与连接诊断',exact:true}).click();
  await frame.getByRole('button',{name:'关于更新',exact:true}).click();
  await frame.getByRole('button',{name:'检查更新',exact:true}).click();
  await frame.locator('#updateDownload').waitFor({state:'visible'});
  await page.locator('iframe[title="panel"]').screenshot({path:'output/playwright/update-available.png'});
  await frame.locator('#updateAutoDownload').check();
  await page.waitForFunction(()=>panelDemo.stored['config.json'].updates.autoDownload);
  await frame.locator('#updateDownload').click();
  await frame.locator('#updateInstall').waitFor({state:'visible'});
  if(await page.evaluate(()=>panelDemo.events.some(e=>e.topic==='test:update-install')))throw Error('Installed without confirmation');
  await frame.locator('#updateInstall').click();await frame.locator('#updateCancelInstall').click();
  if(await page.evaluate(()=>panelDemo.events.some(e=>e.topic==='test:update-install')))throw Error('Installed after cancelling');
  const dims=await page.evaluate(()=>{const d=panelDemo.frames.panel.contentDocument,s=d.querySelector('[data-settings-section="updates"]');return {client:s.clientWidth,scroll:s.scrollWidth};});
  if(dims.scroll>dims.client+1)throw Error('Horizontal overflow '+JSON.stringify(dims));
  await page.locator('iframe[title="panel"]').screenshot({path:'output/playwright/update-ready.png'});
  await frame.locator('#updateInstall').click();await frame.locator('#updateConfirmInstall').click();
  await page.waitForFunction(()=>panelDemo.events.some(e=>e.topic==='test:update-install'));
  const denied=await page.evaluate(async()=>{try{await panelDemo.bot().action('toast','update-install',[true]);return false;}catch{return true;}});
  if(!denied||errors.length)throw Error(JSON.stringify({denied,errors}));
  return {passed:true,confirmation:true,progress:true,unauthorizedWindowDenied:denied};
}
