async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/mouse-interactions.html');
  await page.getByRole('button',{name:'下一套',exact:true}).click();
  if(await page.locator('#clip').inputValue()!=='performance_mouse_welcome')throw Error('Next does not select a clip');
  await page.getByRole('button',{name:'上一套',exact:true}).click();
  await page.getByRole('button',{name:'试试鼠标',exact:true}).click();
  const stroke=async()=>{for(const x of [.3,.4,.5,.6,.7,.6,.5,.4,.3,.4]){
    const p=await page.locator('[data-part="body"]').evaluate((b,x)=>{const r=b.getBBox(),p=new DOMPoint(r.x+r.width*x,r.y+r.height*.18).matrixTransform(b.getScreenCTM());return {x:p.x,y:p.y};},x);
    await page.mouse.move(p.x,p.y);await page.waitForTimeout(110);
  }};
  await stroke();await page.waitForFunction(()=>mousePreview.adapter.snapshot().events.some(e=>e.group==='pet'));
  await page.locator('#status').selectOption('needs_attention');
  const count=await page.evaluate(()=>mousePreview.adapter.snapshot().accepted);
  await stroke();if(await page.evaluate(()=>mousePreview.adapter.snapshot().accepted)!==count)throw Error('Urgent state did not block gestures');
  if(await page.locator('#avatar svg').count()!==1)throw Error('Extra renderers');
  if(errors.length)throw Error(errors.join('\n'));
  return {navigation:true,liveStrokes:true,taskPriority:true,singleRenderer:true,errors};
}
