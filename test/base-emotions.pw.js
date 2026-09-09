async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/m1-visual.html');
  await page.waitForFunction(()=>Boolean(window.review));
  await page.setViewportSize({width:1100,height:940});
  if(await page.locator('#catalogTotal').textContent()!=='108 项')throw Error('Base registry not exposed');
  const pages=[];
  for(let i=1;i<=9;i++){
    await page.locator('#catalog').screenshot({path:`output/playwright/base-emotions-${i}.png`});
    pages.push(await page.locator('#core figure').count());
    if(i<9)await page.locator('#catalogNext').click();
  }
  if(pages.reduce((a,b)=>a+b)!==108)throw Error('Missing page');
  await page.locator('#baseFamily').selectOption('mixed');
  if(await page.locator('#core figure').count()!==12)throw Error('Missing mixed thoughts');
  await page.locator('#core .score-play').first().click();
  await page.waitForFunction(()=>document.querySelector('#preview svg').dataset.expression==='base_happy_restrained');
  if(await page.locator('#preview svg').getAttribute('data-expression')!=='base_happy_restrained')throw Error('Score preview not wired');
  await page.locator('#catalogCategory').selectOption('emotionAccents');
  await page.locator('#catalog').screenshot({path:'output/playwright/base-accents-1.png'});
  await page.locator('#catalogNext').click();
  await page.locator('#catalog').screenshot({path:'output/playwright/base-accents-2.png'});
  const matrix=await page.evaluate(()=>{
    // Drive only these test renderers with a deterministic RAF clock. No wall-clock sleeps.
    const originalRequest=window.requestAnimationFrame,originalCancel=window.cancelAnimationFrame;
    let time=0,seq=0;const callbacks=new Map();
    window.requestAnimationFrame=f=>{callbacks.set(++seq,f);return seq;};window.cancelAnimationFrame=id=>callbacks.delete(id);
    const frame=ms=>{time+=ms;const batch=[...callbacks];callbacks.clear();for(const [,f] of batch)f(time);};
    const hosts=[],bots=[],A=MetaBotAppearance,E=MetaBotBaseEmotions;
    const host=document.createElement('section');host.style.cssText='display:grid;grid-template-columns:repeat(6,128px);';document.body.append(host);
    let eyeChecks=0,shapeChecks=0,artChecks=0,motions=0;
    try{
      for(let i=0;i<Math.max(A.EYE_STYLES.length,A.SHAPES.length);i++){const cell=document.createElement('div');cell.style.cssText='width:128px;height:128px';host.append(cell);hosts.push(cell);bots.push(MetaBotM1.create(cell,{now:()=>time,motionLevel:'reduced',appearance:{shape:'circle',eyeStyle:A.EYE_STYLES[i]||'classic',artStyle:'classic',maskAuto:false}}));}
      const check=(cell,id)=>{
        if(/NaN|Infinity|undefined/.test(cell.innerHTML))throw Error('Invalid geometry '+id);
        const left=cell.querySelector('[data-part="eye-left"]').getBoundingClientRect(),right=cell.querySelector('[data-part="eye-right"]').getBoundingClientRect();
        if(left.right>right.left+1)throw Error('Overlapping eyes '+JSON.stringify({id,style:cell.querySelector('svg').dataset,left:left.toJSON(),right:right.toJSON()}));
        if(cell.querySelector('[data-part="face-mask"]').getAttribute('opacity')!=='0')throw Error('Base face covered by mask');
        const box=cell.getBoundingClientRect();
        for(const el of cell.querySelectorAll('[data-accent]'))if(Number(el.getAttribute('opacity'))>.02){const r=el.getBoundingClientRect();if(r.left<box.left-1||r.right>box.right+1||r.top<box.top-1||r.bottom>box.bottom+1)throw Error('Accent outside viewport '+id+' '+el.dataset.accent);}
      };
      for(const id of Object.keys(E.entries)){
        bots.forEach(b=>b.setExpression(id,{duration:0}));frame(16);
        hosts.slice(0,A.EYE_STYLES.length).forEach(h=>{check(h,id);eyeChecks++;});
      }
      bots.slice(0,A.SHAPES.length).forEach((b,i)=>b.setAppearance({shape:A.SHAPES[i],eyeStyle:'classic',artStyle:'classic',maskAuto:false}));
      for(const id of Object.keys(E.entries)){
        bots.forEach(b=>b.setExpression(id,{duration:0}));frame(16);
        hosts.slice(0,A.SHAPES.length).forEach(h=>{check(h,id);shapeChecks++;});
      }
      for(const artStyle of Object.keys(A.ART_STYLES)){
        bots[0].setAppearance({artStyle,shape:'circle',eyeStyle:'auto',maskAuto:false});
        for(const id of Object.keys(E.entries)){
          bots[0].setExpression(id,{duration:0});frame(16);check(hosts[0],id);artChecks++;
          if(artStyle==='pixel')for(const el of hosts[0].querySelectorAll('[data-accent]'))if(Number(el.getAttribute('opacity'))>0&&/[QCAL]/i.test(el.getAttribute('d')))throw Error('Nonpixel accent');
        }
      }
      const bot=bots[0],cell=hosts[0];bot.setAppearance({artStyle:'classic',shape:'circle',eyeStyle:'classic',maskAuto:false});bot.setMotionLevel('full');
      for(const [id,e] of Object.entries(E.entries)){
        bot.setExpression(id,{duration:0,performanceMs:9000,performanceId:id});frame(1);const before=cell.innerHTML;
        frame(9000*(e.pose.micro.at+e.pose.micro.span/2));
        if(cell.innerHTML===before)throw Error('Static micro score '+id);motions++;
        frame(10000);check(cell,id);
      }
      bot.setMotionLevel('reduced');bot.setExpression('base_focus_1',{duration:0});frame(16);
      const still=cell.innerHTML;frame(30000);if(cell.innerHTML!==still)throw Error('Reduced motion still animates');
      bot.setAppearance({artStyle:'classic',shape:'circle',eyeStyle:'classic',particles:false,maskAuto:false});bot.setExpression('base_shy_1',{duration:0});frame(16);
      if([...cell.querySelectorAll('[data-accent]')].some(e=>Number(e.getAttribute('opacity'))!==0))throw Error('Particles toggle ignored');
    }finally{bots.forEach(b=>b.destroy());host.remove();window.requestAnimationFrame=originalRequest;window.cancelAnimationFrame=originalCancel;}
    return {eyeChecks,shapeChecks,artChecks,motions};
  });
  await page.setViewportSize({width:390,height:844});
  await page.locator('#catalogCategory').selectOption('core');await page.locator('#baseFamily').selectOption('shy');
  await page.locator('#catalog').screenshot({path:'output/playwright/base-emotions-mobile.png'});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');await page.waitForFunction(()=>Boolean(window.panelDemo));
  await page.getByRole('button',{name:'开始任务',exact:true}).click();
  await page.waitForFunction(()=>panelDemo.frames.ball.contentDocument.querySelector('svg[data-expression^="base_"]'),null,{timeout:20000});
  const id=await page.evaluate(()=>panelDemo.frames.ball.contentDocument.querySelector('svg').dataset.expression);
  if(!/^base_(focus|thought|curious|doubt|confident|surprise_understood)/.test(id))throw Error('Native base route '+id);
  if(errors.length)throw Error(errors.join('\n'));
  return {pages,matrix,nativeBase:id,errors};
}
