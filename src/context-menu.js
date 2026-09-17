(()=>{
  const api=window.metaBot,menu=document.querySelector('#menu'),items=document.querySelector('#items'),hint=document.querySelector('#hint'),back=document.querySelector('#back');
  let page='root',state={},busy=false,lastOpen=false;
  const routes={
    root:[['tasks','list-todo','查看任务'],['interactions','hand','和它互动','›'],['quiet','moon','安静一会儿','›'],['appearance','palette','外观与动作'],['settings','settings-2','连接与设置'],['tuck','minimize-2','收到托盘']],
    interactions:[['five','hand','伸个手'],['greet','sparkles','打个招呼'],['tease','mouse-pointer-2','逗它一下'],['surprise','shuffle','随它发挥']],
    quiet:[['quiet:15','moon','安静 15 分钟'],['quiet:30','moon','安静 30 分钟'],['quiet:60','moon','安静 1 小时'],['quiet:0','sun','恢复主动互动']]
  };
  function render(){
    const changed=items.dataset.page!==page;if(changed){items.replaceChildren();items.dataset.page=page;}back.hidden=page==='root';document.querySelector('#menuTitle').textContent={root:'Codex Bot',interactions:'和它互动',quiet:'安静一会儿'}[page];
    for(const [action,icon,label,more]of routes[page]){let b=items.querySelector('[data-action="'+action+'"]');if(!b){b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.dataset.action=action;b.innerHTML='<i data-lucide="'+icon+'"></i><span>'+label+'</span>'+(more||'');if(more)b.setAttribute('aria-haspopup','menu');b.onclick=()=>choose(action);items.append(b);}b.disabled=busy||(page==='interactions'&&(!state.mouse||state.quietUntil>Date.now()||['needs_attention','failed','unknown'].includes(state.status)||['running','queued'].includes(state.status)&&['five','surprise'].includes(action)));}
    hint.textContent=page==='quiet'?'只暂停主动表演，任务提醒照常。':page==='interactions'?(state.mouse===false?'鼠标互动已关闭，可在设置开启。':state.quietUntil>Date.now()?'正在安静休息，可先恢复主动互动。':state.status==='running'?'工作中只做轻柔回应。':'靠近它，继续用鼠标互动。'):'右键打开 · Esc 收起';
    if(changed)window.lucide?.createIcons();
  }
  async function choose(action){
    if(busy)return;if(routes[action]){page=action;render();items.querySelector('button:not(:disabled)')?.focus();return;}
    busy=true;render();let error='';try{const r=await api.contextMenu('action',action);if(r?.ok===false)throw Error(r.error||'它正照看任务，稍后再试');}catch(e){error=e.message;}finally{busy=false;render();if(error)hint.textContent=error;}
  }
  back.onclick=()=>{page='root';render();items.querySelector('button')?.focus();};document.querySelector('#close').onclick=()=>api.contextMenu('close');
  api.onContextMenu(value=>{state=value;if(value.visible&&!lastOpen){page='root';menu.className=value.reduced?'':'entering';render();requestAnimationFrame(()=>items.querySelector('button:not(:disabled)')?.focus());}else if(value.visible)render();else menu.className=lastOpen&&!value.reduced?'leaving':'';lastOpen=value.visible;});
  document.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();api.contextMenu('close');return;}
    if(e.key==='ArrowLeft'&&page!=='root'){e.preventDefault();back.click();return;}
    const buttons=[...items.querySelectorAll('button:not(:disabled)')];if(['ArrowDown','ArrowUp','Home','End','Tab'].includes(e.key)){e.preventDefault();const i=buttons.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowUp'||e.shiftKey?-1:1)+buttons.length)%buttons.length;buttons[next]?.focus();}
    if(e.key==='ArrowRight'&&document.activeElement?.getAttribute('aria-haspopup')){e.preventDefault();document.activeElement.click();}
  });
})();
