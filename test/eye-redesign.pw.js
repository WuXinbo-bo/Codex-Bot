async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/m1-visual.html');
  await page.setViewportSize({width:1080,height:940});
  await page.waitForFunction(()=>Boolean(window.review));
  await page.evaluate(()=>review.showCatalog('eyeStyles'));
  if(await page.locator('#catalogTotal').textContent()!=='18 项')throw Error('Wrong eye count');
  await page.locator('#eyeStyles').screenshot({path:'output/playwright/eyes-redesign-1.png'});
  await page.locator('#catalogNext').click();
  await page.locator('#eyeStyles').screenshot({path:'output/playwright/eyes-redesign-2.png'});
  const matrix=await page.evaluate(async()=>{
    const host=document.createElement('div');document.body.append(host);
    const bot=MetaBotM1.create(host,{appearance:{eyeStyle:'classic',maskAuto:false}});
    const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    let checks=0;
    for(const eyeStyle of MetaBotAppearance.EYE_STYLES){
      bot.setAppearance({eyeStyle,shape:'circle',maskAuto:false});bot.setMotionLevel('reduced');
      for(const name of ['neutral','deep_focus','surprise','curious','relief','sleepy_peek','wink_left']){
        bot.setExpression(name,{duration:0});await frame();
        if(/NaN|undefined|Infinity/.test(host.innerHTML))throw Error(eyeStyle+': invalid geometry');
        if(host.querySelectorAll('[data-eye-design]').length)throw Error('Old overlays remain');
        if(host.querySelector('svg').dataset.eyeStyle!==eyeStyle)throw Error('Selected identity lost');
        for(const side of ['left','right']){
          if(bot.getState().pose.eyes[side].closed>=.75&&Number(host.querySelector('[data-part="eye-'+side+'"]').parentElement.getAttribute('opacity'))!==0)throw Error('White slit '+eyeStyle);
        }
        checks++;
      }
      bot.setExpression('neutral',{duration:0});const before=bot.getState().pose.eyes.left.rx;
      for(let i=0;i<4;i++){bot.setAppearance({eyeStyle,maskAuto:false});bot.setMotionLevel('reduced');}
      if(bot.getState().pose.eyes.left.rx!==before)throw Error('Compounding eye geometry');
    }
    bot.destroy();host.remove();return checks;
  });
  await page.evaluate(()=>{
    const host=document.createElement('div');host.id='eye-motion-check';host.style.cssText='position:fixed;top:12px;left:12px;width:128px;height:128px;background:#f4f6f5;z-index:9999';document.body.append(host);
    window.eyeCheck=MetaBotM1.create(host,{appearance:{eyeStyle:'classic',maskAuto:false}});
    eyeCheck.setActive(false);
  });
  for(const eyeStyle of await page.evaluate(()=>MetaBotAppearance.EYE_STYLES)){
    await page.evaluate(eyeStyle=>{eyeCheck.setAppearance({eyeStyle,maskAuto:false});eyeCheck.setActive(false);},eyeStyle);
    await page.waitForTimeout(100);
    if(await page.locator('#eye-motion-check').evaluate(n=>/NaN|undefined|Infinity/.test(n.innerHTML)))throw Error('Invalid transition '+eyeStyle);
    await page.waitForTimeout(450);
    if(await page.evaluate(()=>eyeCheck.getState().transitioning))throw Error('Stuck eye transition '+eyeStyle);
    await page.locator('#eye-motion-check').screenshot({path:'output/playwright/eye-settled-'+eyeStyle+'.png'});
  }
  const shapes=await page.evaluate(async()=>{
    eyeCheck.setAppearance({eyeStyle:'pixel',maskAuto:false});eyeCheck.setMotionLevel('reduced');let checks=0;
    const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    await frame();
    if(Number(document.querySelector('#eye-motion-check [data-part="eye-left"]').parentElement.getAttribute('opacity'))!==1)throw Error('Reduced motion retained a switching blink');
    for(const eyeStyle of MetaBotAppearance.EYE_STYLES)for(const shape of MetaBotAppearance.SHAPES){
      eyeCheck.setAppearance({eyeStyle,shape,maskAuto:false});eyeCheck.setExpression('curious',{duration:0});await frame();
      const host=document.getElementById('eye-motion-check');
      if(/NaN|undefined|Infinity/.test(host.innerHTML))throw Error('Invalid body mapping '+eyeStyle+' '+shape);
      const left=host.querySelector('[data-part="eye-left"]').getBoundingClientRect(),right=host.querySelector('[data-part="eye-right"]').getBoundingClientRect();
      if(left.right>right.left+1)throw Error('Eyes overlap '+eyeStyle+' '+shape);
      checks++;
    }
    eyeCheck.destroy();document.getElementById('eye-motion-check').remove();delete window.eyeCheck;return checks;
  });
  await page.setViewportSize({width:390,height:844});
  await page.locator('#eyeStyles').screenshot({path:'output/playwright/eyes-redesign-mobile.png'});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>Boolean(window.panelDemo));
  await page.getByRole('button',{name:'展开面板',exact:true}).click();
  const panel=page.frameLocator('iframe[title="panel"]');
  await panel.getByRole('button',{name:'设置与连接诊断',exact:true}).click();
  await panel.locator('[data-settings-tab="appearance"]').click();
  if(await panel.locator('#eyeStyle option').count()!==18)throw Error('Incomplete settings registry');
  await panel.locator('#eyeMode').selectOption('fixed');
  const ids=await panel.locator('#eyeStyle option').evaluateAll(options=>options.map(o=>o.value).filter(v=>v!=='auto'));
  for(const id of ids){
    await panel.locator('#eyeStyle').selectOption(id);
    if(await panel.getByRole('button',{name:'应用',exact:true}).isEnabled())await panel.getByRole('button',{name:'应用',exact:true}).click();
    await page.waitForFunction(id=>panelDemo.stored['config.json'].appearance.eyeStyle===id&&panelDemo.frames.ball.contentDocument.querySelector('svg').dataset.eyeStyle===id,id);
  }
  await page.evaluate(()=>{panelDemo.frames.panel.srcdoc=panelDemo.frames.panel.srcdoc;});
  await page.waitForFunction(()=>panelDemo.frames.panel.contentDocument.querySelector('#eyeStyle')?.value==='tender');
  if(errors.length)throw Error(errors.join('\n'));
  return {presets:18,matrix,shapes,transitions:18,persisted:18,errors};
}
