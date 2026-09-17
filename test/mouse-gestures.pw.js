async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const setup=async()=>{await page.goto('http://127.0.0.1:4187/test/fixtures/panel-system.html');await page.waitForFunction(()=>!!window.panelDemo);};
  const move=async(x,y)=>page.evaluate(({x,y})=>{
    const w=panelDemo.frames.ball.contentWindow,b=w.document.querySelector('[data-part="body"]'),r=b.getBBox(),g=panelDemo.bot().geometry();
    const p=new w.DOMPoint(r.x+r.width*(x-12)/104,r.y+r.height*(y-12)/104).matrixTransform(b.getScreenCTM());
    panelDemo.mouse({kind:'move',x:g.x+p.x*g.scale,y:g.y+p.y*g.scale});
  },{x,y});
  const has=async group=>page.waitForFunction(group=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getMouseState().events.some(e=>e.group===group),group,{timeout:6000});
  await setup();for(const y of [52,66,80,66,52,66,80]){await move(105,y);await page.waitForTimeout(85);}await has('tickle');
  await setup();for(let i=0;i<=28;i++){const a=i*Math.PI*2/28;await move(64+65*Math.cos(a),64+65*Math.sin(a));await page.waitForTimeout(50);}await has('orbit');
  await setup();for(const x of [20,45,70,95,70,45,20,45,70]){await move(x,108);await page.waitForTimeout(100);}await has('mirror');
  await setup();await move(10,40);
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getMouseState().events.some(e=>e.gesture==='invite-five'));
  await page.waitForTimeout(850);
  const hand=await page.evaluate(()=>{
    const w=panelDemo.frames.ball.contentWindow,arms=[...w.document.querySelectorAll('[data-part^="arm-"]')],g=panelDemo.bot().geometry();
    const hands=arms.map(arm=>{const p=arm.getPointAtLength(arm.getTotalLength()-Math.sqrt(20));return new w.DOMPoint(p.x,p.y).matrixTransform(arm.getScreenCTM());}).sort((a,b)=>a.y-b.y);
    const p=hands[0];return {x:g.x+p.x*g.scale,y:g.y+p.y*g.scale,distance:Math.hypot(p.x-64,p.y-64)};
  });
  await page.evaluate(p=>{panelDemo.mouse({kind:'down',...p});panelDemo.mouse({kind:'up',...p});},hand);
  try{await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.__metaBotDebug.getMouseState().events.some(e=>e.gesture==='high-five'),{},{timeout:5000});}catch(e){throw Error('Visible hand failed: '+JSON.stringify(hand));}
  await page.waitForFunction(()=>panelDemo.frames.ball.contentWindow.document.querySelector('#ballButton').getAttribute('aria-expanded')==='true');
  if(errors.length)throw Error(errors.join('\n'));
  return {nativeTickle:true,nativeOrbit:true,nativeMirror:true,visibleHandHighFive:true,clickStillOpensPanel:true,errors};
}
