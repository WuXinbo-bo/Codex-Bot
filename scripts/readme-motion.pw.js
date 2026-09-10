async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1100,height:850});
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');await page.waitForFunction(()=>Boolean(window.panelDemo));
  await page.evaluate(async()=>{
    await panelDemo.frames.panel.contentWindow.metaBot.setAppearance({skin:'lemon',shape:'circle',eyeStyle:'classic',artStyle:'classic',maskAuto:false,companionMode:'natural'});
    document.getElementById('stage').style.cssText='position:relative;width:900px;height:520px;background:#f7f9fa;border-radius:0;overflow:hidden';
  });
  const stage=await page.locator('#stage').boundingBox();
  await page.clock.install();await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
  await page.evaluate(()=>panelDemo.act('start'));
  for(let i=0;i<80;i++){
    await page.clock.runFor(100);await page.screenshot({clip:stage,path:'output/playwright/readme/start/'+String(i).padStart(3,'0')+'.png'});
  }
  await page.evaluate(()=>panelDemo.act('finish'));
  for(let i=0;i<120;i++){
    if(i===80)await page.evaluate(()=>panelDemo.frames.completions.contentDocument.querySelector('button[aria-label="确认并接下一项"]').click());
    await page.clock.runFor(100);await page.screenshot({clip:stage,path:'output/playwright/readme/complete/'+String(i).padStart(3,'0')+'.png'});
    if(i===48){
      const shown=await page.evaluate(()=>panelDemo.windows.completions?.visible);if(!shown)throw Error('Completion not retained before confirmation');
      await page.screenshot({clip:stage,path:'output/playwright/readme/hero.png'});
    }
  }
  if(await page.evaluate(()=>panelDemo.windows.completions?.visible))throw Error('Confirmation recording did not acknowledge');
  await page.clock.resume();
  await page.goto('http://127.0.0.1:4187/test/fixtures/readme-atlas.html');
  await page.evaluate(()=>atlas.show({title:'展示后害羞藏起来',subtitle:'一段约 15 秒的小故事',entries:[{kind:'activity',id:'theater_activity_bashful_pride',index:1,label:''}]}));
  await page.evaluate(()=>{
    document.querySelector('main').style.width='480px';document.querySelector('header').remove();document.querySelector('footer').remove();document.querySelector('.grid').style.gridTemplateColumns='1fr';document.querySelector('.avatar').style.cssText='width:320px;height:320px;margin:auto';
    window.storyBot=bots[0];storyBot.setMotionLevel('full');storyBot.setActive(true);
    window.storyFrames=MetaBotActivities.CLIPS.theater_activity_bashful_pride;window.storyIndex=0;window.storyDue=0;
  });
  const storyArea=await page.locator('main').boundingBox();
  await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
  for(let i=0;i<150;i++){
    await page.evaluate(t=>{
      if(t>=storyDue&&storyIndex<storyFrames.length){const f=storyFrames[storyIndex++];storyDue+=f.duration;storyBot.setExpression(f.expression,{pose:f.pose,duration:f.transition,performanceId:'readme-story',performanceMs:15000,beatId:String(storyIndex),beatMs:f.duration});}
    },i*100);
    await page.clock.runFor(100);await page.screenshot({clip:storyArea,path:'output/playwright/readme/story/'+String(i).padStart(3,'0')+'.png'});
  }
  await page.clock.resume();
  if(errors.length)throw Error(errors.join('\n'));
  return {startFrames:80,completionFrames:120,storyFrames:150,errors};
}
