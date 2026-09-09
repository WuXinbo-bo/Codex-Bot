(() => {
  let coordinated=false;
  window.metaBot?.onPanelPhase?.(detail=>{coordinated=true;window.MetaBotPanelMotion?.play(detail);});
  const list=document.getElementById('completedList'),relay=MetaBotTaskRelay.create();
  let busy=false,lastId=null,animation=true,drag=null,nudgeTimer,shown=false,arrival=false,pendingNudge=null;
  const main=document.querySelector('main'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const row=document.createElement('section');row.className='completion';
  const status=document.createElement('span');status.className='status';status.textContent='●';status.title='已完成';
  const title=document.createElement('div');title.className='title';
  const actions=document.createElement('div');actions.className='actions';
  const buttons={};
  function button(key,label,icon,handler){const b=document.createElement('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=`<i data-lucide="${icon}"></i>`;b.onclick=handler;buttons[key]=b;return b;}
  const navigation=document.createElement('div');navigation.className='relay-navigation';
  const progress=document.createElement('span');progress.setAttribute('aria-live','polite');
  navigation.append(button('previous','上一项，保留未确认','chevron-left',()=>{relay.move(-1);render();}),progress,button('next','下一项，保留未确认','chevron-right',()=>{relay.move(1);render();}));
  async function act(action){
    const item=relay.view().item;if(!item||busy)return;busy=true;render();
    document.getElementById('error').textContent='';row.classList.remove('failed');
    try{const result=await window.metaBot?.completionAction(item.id,action);if(!result?.ok)throw Error(result?.error||'操作失败，请重试');}
    catch(error){if(relay.view().item?.id===item.id){row.classList.add('failed');title.textContent=error.message;title.title=`${item.title}\n${error.message}`;}document.getElementById('error').textContent=error.message;}
    finally{busy=false;for(const b of Object.values(buttons))b.disabled=false;}
  }
  actions.append(button('open','查看任务','external-link',()=>act('open')),button('ack','确认并接下一项','check',()=>act('ack')));
  row.append(status,title,actions);list.append(row,navigation);
  title.tabIndex=0;title.setAttribute('role','button');title.setAttribute('aria-label','查看任务标题');
  title.onclick=()=>{if(!title.dataset.dragged)act('open');};title.onkeydown=e=>{if(e.key==='Enter')act('open');};
  title.ondblclick=()=>window.metaBot?.moveTaskBoard?.({phase:'reset'});
  title.onpointerdown=e=>{if(busy||e.button!==0)return;drag={x:e.screenX,y:e.screenY,moved:false};title.dataset.dragged='';title.setPointerCapture(e.pointerId);};
  title.onpointermove=e=>{if(!drag)return;if(!drag.moved&&Math.hypot(e.screenX-drag.x,e.screenY-drag.y)>5){drag.moved=true;title.dataset.dragged='yes';window.metaBot?.moveTaskBoard?.({phase:'start',x:drag.x,y:drag.y}).catch(showDragError);}if(drag.moved)window.metaBot?.moveTaskBoard?.({phase:'move',x:e.screenX,y:e.screenY}).catch(showDragError);};
  const endDrag=e=>{if(drag?.moved)window.metaBot?.moveTaskBoard?.({phase:'end',x:e.screenX,y:e.screenY}).catch(showDragError);drag=null;if(title.hasPointerCapture(e.pointerId))title.releasePointerCapture(e.pointerId);};
  title.onpointerup=endDrag;title.onpointercancel=endDrag;
  function showDragError(error){document.getElementById('error').textContent=error.message;}
  function render(){const {item,index,total}=relay.view();row.hidden=!item;navigation.hidden=total<2;list.setAttribute('aria-label',`${total} 项待确认`);
    title.textContent=item?.title||'';title.title=item?.title||'';progress.textContent=`${index+1} / ${total} · 待确认`;
    if(item?.id!==lastId){row.classList.remove('arriving','failed');arrival=Boolean(item);lastId=item?.id;document.getElementById('error').textContent='';main.removeAttribute('data-stage');}
    for(const b of Object.values(buttons))b.disabled=busy;
  }
  window.metaBot?.onCompletions(items=>{relay.update(items);render();});
  window.metaBot?.onCompletionPreferences?.(prefs=>{animation=prefs.boardAnimation!==false;main.classList.toggle('no-animation',!animation);if(!animation)main.removeAttribute('data-stage');});
  function present(){if(!shown||busy||drag||!animation||reduced.matches)return;
    if(arrival){arrival=false;if(!coordinated){main.classList.remove('board-arriving');void main.offsetWidth;main.classList.add('board-arriving');}}
    if(!pendingNudge||nudgeTimer)return;const notice=pendingNudge;pendingNudge=null;
    main.classList.remove('board-arriving');main.removeAttribute('data-stage');void main.offsetWidth;main.dataset.stage=notice.stage;
    window.metaBot?.acknowledgeNudge?.({...notice,phase:'started'}).catch(showDragError);
    nudgeTimer=setTimeout(()=>{nudgeTimer=null;const completed=main.dataset.stage===String(notice.stage);main.removeAttribute('data-stage');if(!shown||busy||drag||!animation||reduced.matches||!completed){if(relay.view().item)pendingNudge=notice;return;}window.metaBot?.acknowledgeNudge?.(notice).catch(showDragError);},2200);
  }
  window.metaBot?.onCompletionVisible?.(visible=>{shown=visible;if(visible)requestAnimationFrame(()=>requestAnimationFrame(present));});
  window.metaBot?.onCompletionNudge?.(notice=>{pendingNudge=notice;present();});
  setInterval(present,250);
  window.lucide?.createIcons();render();
})();
