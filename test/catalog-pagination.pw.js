async(page)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    const request=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window),pending=new Set();
    window.requestAnimationFrame=callback=>{const id=request(time=>{pending.delete(id);callback(time);});pending.add(id);return id;};
    window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id);};
    window.pendingFrames=pending;
  });
  const started=Date.now();
  await page.goto('http://127.0.0.1:4187/test/fixtures/m1-visual.html');
  await page.waitForFunction(()=>Boolean(window.review));
  await page.setViewportSize({width:1100,height:900});
  const initial=await page.evaluate(()=>({state:review.getCatalogState(),nodes:document.querySelectorAll('*').length,svg:document.querySelectorAll('svg[aria-label="Meta Bot"]').length,iframe:document.querySelector('iframe').hasAttribute('src')}));
  if(initial.state.instances!==12||initial.svg!==15||initial.iframe)throw Error('Eager loading '+JSON.stringify(initial));
  const loadMs=Date.now()-started;
  await page.locator('#catalogNext').click();
  if(await page.locator('#catalogPage').inputValue()!=='2')throw Error('Next page failed');
  await page.locator('#catalogPrev').click();
  await page.locator('#catalogCategory').selectOption('interactions');
  await page.locator('#catalogSearch').fill('special_jubilant');
  await page.waitForFunction(()=>review.getCatalogState().total===1&&document.querySelectorAll('#interactions figure').length===1);
  if(await page.locator('#interactions figure').count()!==1)throw Error('Search failed');
  await page.locator('#catalogSearch').fill('no-such-expression');
  await page.waitForFunction(()=>review.getCatalogState().total===0&&review.instances.length===0);
  if(!await page.locator('#catalogNext').isDisabled())throw Error('Empty pagination enabled');
  await page.locator('#catalogCategory').selectOption('activities');
  for(const [type,count] of Object.entries({emotion:96,task:36,panel:16,social:16,theater:12,continuation:4,legacy:255})){
    await page.locator('#activityType').selectOption(type);
    if(await page.evaluate(()=>review.getCatalogState().total)!==count)throw Error('Activity filter '+type);
  }
  await page.locator('#activityType').selectOption('all');
  const coverage=await page.evaluate(()=>{
    const results=[];
    for(const id of [...document.getElementById('catalogCategory').options].map(option=>option.value)){
      review.showCatalog(id);let count=0,maxInstances=0,pages=0;
      do{
        const state=review.getCatalogState();count+=id==='activities'?document.querySelectorAll('#activities .sequence').length:document.querySelectorAll('#'+id+' > figure').length;
        maxInstances=Math.max(maxInstances,state.instances);pages++;
        if(document.getElementById('catalogNext').disabled)break;
        document.getElementById('catalogNext').click();
      }while(pages<=review.getCatalogState().total+1);
      if(count!==review.getCatalogState().total||maxInstances>22)throw Error('Coverage or live-instance limit '+id);
      results.push({id,count,pages,maxInstances});
    }
    return results;
  });
  await page.evaluate(()=>review.showCatalog('activities','theater_airplane'));
  await page.waitForTimeout(500);
  const after=await page.evaluate(()=>({nodes:document.querySelectorAll('*').length,pendingFrames:pendingFrames.size,instances:review.instances.length}));
  if(after.pendingFrames>2||after.nodes>12000)throw Error('Leaked renderers '+JSON.stringify(after));
  await page.locator('#catalog').screenshot({path:'output/playwright/catalog-paged-desktop.png'});
  await page.locator('#catalogPage').fill('9999');await page.locator('#catalogPage').press('Tab');
  if(!await page.locator('#catalogNext').isDisabled())throw Error('Page clamping failed');
  await page.locator('#activitySelect').selectOption('performance_done_bow');
  await page.locator('#play').click();
  await page.waitForTimeout(900);
  if(await page.locator('#preview svg').getAttribute('data-expression')==='neutral')throw Error('Playback broken');
  await page.setViewportSize({width:390,height:844});
  await page.locator('#catalogCategory').selectOption('eyeStyles');
  await page.locator('#catalog').screenshot({path:'output/playwright/catalog-paged-mobile.png'});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
  await page.locator('#panelEmbed summary').click();
  await page.waitForFunction(()=>document.querySelector('#panelEmbed iframe').getAttribute('src')==='panel-system.html');
  await page.locator('#panelEmbed summary').click();
  await page.waitForFunction(()=>!document.querySelector('#panelEmbed iframe').hasAttribute('src'));
  if(errors.length)throw Error(errors.join('\n'));
  return {loadMs,initial,coverage,after,errors};
}
