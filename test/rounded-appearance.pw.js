async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1100,height:920});
  await page.goto('http://127.0.0.1:4187/test/fixtures/m1-visual.html');
  await page.waitForFunction(()=>Boolean(window.review));
  await page.evaluate(()=>review.showCatalog('artStyles'));
  if(await page.locator('#artStyles figure').count()!==4)throw Error('Retired styles remain in gallery');
  const matrix=await page.evaluate(async()=>{
    const host=document.createElement('div');document.body.append(host);const A=MetaBotAppearance;
    const bot=MetaBotM1.create(host,{motionLevel:'reduced'});let count=0;
    const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    for(const artStyle of Object.keys(A.ART_STYLES))for(const shape of A.SHAPES){
      bot.setAppearance({artStyle,shape,eyeStyle:'classic',maskAuto:false});bot.setExpression('neutral',{duration:0});await frame();
      const body=host.querySelector('[data-part="body"]');
      const path=body.getAttribute('d');
      if((path.match(/Q/g)||[]).length!==120||body.getAttribute('shape-rendering')!=='geometricPrecision')throw Error('Sharp base body: '+artStyle+' '+shape);
      if(/NaN|undefined|Infinity/.test(host.innerHTML))throw Error('Invalid rendered geometry');
      if(host.querySelectorAll('[data-layer="art-finish"] path').length!==1)throw Error('Retired finish layer remains');
      count++;
    }
    bot.destroy();host.remove();return count;
  });
  await page.evaluate(()=>{
    const section=document.createElement('section');section.id='rounded-review';section.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:12px;max-width:920px;padding:16px;background:#fff;';
    document.body.prepend(section);window.roundedBots=[];
    for(const shape of MetaBotAppearance.SHAPES){
      const cell=document.createElement('figure');cell.style.cssText='margin:0;display:grid;justify-items:center;';const host=document.createElement('div'),label=document.createElement('figcaption');label.textContent=shape;cell.append(host,label);section.append(cell);
      const bot=MetaBotM1.create(host,{motionLevel:'reduced',appearance:{artStyle:'classic',shape,eyeStyle:'classic',skin:'lemon',maskAuto:false}});roundedBots.push(bot);
    }
  });
  await page.locator('#rounded-review').screenshot({path:'output/playwright/rounded-bodies-desktop.png'});
  await page.evaluate(()=>roundedBots.forEach((b,i)=>{b.setAppearance({artStyle:'classic',shape:MetaBotAppearance.SHAPES[i],eyeStyle:'classic',skin:'lemon',maskAuto:false});b.setMotionLevel('reduced');}));
  await page.setViewportSize({width:390,height:844});
  await page.locator('#rounded-review').screenshot({path:'output/playwright/rounded-bodies-mobile.png'});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Narrow layout overflow');
  await page.evaluate(()=>{roundedBots.forEach(b=>b.destroy());document.getElementById('rounded-review').remove();});
  await page.setViewportSize({width:1100,height:850});
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');await page.waitForFunction(()=>Boolean(window.panelDemo));
  for(const style of ['paper','doodle','pixel']){
    await page.evaluate(style=>{
      panelDemo.stored['config.json'].appearance={schemaVersion:2,artStyle:style,skin:'lemon',eyeStyle:'anime',shape:'triangle'};
      panelDemo.stored['config.json'].performanceLibrary={magic:{seen:true,favorite:true,frequency:'less'}};
      panelDemo.frames.ball.srcdoc=panelDemo.frames.ball.srcdoc;
    },style);
    await page.waitForFunction(()=>panelDemo.stored['config.json'].appearance.artStyle==='auto'&&Boolean(panelDemo.frames.ball.contentWindow.__metaBotDebug?.getPerformanceState().appearance));
    if(!await page.evaluate(()=>panelDemo.frames.ball.contentWindow.MetaBotAppearance.ART_STYLES[panelDemo.frames.ball.contentWindow.__metaBotDebug.getPerformanceState().appearance.current.artStyle]))throw Error('Migrated style did not render');
  }
  await page.getByRole('button',{name:'开始任务',exact:true}).click();await page.waitForFunction(()=>panelDemo.windows.toast?.visible);
  await page.getByRole('button',{name:'完成任务',exact:true}).click();await page.waitForFunction(()=>panelDemo.windows.completions?.visible);
  await page.getByRole('button',{name:'展开面板',exact:true}).click();
  const panel=page.frameLocator('iframe[title="panel"]');await panel.getByRole('button',{name:'设置与连接诊断',exact:true}).click();
  if(await panel.locator('[data-settings-tab="library"],[id^="library"]').count())throw Error('Collection UI remains');
  await panel.locator('[data-settings-tab="appearance"]').click();await panel.locator('#artMode').selectOption('fixed');
  const choices=await panel.locator('#artStyle option').evaluateAll(options=>options.map(o=>o.value));
  if(choices.length!==4||['paper','doodle','pixel'].some(id=>choices.includes(id)))throw Error('Retired settings remain');
  await panel.getByRole('button',{name:'撤销未应用修改',exact:true}).click();
  await page.locator('iframe[title="panel"]').screenshot({path:'output/playwright/rounded-settings.png'});
  const retired=await page.evaluate(async()=>{
    const bot=panelDemo.bot();let rejected=0;
    for(const [from,type,args] of [['panel','performance-library',[]],['panel','performance-preference',['magic',{favorite:true}]],['panel','performance-replay',['magic']],['ball','performance-record',[{name:'magic',completed:true}]]]){
      try{await bot.action(from,type,args);}catch{rejected++;}
    }
    const api=panelDemo.frames.panel.contentWindow.metaBot;
    return {rejected,apiRemoved:['getPerformanceLibrary','setPerformancePreference','replayPerformance','recordPerformance','onPerformanceLibrary'].every(k=>!(k in api)),legacy:panelDemo.stored['config.json'].performanceLibrary,retained:panelDemo.windows.completions.visible};
  });
  if(retired.rejected!==4||!retired.apiRemoved||!retired.retained||Object.keys(retired.legacy).length!==1)throw Error('Retired collection still active or completion lost');
  if((await page.request.get('http://127.0.0.1:4187/dist/tauri/performance-library.js')).status()!==404)throw Error('Stale collection module still bundled');
  if(errors.length)throw Error(errors.join('\n'));return {styles:4,roundedStyleShapeCombinations:matrix,migrations:3,collectionRemoved:true,retained:true,errors};
}
