async (page) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    let listener;window.setupCalls=[];
    window.metaBot={
      onStatus:()=>{},onPlacement:()=>{},onDiagnostic:()=>{},onRefreshState:()=>{},
      onSetup:fn=>{listener=fn;setTimeout(()=>fn(true),0);},
      setup:async v=>listener(v),
      inspectConnection:async()=>({state:'connected',executableFound:true,homeReadable:true,watching:true,activeCount:0,executable:'C:/Program Files/Codex/codex.exe',codexHome:'C:/Users/测试/.codex',configured:{}}),
      refresh:async()=>{},
      saveConnectionPaths:async p=>setupCalls.push(p),
      pickConnectionPath:async()=>null,
      finishSetup:async(status,verified)=>{setupCalls.push({status,verified});listener(false);},
      copyConnectionDiagnostic:async()=>true
    };
  });
  await page.setViewportSize({width:400,height:520});
  await page.goto('http://127.0.0.1:4187/src/panel.html');
  await page.getByText('连接可用，目前没有进行中任务。',{exact:false}).waitFor();
  if(!(await page.getByRole('button',{name:'完成验证',exact:true}).isDisabled()))throw Error('Unchecked verification enabled');
  await page.getByText('自动检测不正确？手动修复路径').click();
  await page.locator('#setupExecutable').fill('C:/测试 path/codex.exe');
  await page.getByRole('button',{name:'选择程序',exact:true}).click();
  if(await page.locator('#setupExecutable').inputValue()!=='C:/测试 path/codex.exe')throw Error('Cancel erased path');
  await page.getByRole('button',{name:'保存并重新连接'}).click();
  await page.waitForFunction(()=>setupCalls.length===1);
  await page.locator('#setup').evaluate(e=>e.scrollTop=0);
  await page.screenshot({path:'output/playwright/onboarding-connected.png'});
  await page.getByRole('checkbox',{name:'我已逐项确认开始、完成、查看任务、确认清除'}).check();
  await page.getByRole('button',{name:'完成验证',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('setup').hidden);
  if(errors.length)throw Error(errors.join('\n'));
  return {passed:true,checks:['zero-tasks','manual-path','cancel-picker','save','human-verification','return-to-panel'],errors};
}
