async(page)=>{
 await page.goto('http://127.0.0.1:4187/test/fixtures/task-relay.html');
 const frame=page.frameLocator('#preview');
 await frame.getByRole('button',{name:'下一项，保留未确认'}).click();
 await page.getByRole('button',{name:'新增完成任务'}).click();
 if(await frame.locator('.title').textContent()!=='任务 2 已完成')throw Error('New result stole selection');
 await page.getByRole('button',{name:'下一次操作模拟失败'}).click();
 await frame.getByRole('button',{name:'查看任务',exact:true}).click();
 if(await page.evaluate(()=>items.length)!==4)throw Error('Failure removed item');
 await frame.getByRole('button',{name:'确认并接下一项'}).click();
 if(await frame.locator('.title').textContent()!=='任务 3 已完成')throw Error('Handoff failed');
 await page.screenshot({path:'output/playwright/task-relay.png'});
 for(let i=0;i<3;i++)await frame.getByRole('button',{name:'确认并接下一项'}).click();
 if(await frame.locator('.completion').isVisible())throw Error('Empty card visible');
 return 'new arrival, navigation, failure retention, acknowledgement handoff, empty queue passed';
}
