async(page)=>{
 await page.goto('http://127.0.0.1:4187/src/mask-review.html');
 await page.setViewportSize({width:1024,height:950});
 const result=await page.evaluate(async()=>{
   const M=MetaBotMaskSystem;document.querySelector('#live').style.display='none';document.querySelector('#gallery').style.display='none';
   const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(6,150px);gap:8px';document.body.append(grid);
   for(let i=0;i<24;i++){const box=document.createElement('div');box.style.cssText='background:white;border-radius:12px;text-align:center';const target=document.createElement('div');box.append(target,document.createTextNode(M.MASKS[M.names[i]].label));grid.append(box);const bot=MetaBotM1.create(target);bot.setAppearance({maskAuto:false,shape:MetaBotAppearance.SHAPES[i%12],maskStyle:['sticker','paper','holo'][i%3]});bot.setMask(M.names[i],M.CHAINS[i%6]);}
   await new Promise(r=>setTimeout(r,1800));
   const svgs=[...grid.querySelectorAll('svg')];if(svgs.some(s=>s.dataset.maskPhase!=='wearing'))throw Error('Matrix not wearing');
   if(svgs.some(s=>s.querySelector('[data-layer="face"]').getAttribute('opacity')!=='0'))throw Error('Eyes leak');
   window.matrixGrid=grid;return svgs.length;
 });
 await page.screenshot({path:'output/playwright/mask-body-matrix.png',fullPage:true});
 return result;
}
