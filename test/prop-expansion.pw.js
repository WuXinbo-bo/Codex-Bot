async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/m1-visual.html');await page.waitForFunction(()=>Boolean(window.review));
  await page.setViewportSize({width:1100,height:940});
  await page.evaluate(()=>review.showCatalog('accessoryTiles'));
  if(await page.locator('#catalogTotal').textContent()!=='45 项')throw Error('Missing accessories');
  await page.locator('#catalogNext').click();await page.locator('#catalogNext').click();
  await page.locator('#catalog').screenshot({path:'output/playwright/props-new-1.png'});
  await page.locator('#catalogNext').click();await page.locator('#catalog').screenshot({path:'output/playwright/props-new-2.png'});
  const checks=await page.evaluate(()=>{
    const oldRAF=requestAnimationFrame,oldCancel=cancelAnimationFrame;let time=0,seq=0;
    const queue=new Map();window.requestAnimationFrame=f=>{queue.set(++seq,f);return seq;};window.cancelAnimationFrame=id=>queue.delete(id);
    const tick=ms=>{time+=ms;const jobs=[...queue.values()];queue.clear();jobs.forEach(f=>f(time));};
    const host=document.createElement('div');host.style.cssText='width:128px;height:128px';document.body.append(host);
    const bot=MetaBotM1.create(host,{now:()=>time,motionLevel:'reduced',appearance:{maskAuto:false,shape:'circle'}});let frames=0,joints=0,movingFrames=0;
    try{
      if(host.querySelectorAll('[data-accessory]').length)throw Error('Eager accessory creation');
      for(const [id,meta] of Object.entries(MetaBotActivities.PropScores.meta)){
        for(const artStyle of Object.keys(MetaBotAppearance.ART_STYLES)){
          bot.setAppearance({artStyle,shape:'circle',maskAuto:false});bot.setMotionLevel('reduced');
          for(const f of MetaBotActivities.CLIPS[id]){
            bot.setExpression(f.expression,{pose:f.pose,duration:0});tick(16);
            if(/NaN|undefined|Infinity/.test(host.innerHTML))throw Error('Invalid geometry '+id);
            const el=host.querySelector('[data-accessory="'+meta.prop+'"]');
            if(f.phase!=='exit'&&!el)throw Error('Missing rendered prop '+id);
            if(el){const box=host.getBoundingClientRect(),r=el.getBoundingClientRect();if(r.left<box.left-2||r.top<box.top-2||r.right>box.right+2||r.bottom>box.bottom+2)throw Error('Out of bounds '+id+' '+JSON.stringify({box:box.toJSON(),r:r.toJSON()}));}
            frames++;
          }
          if(host.querySelectorAll('[data-accessory]').length)throw Error('Exit did not release nodes '+id);
        }
      }
      for(const id of Object.keys(MetaBotAccessories.NEW)){
        bot.setExpression('neutral',{pose:{accessories:{[id]:{opacity:1}}},duration:0});tick(16);
        const before=host.querySelector('[data-accessory]').innerHTML;
        bot.setExpression('neutral',{pose:{accessories:{[id]:{opacity:1,open:1,extend:1,turn:.2}}},duration:0});tick(16);
        if(host.querySelector('[data-joint]')){if(host.querySelector('[data-accessory]').innerHTML===before)throw Error('Static articulation '+id);joints++;}
      }
      bot.setAppearance({artStyle:'classic',shape:'circle',maskAuto:false});bot.setMotionLevel('full');
      for(const [id,meta] of Object.entries(MetaBotActivities.PropScores.meta)){
        for(const f of MetaBotActivities.PropScores.frames(id,1)){
          bot.setExpression(f.expression,{pose:f.pose,duration:f.transition,performanceId:id,performanceMs:MetaBotActivities.duration(id)});
          for(let i=0;i<4;i++){
            tick(f.duration/4);
            if(/NaN|undefined|Infinity/.test(host.innerHTML))throw Error('Invalid moving frame '+id);
            const box=host.getBoundingClientRect();
            for(const el of host.querySelectorAll('[data-accessory]')){
              const r=el.getBoundingClientRect();if(r.left<box.left-3||r.top<box.top-3||r.right>box.right+3||r.bottom>box.bottom+3)throw Error('Clipped moving prop '+id+' '+el.dataset.accessory);
            }
            movingFrames++;
          }
        }
      }
      if(!Object.values(bot.getAccessoryExposure()).some(ms=>ms>0))throw Error('No measured exposure');
      bot.setMotionLevel('reduced');
      bot.setMask('happy','classic');tick(1200);
      if(host.querySelectorAll('[data-accessory]').length)throw Error('Mask did not suppress accessories');
      bot.clearMask(true);bot.setExpression('neutral',{duration:0});tick(16);
      if(host.querySelectorAll('[data-accessory]').length)throw Error('Leaked accessory nodes');
    }finally{bot.destroy();host.remove();window.requestAnimationFrame=oldRAF;window.cancelAnimationFrame=oldCancel;}
    return {frames,joints,movingFrames};
  });
  await page.setViewportSize({width:390,height:844});await page.locator('#catalog').screenshot({path:'output/playwright/props-mobile.png'});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
  if(errors.length)throw Error(errors.join('\n'));return {presets:45,checks,errors};
}
