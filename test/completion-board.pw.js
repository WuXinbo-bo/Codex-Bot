async(page)=>{
 await page.addInitScript(()=>{window.calls=[];window.metaBot={onCompletions(fn){window.update=fn;fn([{id:'a',title:'任务 A'},{id:'b',title:'任务 B'}]);},onCompletionPreferences(fn){fn({boardAnimation:true});},onCompletionNudge(fn){window.nudge=fn;},completionAction:async(id,action)=>{calls.push({id,action});return{ok:true};},moveTaskBoard:async v=>{calls.push(v);return{ok:true};}};});
 await page.goto('http://127.0.0.1:4187/src/completions.html');await page.setViewportSize({width:280,height:76});
 await page.getByRole('button',{name:'查看任务',exact:true}).click();if(await page.locator('.title').textContent()!=='任务 A')throw Error('View removed task');
 await page.evaluate(()=>nudge({stage:4}));await page.waitForTimeout(1900);if(await page.locator('main').getAttribute('data-stage'))throw Error('Nudge did not stop');
 const b=await page.locator('.title').boundingBox();await page.mouse.move(b.x+8,b.y+8);await page.mouse.down();await page.mouse.move(b.x+30,b.y+15,{steps:5});await page.mouse.up();
 const phases=await page.evaluate(()=>calls.filter(c=>c.phase).map(c=>c.phase));if(!phases.includes('start')||!phases.includes('end'))throw Error('Drag not wired');
 await page.screenshot({path:'output/playwright/completion-board-final.png'});return phases;
}
