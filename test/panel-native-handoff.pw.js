async(page)=>{
  const browser=await page.context().browser().browserType().connectOverCDP('http://127.0.0.1:9226');
  const pages=browser.contexts().flatMap(c=>c.pages()),ball=pages.find(p=>p.url()==='http://tauri.localhost/'||p.url().endsWith('/index.html')),board=pages.find(p=>p.url().endsWith('/completions.html'));
  await ball.waitForFunction(async()=>window.__nativeBot&&(await __TAURI__.core.invoke('native_op',{op:'bootstrap',args:{}})).stored['cache/snapshot.json']?.passed===true,null,{timeout:60000});
  await ball.evaluate(async()=>{
    if(!__nativeBot.inbox.items.size){const id='handoff-'+Date.now();__nativeBot.inbox.add({id,taskId:'codex:handoff',turnId:id,title:'Handoff verification'},{id:'handoff',source:'codex',status:'completed',turnId:id,title:'Handoff verification'});await __nativeBot.renderCompletions();}
  });
  await board.screenshot({path:'output/playwright/native-board-resting.png'});
  const check=await ball.evaluate(async()=>{
    const call=(op,args={})=>__TAURI__.core.invoke('native_op',{op,args});
    const before=await call('inspect');
    const id=[...__nativeBot.inbox.items.keys()][0];
    const promise=__nativeBot.action('completions','completion',[id,'ack']);
    const samples=[],arms=[];
    for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,65));samples.push((await call('inspect')).completions);arms.push({mask:document.querySelector('#ball svg').dataset.mask,visible:[...document.querySelectorAll('[data-part^="arm-"]')].some(e=>Number(e.getAttribute('opacity'))>.5)});}
    await promise;const after=await call('inspect');
    return {before:before.completions,samples,after:after.completions,arms};
  });
  if(check.after.visible)throw Error('Acknowledged native board still visible');
  if(new Set(check.samples.map(p=>p.x+','+p.y)).size>2)throw Error('Native retrieval regressed to per-frame window movement');
  if(!check.arms.some(a=>a.visible&&!a.mask))throw Error('Retrieving hand was not visible');
  await ball.screenshot({path:'output/playwright/native-after-retrieve.png'});
  await ball.evaluate(()=>{setTimeout(()=>__TAURI__.core.invoke('native_op',{op:'quit',args:{}}),250);});
  return {passed:true,visibleDuringRetrieval:check.samples.some(s=>s.visible),positions:new Set(check.samples.map(p=>p.x+','+p.y)).size};
}
