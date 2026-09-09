async(page) => {
  await page.goto('http://127.0.0.1:4187/test/fixtures/m1-visual.html');
  await page.evaluate(() => {
    window.readmeBots = [];
    const createGallery = (id, entries) => {
      const grid = document.createElement('div');
      grid.id = id;
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(6,140px);gap:16px;width:968px;padding:24px;box-sizing:border-box;background:white;color:#26302c;font:14px Arial;text-align:center';
      document.body.prepend(grid);
      for (const entry of entries) {
        const cell = document.createElement('div'), avatar = document.createElement('div'), label = document.createElement('div');
        avatar.style.cssText = 'width:120px;height:120px;margin:auto';
        label.textContent = entry.label;
        cell.append(avatar,label);grid.append(cell);
        const bot = MetaBotM1.create(avatar,{appearance:{skin:'lemon',shape:'circle',maskAuto:false,...entry.appearance}});
        bot.setExpression(entry.expression || 'neutral',{duration:0});
        window.readmeBots.push(bot);
      }
    };
    const labels = ['平静','放松','专注','深度专注','向左检查','向右检查','好奇','思考','自信','沉稳','开心','庆祝','惊讶','困惑','谨慎','紧张','受挫','再试一次','疲惫','释然','等待输入','耐心等待','完成','恢复精神'];
    createGallery('readme-expressions',Object.keys(MetaBotM1Rig.EXPRESSIONS).slice(0,24).map((expression,i)=>({expression,label:labels[i]})));
    createGallery('readme-appearance',[
      ...Object.keys(MetaBotAppearance.SKINS).map(skin=>({label:skin,appearance:{skin}})),
      ...MetaBotAppearance.SHAPES.map(shape=>({label:shape,appearance:{shape}}))
    ]);
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.readmeBots.forEach(bot=>bot.setActive(false)));
  await page.waitForTimeout(100);
  for (const id of ['expressions','appearance']) await page.locator('#readme-'+id).screenshot({path:'output/playwright/readme-'+id+'.png'});
  return {expressions:24,appearance:26};
}
