async(page)=>{
 await page.goto('http://127.0.0.1:4187/test/fixtures/m1-visual.html');
 const inventory=await page.evaluate(()=>({core:MetaBotM1Rig.CORE_EXPRESSION_NAMES.length,interactions:Object.keys(MetaBotM1Rig.EXPRESSIONS).length-MetaBotM1Rig.CORE_EXPRESSION_NAMES.length,skins:Object.keys(MetaBotAppearance.SKINS).length,shapes:MetaBotAppearance.SHAPES.length,accessoryTiles:MetaBotM1Rig.ACCESSORIES.length,maskGallery:MetaBotMaskSystem.names.length}));
 const counts={};for(const [id,expected] of Object.entries(inventory)){counts[id]=await page.locator(`#${id}>figure`).count();if(counts[id]!==expected)throw Error(id+': '+counts[id]);}
 if(await page.locator('#activitySelect option').count()!==await page.evaluate(()=>Object.keys(MetaBotActivities.CLIPS).length))throw Error('Missing activities');
 await page.locator('#maskSelect').selectOption('cat');await page.locator('#maskChain').selectOption('classic');await page.locator('#maskPlay').click();await page.waitForTimeout(1600);
 if(await page.locator('#preview svg').getAttribute('data-mask')!=='cat')throw Error('Mask preview failed');
 await page.screenshot({path:'output/playwright/full-catalog-preview.png'});
 return counts;
}
