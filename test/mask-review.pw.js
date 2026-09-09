async (page) => {
 await page.goto('http://127.0.0.1:4187/src/mask-review.html');
 await page.setViewportSize({width:1060,height:1100});
 await page.screenshot({path:'output/playwright/mask-gallery.png',fullPage:true});
 const results=await page.evaluate(async()=>{
   const {bot,M}=maskReview;bot.setAppearance({maskAuto:false,shape:'triangle'});
   const wait=ms=>new Promise(r=>setTimeout(r,ms));const phases=[];
   bot.setMask('cat','classic');
   for(const delay of [120,350,350,330,300,3000,350,450]){await wait(delay);const svg=document.querySelector('#live svg');phases.push({phase:svg.dataset.maskPhase,mask:svg.dataset.mask,face:svg.querySelector('[data-layer="face"]').getAttribute('opacity'),texts:svg.querySelector('[data-part="face-mask"]').querySelectorAll('text').length});}
   bot.setAppearance({masks:false});await wait(80);if(document.querySelector('#live svg').dataset.mask)throw Error('Disabled mask still visible');
   if(phases.some(p=>p.texts))throw Error('Font based mask found');
   if(!phases.some(p=>p.phase==='wearing'&&p.face==='0'))throw Error('Base eyes not hidden');
   return phases;
 });
 await page.evaluate(()=>{maskReview.bot.setAppearance({maskAuto:false,shape:'triangle'});maskReview.bot.setMask('cat','slip')});
 await page.waitForTimeout(1600);
 await page.screenshot({path:'output/playwright/mask-wearing.png'});
 return results;
}
