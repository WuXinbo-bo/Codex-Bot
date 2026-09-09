async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/m1-visual.html');
  await page.waitForFunction(()=>Boolean(window.review));
  const results=[];
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:900});
    await page.locator('#activitySelect').selectOption('write_notes');
    await page.evaluate(()=>review.play('write_notes'));
    await page.waitForTimeout(900);
    await page.locator('#preview').screenshot({path:`output/playwright/upgrade-writing-${width}.png`});
    await page.locator('#activitySelect').selectOption('emotion_mixed_1');
    await page.evaluate(()=>review.play('emotion_mixed_1'));
    await page.waitForTimeout(600);
    await page.locator('#preview').screenshot({path:`output/playwright/upgrade-mixed-${width}.png`});
    results.push(await page.evaluate(()=>({width:innerWidth,expression:review.preview.getState().expression,svg:!!document.querySelector('#preview svg'),overflow:document.documentElement.scrollWidth>innerWidth})));
  }
  await page.setViewportSize({width:1280,height:900});
  const paths=await page.evaluate(()=>{
    const bad=[];
    for(const id of Object.keys(MetaBotM1Rig.EMOTIONS))for(const shape of MetaBotAppearance.SHAPES){
      const pose=MetaBotM1Rig.getExpression(id);
      if(/NaN|undefined/.test(MetaBotAppearance.path(shape,pose.body)))bad.push(id+shape);
    }
    return bad;
  });
  if(errors.length||paths.length||results.some(r=>!r.svg||r.overflow))throw Error(JSON.stringify({errors,paths,results}));
  return {passed:true,results,emotionShapePairs:60*18};
}
