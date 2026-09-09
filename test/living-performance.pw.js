async(page)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/m1-visual.html');
  await page.waitForFunction(()=>Boolean(window.review));
  await page.evaluate(()=>review.showCatalog('eyeStyles'));
  if(await page.locator('#eyeStyles figure').count()!==12||await page.locator('#catalogTotal').textContent()!=='15 项')throw Error('Missing paged eye styles');
  await page.locator('#eyeStyles').screenshot({path:'output/playwright/living-eyes.png'});
  await page.evaluate(()=>{
    review.startInteractive('running');
    review.previewDirector.interact('task-lifecycle',{events:[{id:'new-start',taskId:'visual',kind:'started'}]});
  });
  await page.waitForTimeout(400);
  const started=await page.evaluate(()=>review.previewDirector.getState().activity?.name);
  if(!started?.startsWith('performance_start_'))throw Error('Lifecycle not integrated');
  await page.evaluate(()=>review.previewDirector.interact('panel-phase',{label:'toast',phase:'entering',duration:220}));
  await page.waitForTimeout(1000);
  if(await page.evaluate(()=>review.previewDirector.getState().activity?.name)!==started)throw Error('Panel interrupted score');
  await page.locator('#preview').screenshot({path:'output/playwright/living-start.png'});
  await page.waitForTimeout(3300);
  await page.evaluate(()=>review.previewDirector.interact('task-lifecycle',{events:[{id:'new-done',taskId:'visual',kind:'completed'}]}));
  await page.waitForTimeout(1600);
  await page.locator('#preview').screenshot({path:'output/playwright/living-done.png'});
  await page.evaluate(()=>{
    const grid=document.createElement('div');grid.id='living-contact';grid.style.cssText='display:grid;grid-template-columns:repeat(5,160px);gap:12px;width:872px;padding:12px;background:white';document.body.prepend(grid);
    for(const [id,meta] of Object.entries(MetaBotM1Rig.SPECIALS)){
      const cell=document.createElement('div'),target=document.createElement('div');target.style.cssText='width:128px;height:128px;margin:auto';cell.style.textAlign='center';cell.append(target,document.createTextNode(meta.label));grid.append(cell);
      const bot=MetaBotM1.create(target,{appearance:{skin:'lemon',shape:'circle',maskAuto:false}});bot.setExpression(id,{duration:0});bot.setActive(false);
    }
  });
  await page.waitForTimeout(300);
  await page.locator('#living-contact').screenshot({path:'output/playwright/living-specials.png'});
  const scores=await page.evaluate(async()=>{
    const grid=document.createElement('div');grid.id='score-contact';grid.style.cssText='display:grid;grid-template-columns:repeat(5,128px);gap:8px;width:672px;padding:12px;background:white';document.body.prepend(grid);
    const samples=[];
    for(const name of Object.values(MetaBotActivities.PERFORMANCES).flat()){
      const id='performance_'+name;
      for(const frame of MetaBotActivities.CLIPS[id]){
        const cell=document.createElement('div'),target=document.createElement('div');cell.style.font='10px system-ui';cell.append(target,document.createTextNode(name+' / '+frame.phase));grid.append(cell);
        const bot=MetaBotM1.create(target,{appearance:{skin:'lemon',shape:'circle',maskAuto:false}});
        bot.setPerformanceContext({theater:true});bot.setExpression(frame.expression,{pose:frame.pose,duration:0});bot.setActive(false);samples.push({target,frame,id});
      }
    }
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    for(const {target,frame,id} of samples){
      if(/NaN|Infinity/.test(target.innerHTML))throw Error('Invalid geometry '+id);
      const bounds=target.querySelector('[data-part="body"]').getBBox();
      if(bounds.width<50||bounds.height<50)throw Error('Blank body '+id);
      for(const prop of target.querySelectorAll('[data-accessory]')){
        if(frame.phase==='exit'&&Number(prop.getAttribute('opacity'))>.001)throw Error('Stale prop '+id);
        const expected=frame.pose?.accessories?.[prop.dataset.accessory];
        if(expected?.opacity>0 && Number(prop.getAttribute('opacity'))<=0)throw Error('Missing prop '+id);
        if(expected?.back>.5 && prop.parentNode!==target.querySelector('[data-layer="character"]').firstElementChild)throw Error('Not behind body '+id);
      }
    }
    return new Set(samples.map(sample=>sample.id)).size;
  });
  if(scores!==34)throw Error('Missing task scores');
  await page.locator('#score-contact').screenshot({path:'output/playwright/living-scores.png'});
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>Boolean(window.panelDemo));
  await page.getByRole('button',{name:'展开面板',exact:true}).click();
  const panel=page.frameLocator('iframe[title="panel"]');
  await panel.getByRole('button',{name:'设置与连接诊断',exact:true}).click();
  await panel.locator('[data-settings-tab="appearance"]').click();
  await panel.locator('#eyeMode').selectOption('fixed');
  await panel.locator('#eyeStyle').selectOption('anime');
  await panel.getByRole('button',{name:'应用',exact:true}).click();
  await page.waitForTimeout(400);
  if(await panel.locator('#eyeStyle').inputValue()!=='anime')throw Error('Eye setting failed');
  await page.waitForFunction(()=>panelDemo.stored['config.json'].appearance.eyeStyle==='anime'&&panelDemo.frames.ball.contentDocument.querySelector('svg[data-eye-style="anime"]'));
  await page.evaluate(()=>{const frame=panelDemo.frames.panel;frame.srcdoc=frame.srcdoc;});
  await panel.locator('#eyeStyle').waitFor({state:'attached'});
  await page.waitForFunction(()=>panelDemo.frames.panel.contentDocument.querySelector('#eyeStyle')?.value==='anime');
  await panel.getByRole('button',{name:'设置与连接诊断',exact:true}).click();
  await panel.locator('[data-settings-tab="appearance"]').click();
  await panel.locator('#eyeStyle').screenshot({path:'output/playwright/living-eye-setting.png'});
  await page.setViewportSize({width:390,height:844});
  await panel.locator('#eyeStyle').screenshot({path:'output/playwright/living-eye-setting-narrow.png'});
  await page.setViewportSize({width:1280,height:900});
  if(errors.length)throw Error(errors.join('\n'));
  return {started,specials:15,eyeStyles:15,scores,persisted:true,errors};
}
