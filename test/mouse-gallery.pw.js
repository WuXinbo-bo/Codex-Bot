async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/mouse-interactions.html');
  await page.waitForFunction(()=>!!window.mousePreview);
  const names=await page.locator('#clip option').evaluateAll(nodes=>nodes.map(n=>n.value)),images=[];
  if(names.length!==30)throw Error('Expected thirty mouse clips');
  for(const name of names){
    await page.locator('#clip').selectOption(name);
    await page.waitForTimeout(1150);
    const captured=await page.evaluate(()=>({svg:document.querySelector('#avatar svg').outerHTML,label:document.querySelector('#clip').selectedOptions[0].textContent,state:mousePreview.controller.getState()}));
    if(captured.state.activity?.name!==name)throw Error('Clip not playing: '+name);
    if(/NaN|Infinity/.test(captured.svg))throw Error('Invalid geometry: '+name);
    images.push({name,label:captured.label,svg:captured.svg});
    await page.waitForFunction(()=>mousePreview.controller.getState().activity===null,{},{timeout:6000});
    if(await page.locator('#avatar svg').count()!==1)throw Error('Preview accumulated robots');
  }
  await page.evaluate(images=>{
    mousePreview.controller.stop();mousePreview.ball.destroy();
    const sheet=document.createElement('section');sheet.id='contactSheet';sheet.style='display:grid;grid-template-columns:repeat(5,140px);gap:8px;background:#fff;padding:12px';
    for(const item of images){const tile=document.createElement('figure');tile.style='margin:0;text-align:center;font-size:11px';tile.innerHTML=item.svg;const svg=tile.querySelector('svg');svg.style='width:128px;height:128px';const label=document.createElement('figcaption');label.textContent=item.label;tile.append(label);sheet.append(tile);}
    document.body.replaceChildren(sheet);
  },images);
  await page.locator('#contactSheet').screenshot({path:'output/playwright/mouse-thirty-contact-sheet.png'});
  if(errors.length)throw Error(errors.join('\n'));
  return {clips:images.length,finiteGeometry:true,completePlayback:true,singleRenderer:true,errors};
}
