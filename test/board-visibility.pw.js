async(page)=>{
 await page.addInitScript(()=>{window.receipts=[];window.metaBot={onCompletions(fn){fn([{id:'a',title:'完成任务'}]);},onCompletionVisible(fn){window.showBoard=fn;},onCompletionNudge(fn){window.nudge=fn;},onCompletionPreferences(fn){window.prefs=fn;fn({boardAnimation:true});},acknowledgeNudge:async v=>{receipts.push(v);return{ok:true}}};});
 await page.goto('http://127.0.0.1:4187/src/completions.html');await page.setViewportSize({width:280,height:76});
 if(await page.locator('main').evaluate(e=>e.classList.contains('board-arriving')))throw Error('Animated while hidden');
 await page.evaluate(()=>showBoard(true));await page.waitForTimeout(150);
 if(await page.locator('main').evaluate(e=>getComputedStyle(e).animationName)!=='board-launch')throw Error('Whole board not animated');
 await page.evaluate(()=>{prefs({boardAnimation:false});nudge({id:'a',stage:3,at:1})});await page.waitForTimeout(2400);
 if(await page.evaluate(()=>receipts.length))throw Error('Disabled animation acknowledged');
 await page.evaluate(()=>prefs({boardAnimation:true}));await page.waitForTimeout(2500);
 if(await page.evaluate(()=>receipts.filter(r=>!r.phase).length)!==1)throw Error('Retry did not acknowledge completion');
 await page.screenshot({path:'output/playwright/board-visibility.png'});return 'hidden launch, whole-board animation, disabled deferral and completed receipt passed';
}
