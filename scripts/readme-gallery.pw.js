async(page)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4187/test/fixtures/readme-atlas.html');await page.setViewportSize({width:1120,height:1200});
  const catalog=await page.evaluate(async()=>{const r=await fetch('../../docs/gallery/catalog.json');return r.json();});
  const results=[];
  for(const sheet of [...catalog.sheets,...catalog.pages]){
    const result=await page.evaluate(s=>atlas.show(s),sheet);
    if(result.instances!==sheet.entries.length||result.instances>12)throw Error('Unbounded sheet '+sheet.id);
    if(sheet.entries.some(e=>e.kind==='mask')&&result.masks.some(p=>p!=='wearing'))throw Error('Mask not worn '+sheet.id);
    await page.locator('main').screenshot({path:'output/playwright/readme/'+sheet.id+'.png'});
    results.push(sheet.id);
  }
  if(errors.length)throw Error(errors.join('\n'));
  return {sheets:results.length,featured:catalog.counts.featured,activities:catalog.counts.activities,errors};
}
