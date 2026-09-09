async (page) => {
  await page.setViewportSize({width:348,height:326});
  await page.addInitScript(() => {
    window.metaBot = { getNotificationSettings:async()=>({retainCompletions:true}), onStatus:fn=>window.renderTest=fn, onPlacement:()=>{}, onDiagnostic:()=>{}, onRefreshState:()=>{} };
  });
  await page.goto('http://127.0.0.1:4187/src/panel.html');
  await page.evaluate(() => {
    const task = {id:'quiet-test',source:'codex',title:'Quiet task',status:'running',quiet:true,projectName:'Project',turnId:'one'};
    renderTest({tasks:[{key:'one',task,active:true}],activeCount:1,sources:{codex:'connected'},sourceHealth:{codex:{state:'connected',runtime:'Tauri 0.2.0',lastSuccessAt:new Date().toISOString(),coverage:{unknown:0,pending:0}}}});
  });
  if (!(await page.locator('#taskStatus').textContent()).includes('暂无新输出')) throw new Error('Quiet task label missing');
  if ((await page.locator('#subtitle').textContent()).includes('已同步')) throw new Error('Transport misrepresented as runtime authority');
  await page.screenshot({path:'output/playwright/quiet-panel.png'});
  return {status:await page.locator('#taskStatus').textContent(),subtitle:await page.locator('#subtitle').textContent()};
}
