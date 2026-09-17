async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/mouse-interactions.html');await page.getByRole('button',{name:'试试鼠标',exact:true}).click();
  // Dispatch to the real DOM handler at gesture speed; CDP mouse moves on this host are paced at ~1 second each.
  const move=async x=>page.evaluate(x=>{const b=document.querySelector('[data-part="body"]'),r=b.getBBox(),p=new DOMPoint(r.x+r.width*x,r.y+r.height*.18).matrixTransform(b.getScreenCTM());document.querySelector('#stage').dispatchEvent(new PointerEvent('pointermove',{clientX:p.x,clientY:p.y,bubbles:true}));},x);
  for(const x of [.3,.4,.5,.6,.7,.6,.5,.4,.3,.4]){await move(x);await page.waitForTimeout(110);}
  await page.waitForFunction(()=>mousePreview.adapter.snapshot().events.some(e=>e.group==='pet'),{},{timeout:3000});
  await move(.25);await page.waitForTimeout(220);
  const left=await page.evaluate(()=>mousePreview.adapter.snapshot().response);if(!(left.x<0))throw Error('Left stroke was not followed');
  const a=await page.locator('#avatar').screenshot({path:'output/playwright/mouse-continuous-left.png'});
  await move(.75);await page.waitForTimeout(220);
  const right=await page.evaluate(()=>mousePreview.adapter.snapshot().response);if(!(right.x>0))throw Error('Right stroke was not followed');
  const b=await page.locator('#avatar').screenshot({path:'output/playwright/mouse-continuous-right.png'});if(a.equals(b))throw Error('Continuous response did not change rendered pixels');
  await page.locator('#stage').dispatchEvent('pointerleave');await page.waitForTimeout(400);if(await page.evaluate(()=>mousePreview.adapter.snapshot().response)!==null)throw Error('Pointer departure left a response');
  await page.locator('#status').selectOption('needs_attention');await move(.3);if(await page.evaluate(()=>mousePreview.adapter.snapshot().response)!==null)throw Error('Urgent task did not take ownership');
  if(errors.length)throw Error(errors.join('\n'));return {leftRightTracking:true,pixelsChanged:true,departureCleanup:true,taskPriority:true,errors};
}
