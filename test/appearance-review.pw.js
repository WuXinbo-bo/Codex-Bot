async (page) => {
  await page.goto('http://127.0.0.1:4187/src/index.html');
  await page.setViewportSize({width:600,height:440});
  await page.evaluate(() => {
    document.body.innerHTML='';
    const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(4,140px);gap:4px;background:#f2f5f7;padding:12px';document.body.append(grid);
    window.reviewBots=[];
    MetaBotAppearance.SHAPES.forEach((shape,i)=>{const cell=document.createElement('div');cell.style.cssText='width:140px;height:128px';grid.append(cell);const bot=MetaBotM1.create(cell,{motionLevel:'reduced'});bot.setAppearance({skin:Object.keys(MetaBotAppearance.SKINS)[i%8],shape,emoji:false});bot.setExpression('curious');reviewBots.push(bot);});
  });
  await page.screenshot({path:'output/playwright/appearance-shapes.png'});
  return await page.locator('svg[data-shape]').count();
}
