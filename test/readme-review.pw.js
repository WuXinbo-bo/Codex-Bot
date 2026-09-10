async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4187/.runtime/readme-preview/README.html');
  await page.waitForFunction(()=>[...document.images].filter(i=>i.src.startsWith(location.origin)).every(i=>i.complete&&i.naturalWidth>0));
  const images=await page.locator('article img').count();if(images!==30)throw Error('Missing README images '+images);
  await page.setViewportSize({width:1280,height:940});await page.screenshot({path:'output/playwright/readme-desktop.png'});
  const desktop=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);if(!desktop)throw Error('Desktop overflow');
  await page.locator('#它不止一种表情').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/readme-gallery-desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'output/playwright/readme-mobile.png'});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
  await page.locator('#它不止一种表情').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/readme-gallery-mobile.png'});
  await page.getByRole('link',{name:'全部活动',exact:true}).click();
  await page.getByRole('heading',{name:'完整活动图鉴',exact:true}).waitFor();
  await page.getByRole('link',{name:'1',exact:true}).first().click();
  await page.getByRole('heading',{name:'情绪活动 / 1',exact:true}).waitFor();
  const catalog=await page.evaluate(async()=>fetch('/docs/gallery/catalog.json').then(r=>r.json()));
  for(const p of catalog.pages){
    await page.goto('http://127.0.0.1:4187/.runtime/readme-preview/docs-gallery-'+p.id+'.html');
    await page.waitForFunction(()=>document.images.length===1&&document.images[0].complete&&document.images[0].naturalWidth>0);
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Gallery overflow '+p.id);
    if(await page.locator('tbody tr').count()!==p.entries.length)throw Error('Gallery entries '+p.id);
  }
  await page.screenshot({path:'output/playwright/readme-atlas-mobile.png'});
  if(errors.length)throw Error(errors.join('\n'));
  return {images,pages:catalog.pages.length,desktop,mobile:true,errors};
}
