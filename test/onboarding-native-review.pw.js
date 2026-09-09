async (page) => {
  const browser=await page.context().browser().browserType().connectOverCDP('http://127.0.0.1:9226');
  const pages=browser.contexts().flatMap(c=>c.pages());
  const ball=pages.find(p=>p.url()==='http://tauri.localhost/' || p.url().endsWith('/index.html'));
  const panel=pages.find(p=>p.url().endsWith('/panel.html'));
  if(!ball||!panel)throw Error('Missing native windows');
  await ball.waitForFunction(()=>Boolean(window.__nativeBot),null,{timeout:60000});
  await panel.evaluate(()=>metaBot.setup(true));
  await panel.waitForFunction(()=>!document.getElementById('setup').hidden && document.getElementById('setupChecks').textContent.includes('查询通道'));
  const environment=await panel.evaluate(()=>metaBot.inspectConnection());
  if(!environment.executableFound||!environment.homeReadable||environment.state!=='connected')throw Error('Native discovery failed');
  await panel.locator('#setup').evaluate(e=>e.scrollTop=0);
  await panel.screenshot({path:'output/playwright/onboarding-native.png'});
  await panel.evaluate(()=>metaBot.saveConnectionPaths({executable:'',codexHome:''}));
  const recovered=await panel.evaluate(()=>metaBot.inspectConnection());
  if(recovered.state!=='connected')throw Error('Native save and reconnect failed');
  await panel.evaluate(()=>metaBot.finishSetup('skipped',false));
  const saved=await ball.evaluate(async()=>(await __TAURI__.core.invoke('native_op',{op:'bootstrap',args:{}})).stored['config.json']);
  if(saved.onboarding?.status!=='skipped')throw Error('Native skip not persisted');
  const size=await ball.evaluate(()=>__TAURI__.core.invoke('native_op',{op:'inspect',args:{}}));
  const scale=await ball.evaluate(()=>__nativeBot.geometry().scale);
  if(Math.abs(size.panel.width-320*scale)>2)throw Error('Compact panel not restored');
  await ball.evaluate(()=>__TAURI__.core.invoke('native_op',{op:'quit',args:{}}));
  return {passed:true,source:environment.state,reconnected:recovered.state,onboarding:saved.onboarding.status,compactWidth:size.panel.width};
}
