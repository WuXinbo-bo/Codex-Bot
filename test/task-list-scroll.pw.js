async(page)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1100,height:780});
  await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');
  await page.waitForFunction(()=>Boolean(window.panelDemo));
  const panel=page.frameLocator('iframe[title="panel"]');
  const scroll=panel.locator('.task-scroll');
  const metrics=()=>scroll.evaluate(el=>({width:el.clientWidth,height:el.clientHeight,sw:el.scrollWidth,sh:el.scrollHeight,x:el.scrollLeft,y:el.scrollTop,bar:getComputedStyle(el).scrollbarWidth}));
  for(const count of [1,3,10]){
    await page.evaluate(async count=>{
      const bot=panelDemo.bot();
      bot.center.update({tasks:Array.from({length:count},(_,i)=>({source:'codex',id:'scroll-'+i,turnId:'turn-'+count,status:'running',title:'C:\\Projects\\'+('长路径任务名称-'.repeat(15))+i,eventAt:new Date().toISOString()})),sources:{codex:'connected'},sourceHealth:{codex:{state:'connected'}}});
      await bot.showPanel(true,true);
    },count);
    await page.waitForFunction(count=>panelDemo.frames.panel.contentDocument.querySelectorAll('.board-card').length===count,count);
    await page.waitForTimeout(900);
    const before=await metrics();
    if(before.bar!=='none'||before.sw!==before.width)throw Error('Unexpected scrollbar or horizontal overflow '+JSON.stringify(before));
    if(count===1&&before.sh>before.height)throw Error('Single row overflows');
    const first=panel.locator('.board-card').first().getByRole('button',{name:'复制任务链接',exact:true});
    for(let i=0;i<3;i++){
      await first.click();
      const after=await metrics();
      if(after.width!==before.width||after.height!==before.height||after.sh!==before.sh||after.x!==0||after.y!==0)throw Error('Click changed scroll geometry '+JSON.stringify({before,after}));
    }
    // Sample the same transforms used by acknowledgements and nudges.
    const motion=await scroll.evaluate(async el=>{
      const row=el.querySelector('.board-card'),original={w:el.scrollWidth,h:el.scrollHeight};
      const animation=row.animate([{transform:'translateX(-3px) rotate(-1deg)'},{transform:'translateX(3px) rotate(1deg)'}],{duration:300,iterations:2});
      let stable=true;
      for(let i=0;i<12;i++){await new Promise(requestAnimationFrame);stable&&=el.scrollWidth===original.w&&el.scrollHeight===original.h;}
      animation.cancel();return stable;
    });
    if(!motion)throw Error('Card animation changed scroll geometry');
    if(count===10){
      await scroll.hover();await page.mouse.wheel(0,500);
      await page.waitForFunction(()=>panelDemo.frames.panel.contentDocument.querySelector('.task-scroll').scrollTop>0);
      await scroll.evaluate(el=>{el.scrollTop=el.scrollHeight;});
      const bottom=await metrics();
      const last=panel.locator('.board-card').last().getByRole('button',{name:'复制任务链接',exact:true});
      await last.click();
      if(Math.abs((await metrics()).y-bottom.y)>1)throw Error('Click jumped the scrolled list');
      await scroll.evaluate(el=>{el.scrollTop=0;el.querySelector('.board-card:last-child button').focus();});
      if((await metrics()).y===0)throw Error('Keyboard focus cannot reach offscreen tasks');
      await panel.locator('#panel').screenshot({path:'output/playwright/task-list-no-scrollbars.png'});
    }
  }
  if(errors.length)throw Error(errors.join('\n'));
  return {counts:[1,3,10],stableClicks:true,stableMotion:true,wheel:true,keyboard:true,errors};
}
