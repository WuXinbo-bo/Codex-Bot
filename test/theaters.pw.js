async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/m1-visual.html');
  const stories=await page.evaluate(()=>Object.keys(MetaBotActivities.THEATERS));
  if(stories.length!==32)throw Error('Expected 32 stories');
  for(const id of stories){
    await page.evaluate(id=>review.showCatalog('activities',id),id);
    if(await page.locator('#clip-'+id+' figure').count()<5)throw Error('Missing storyboard '+id);
    if(await page.locator('#activitySelect option[value="'+id+'"]').count()!==1)throw Error('Missing playback '+id);
  }
  await page.locator('#activitySelect').selectOption('theater_airplane');
  await page.locator('#play').click();
  await page.waitForTimeout(4500);
  const first=await page.locator('#preview svg').getAttribute('data-expression');
  await page.locator('#preview').screenshot({path:'output/playwright/theater-airplane-start.png'});
  await page.waitForTimeout(4500);
  const middle=await page.locator('#preview svg').getAttribute('data-expression');
  await page.locator('#preview').screenshot({path:'output/playwright/theater-airplane-middle.png'});
  await page.waitForTimeout(6600);
  const last=await page.locator('#preview svg').getAttribute('data-expression');
  if(first===middle||last!=='neutral')throw Error('Playback failed '+JSON.stringify({first,middle,last}));
  await page.locator('#activitySelect').selectOption('theater_masks');await page.locator('#play').click();
  await page.waitForTimeout(4500);
  if(await page.locator('#preview svg').getAttribute('data-mask')!=='shy')throw Error('Missing theater mask');
  await page.locator('#preview').screenshot({path:'output/playwright/theater-mask.png'});
  await page.locator('#activitySelect').selectOption('theater_notes');await page.locator('#play').click();
  await page.waitForTimeout(500);
  if(await page.locator('#preview svg').getAttribute('data-mask'))throw Error('Stale mask after switching');
  await page.evaluate(()=>{
    const grid=document.createElement('div');grid.id='theater-contact-sheet';
    grid.style.cssText='display:grid;grid-template-columns:repeat(5,160px);gap:12px;width:848px;background:white;padding:16px;color:black';
    document.body.prepend(grid);
    for(const [id,story] of Object.entries(MetaBotActivities.THEATERS)){
      const cell=document.createElement('div'),avatar=document.createElement('div'),label=document.createElement('div');
      avatar.style.cssText='width:128px;height:128px;margin:auto';label.textContent=story.label;
      cell.append(avatar,label);grid.append(cell);
      const frames=MetaBotActivities.CLIPS[id],frame=frames[Math.floor(frames.length/2)];
      const bot=MetaBotM1.create(avatar,{appearance:{maskAuto:false,skin:'lemon'}});
      bot.setExpression(frame.expression,{pose:frame.pose,duration:0});bot.setActive(false);
    }
  });
  await page.waitForTimeout(500);
  await page.locator('#theater-contact-sheet').screenshot({path:'output/playwright/theaters-20.png'});
  await page.evaluate(()=>{
    review.startInteractive('idle');
    review.previewDirector.interact('activity-request',{name:'theater_masks'});
    review.previewDirector.interact('hover-enter',{local:{x:.4,y:.2}});
  });
  await page.waitForTimeout(4500);
  if(await page.locator('#preview svg').getAttribute('data-mask')!=='shy')throw Error('Production mask ownership failed');
  await page.evaluate(()=>review.previewDirector.interact('pointer-leave'));
  await page.locator('#preview').screenshot({path:'output/playwright/theater-production-mask.png'});
  await page.waitForTimeout(11500);
  const completed=await page.evaluate(()=>review.previewDirector.getState().theater.completed.theater_masks);
  if(completed!==1)throw Error('Production story did not complete');
  if(await page.locator('#preview svg').getAttribute('data-mask'))throw Error('Production mask not cleaned');
  if(errors.length)throw Error(errors.join('\n'));
  return {stories:stories.length,first,middle,last,errors};
}
