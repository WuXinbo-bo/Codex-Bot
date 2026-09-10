async(page)=>{
  await page.setViewportSize({width:1400,height:1000});
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');await page.waitForFunction(()=>Boolean(window.panelDemo));
  await page.evaluate(async()=>{
    await panelDemo.frames.panel.contentWindow.metaBot.setAppearance({skin:'lemon',shape:'circle',eyeStyle:'classic',artStyle:'classic',maskAuto:false,companionMode:'natural'});
    document.getElementById('stage').style.cssText='position:relative;width:900px;height:520px;background:#f7f9fa;border-radius:0;overflow:hidden;transform:scale(2);transform-origin:top left';
    document.getElementById('wrap').style.overflow='visible';
    await panelDemo.act('start');
  });
  await page.waitForTimeout(800);await page.evaluate(()=>panelDemo.act('finish'));
  await page.waitForFunction(()=>panelDemo.windows.completions?.visible);await page.waitForTimeout(1800);
  const stage=await page.locator('#stage').boundingBox();
  await page.screenshot({clip:{x:stage.x+56,y:stage.y+180,width:1060,height:440},path:'output/playwright/readme/hero-hires.png'});
  return {width:1060,height:440,source:'production renderer, 2x browser rasterization'};
}
