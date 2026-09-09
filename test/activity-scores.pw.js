async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/m1-visual.html?activity-check=1');await page.waitForFunction(()=>Boolean(window.review));
  await page.setViewportSize({width:1100,height:940});
  await page.evaluate(()=>review.showCatalog('activities','activity_measure_body'));
  await page.locator('#catalog').screenshot({path:'output/playwright/activity-measure-story.png'});
  const matrix=await page.evaluate(()=>{
    const originalRAF=window.requestAnimationFrame,originalCancel=window.cancelAnimationFrame;
    let time=0,seq=0;const callbacks=new Map();window.requestAnimationFrame=f=>{callbacks.set(++seq,f);return seq;};window.cancelAnimationFrame=id=>callbacks.delete(id);
    const tick=ms=>{time+=ms;const work=[...callbacks.values()];callbacks.clear();work.forEach(f=>f(time));};
    const host=document.createElement('div');host.style.cssText='width:128px;height:128px;position:fixed;top:0;left:0';document.body.append(host);
    const bot=MetaBotM1.create(host,{now:()=>time,motionLevel:'reduced',appearance:{maskAuto:false,shape:'circle'}});let checked=0;
    try{
      for(const [id,m] of Object.entries(MetaBotActivities.Scores.meta))for(const variant of [0,1,2])for(const artStyle of Object.keys(MetaBotAppearance.ART_STYLES)){
        bot.setAppearance({artStyle,shape:'circle',maskAuto:false});bot.setMotionLevel('reduced');
        for(const frame of MetaBotActivities.Scores.frames(id,variant)){
          bot.setExpression(frame.expression,{pose:frame.pose,duration:0,beatId:id+checked,beatMs:frame.duration});tick(16);
          if(/NaN|undefined|Infinity/.test(host.innerHTML))throw Error('Invalid frame '+id);
          const box=host.getBoundingClientRect();
          const body=host.querySelector('[data-part="body"]').getBoundingClientRect();if(body.width<40||body.height<40)throw Error('Tiny or blank '+id);
          for(const element of host.querySelectorAll('[data-accessory]')){
            const r=element.getBoundingClientRect();if(r.left<box.left-3||r.top<box.top-3||r.right>box.right+3||r.bottom>box.bottom+3)throw Error('Prop outside '+id+' '+frame.operation+' '+JSON.stringify(r.toJSON()));
            if(frame.phase==='exit')throw Error('Prop survives exit '+id);
          }
          checked++;
        }
      }
      for(const prop of ['notebook','gift']){
        bot.setExpression('neutral',{pose:{accessories:{[prop]:{opacity:1,open:0}}},duration:0});tick(16);
        const joint=host.querySelector(`[data-accessory="${prop}"] [data-joint="open"]`);if(!joint)throw Error('Missing articulated joint '+prop);
        const closed=joint.getAttribute('transform');
        bot.setExpression('neutral',{pose:{accessories:{[prop]:{opacity:1,open:1}}},duration:0});tick(16);
        if(joint.getAttribute('transform')===closed)throw Error('Rigid opening prop '+prop);
      }
      for(const prop of MetaBotM1Rig.ACCESSORIES)for(const side of ['left','right'])for(const frame of MetaBotActivities.Scores.panelFrames('theater_activity_take_delivery',side,prop)){
        bot.setExpression(frame.expression,{pose:frame.pose,duration:0});tick(16);
        const held=[...host.querySelectorAll('[data-accessory]')].map(p=>p.dataset.accessory);
        if(frame.phase==='exit'?held.length>0:held.length!==1||held[0]!==prop)throw Error('Confirmation prop replacement '+prop);
      }
      bot.setAppearance({artStyle:'classic',eyeStyle:'classic',shape:'circle',maskAuto:false});bot.setMotionLevel('full');bot.setActive(true);
      bot.setExpression('base_focus_1',{performanceId:'clock',performanceMs:15000,beatId:'first',beatMs:1500,duration:0});tick(14000);
      bot.setExpression('base_focus_4',{performanceId:'clock',performanceMs:15000,beatId:'late',beatMs:2000,duration:0});tick(1);
      const before=host.querySelector('[data-part="body"]').getAttribute('d');tick(680);
      if(host.querySelector('[data-part="body"]').getAttribute('d')===before)throw Error('Late micro beat never played');
      bot.setMotionLevel('reduced');tick(16);const still=host.innerHTML;tick(10000);if(still!==host.innerHTML)throw Error('Reduced motion not static');
    }finally{bot.destroy();host.remove();window.requestAnimationFrame=originalRAF;window.cancelAnimationFrame=originalCancel;}
    return checked;
  });
  await page.evaluate(()=>{
    const grid=document.createElement('div');grid.id='activity-contact';grid.style.cssText='display:grid;grid-template-columns:repeat(4,150px);gap:12px;padding:16px;background:#f4f6f5;width:648px';document.body.prepend(grid);
    window.activityBots=[];
    for(const id of ['activity_measure_body','activity_drawing_hide','activity_balloon_tug','activity_stamp_straight','activity_warmer_offer','activity_pillow_hug','activity_light_return','activity_hat_notice','performance_activity_tray_deliver','performance_activity_spread_folder','panel_activity_side_draw','theater_activity_sulky_watch']){
      const f=MetaBotActivities.Scores.frames(id)[3],cell=document.createElement('div'),target=document.createElement('div');target.style.cssText='width:128px;height:128px';cell.append(target,document.createTextNode(MetaBotActivities.LABELS[id]));grid.append(cell);
      const bot=MetaBotM1.create(target,{motionLevel:'reduced',appearance:{skin:'lemon',shape:'circle',maskAuto:false}});bot.setExpression(f.expression,{pose:f.pose,duration:0});bot.setActive(false);activityBots.push(bot);
    }
  });
  await page.locator('#activity-contact').screenshot({path:'output/playwright/activity-contact.png'});
  await page.evaluate(()=>{activityBots.forEach(b=>b.destroy());document.getElementById('activity-contact').remove();});
  await page.evaluate(()=>review.showCatalog('activities','activity_cup_place'));await page.locator('#play').click();
  await page.waitForFunction(()=>review.preview.getState().expression?.startsWith('base_')||document.querySelector('#preview svg').dataset.expression.startsWith('base_'));
  await page.setViewportSize({width:390,height:844});await page.locator('#catalog').screenshot({path:'output/playwright/activity-mobile.png'});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
  if(errors.length)throw Error(errors.join('\n'));
  return {matrix,scores:180,errors};
}
