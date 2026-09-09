async (page) => {
 await page.addInitScript(()=>{
  let saved=JSON.parse(localStorage.getItem('mask-test-settings')||'{}');
  window.metaBot={getNotificationSettings:async()=>({retainCompletions:true,appearance:saved}),setAppearance:async a=>{saved=a;localStorage.setItem('mask-test-settings',JSON.stringify(a));return{ok:true}},onStatus(){},onPlacement(){},onDiagnostic(){},onRefreshState(){}};
 });
 await page.goto('http://127.0.0.1:4187/src/panel.html');await page.setViewportSize({width:320,height:190});
 await page.getByRole('button',{name:'设置与连接诊断',exact:true}).click();await page.getByRole('button',{name:'外观皮肤',exact:true}).click();
 await page.locator('#maskStyle').selectOption('holo');await page.locator('#maskFrequency').selectOption('rare');await page.locator('#maskAuto').uncheck();
 await page.reload();await page.getByRole('button',{name:'设置与连接诊断',exact:true}).click();await page.getByRole('button',{name:'外观皮肤',exact:true}).click();
 if(await page.locator('#maskStyle').inputValue()!=='holo'||await page.locator('#maskFrequency').inputValue()!=='rare'||await page.locator('#maskAuto').isChecked())throw Error('Settings did not round trip');
 await page.locator('#maskFrequency').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/mask-settings.png'});
 return 'mask settings persist and remain reachable in 320x190 panel';
}
