(() => {
  const api=window.metaBot;
  if(!api?.onTaskBoard)return;
  const panel=document.getElementById('panel'),list=document.getElementById('taskList');
  const scroll=list.parentElement,feedback=document.getElementById('feedback');
  panel.classList.add('unified-board');
  panel.insertBefore(scroll,document.getElementById('diagnostics'));
  const rows=new Map(),busy=new Set(),seen=new Set();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let state={rows:[],animation:true},hovered=false,focused=false,drag=null,scheduled=false,nudging=false;
  const labels={started:'开始任务',joined:'发现进行中任务',resumed:'继续执行',running:'正在执行',queued:'排队中',paused:'已暂停',needs_attention:'需要你处理',completed:'已完成，等待确认',failed:'执行失败',stopped:'已停止',unknown:'状态待核实'};
  const symbols={started:'play',joined:'scan-search',resumed:'play',running:'loader',queued:'clock-3',paused:'circle-pause',needs_attention:'circle-help',completed:'circle-check',failed:'circle-alert',stopped:'circle-stop',unknown:'circle-help'};
  const actionLabels={copy:'复制任务链接',open:'查看任务',ack:'确认提醒',snooze:'5 分钟后提醒'};
  const actionIcons={copy:'copy',open:'external-link',ack:'check',snooze:'alarm-clock'};
  function presentation(){
    scheduled=false;
    const bounds=scroll.getBoundingClientRect();
    const ids=[...rows].filter(([,row])=>{const r=row.getBoundingClientRect();return r.bottom>bounds.top&&r.top<bounds.bottom&&r.width>0;}).map(([id])=>id);
    api.boardPresentation({ids,hovered,focused,busy:busy.size>0}).catch(error=>{feedback.textContent=error.message;});
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(presentation);}}
  function icon(node,name){if(node.dataset.icon===name)return;node.dataset.icon=name;node.innerHTML=`<i data-lucide="${name}"></i>`;window.lucide?.createIcons({root:node,attrs:{'stroke-width':1.8}});}
  async function act(row,action){
    const item=row.item;if(!item||busy.has(item.id))return;
    busy.add(item.id);row.pendingAction=action;row.actionError='';feedback.textContent='';schedule();render(state);
    try{
      if(action==='ack'&&state.animation&&!reduced.matches)await row.animate([{opacity:1,transform:'none'},{opacity:.6,transform:'translateX(-6px) scale(.97)'}],{duration:140,easing:'ease-in'}).finished;
      const result=await api.boardTaskAction({id:item.id,eventId:item.eventId,action});
      if(!result?.ok)throw Error(result?.error||'操作失败，请重试');
      if(action==='copy'&&row.isConnected){const b=row.querySelector('[data-action="copy"]');if(b){icon(b,'check');setTimeout(()=>{if(b.dataset.action==='copy')icon(b,'copy');},1200);}}
    }catch(error){const message=error.message.replace(/^Error:\s*/,'');if(row.item?.eventId===item.eventId)row.actionError=message;feedback.textContent=message;feedback.classList.add('error');}
    finally{busy.delete(item.id);row.pendingAction=null;render(state);schedule();}
  }
  function create(item){
    const row=document.createElement('article');row.className='task-row board-card';row.dataset.id=item.id;
    row.innerHTML='<span class="board-status" role="img"></span><span class="row-copy"><strong></strong></span><span class="row-actions"></span>';
    for(let i=0;i<2;i++){
      const b=document.createElement('button');b.type='button';b.className='icon-button';
      b.onclick=()=>act(row,b.dataset.action);row.querySelector('.row-actions').append(b);
    }
    return row;
  }
  function render(next){
    state=next;panel.dataset.manual=String(next.manual);panel.classList.toggle('board-no-motion',!next.animation||reduced.matches);
    panel.style.setProperty('--board-cards-height',`${Math.min(2,next.rows.length)*52}px`);
    if(!next.animation||reduced.matches)for(const row of rows.values())for(const animation of row.getAnimations({subtree:true}))animation.cancel();
    const ids=new Set(next.rows.map(r=>r.id));
    for(const [id,row] of rows)if(!ids.has(id)){for(const a of row.getAnimations({subtree:true}))a.cancel();row.remove();rows.delete(id);}
    for(const item of next.rows){
      let row=rows.get(item.id);
      if(!row){row=create(item);rows.set(item.id,row);list.append(row);}
      const changed=row.item?.status!==item.status;
      if(changed)row.actionError='';
      row.item=item;row.dataset.status=item.status;row.dataset.persistent=String(item.persistent);row.dataset.stale=String(Boolean(item.stale));
      row.classList.toggle('board-action-error',Boolean(row.actionError));
      const title=row.querySelector('strong');title.textContent=row.actionError||item.title;title.title=row.actionError?`${item.title}\n${row.actionError}`:item.title;
      const status=row.querySelector('.board-status');
      const label=item.stale?'连接中断，状态待核实':labels[item.status]||labels.unknown;
      status.title=label;status.setAttribute('aria-label',label);
      if(row.badgeEvent!==item.eventId||!next.animation||reduced.matches)icon(status,symbols[item.status]||symbols.unknown);
      row.querySelectorAll('button').forEach((button,i)=>{
        const action=item.actions[i],pending=busy.has(item.id)&&row.pendingAction===action;button.dataset.action=action;button.title=actionLabels[action];button.setAttribute('aria-label',actionLabels[action]);button.setAttribute('aria-busy',String(pending));button.classList.toggle('spinning',pending);button.disabled=busy.has(item.id);icon(button,pending?'loader':actionIcons[action]);
      });
      if(!seen.has(item.eventId)){
        seen.add(item.eventId);
        if(next.animation&&!reduced.matches){
          row.badgeEvent=item.eventId;
          icon(status,symbols[item.kind]||symbols[item.status]||'circle-help');
          status.animate([{transform:'scale(.65)',opacity:.4},{transform:'scale(1.15)',opacity:1},{transform:'none',opacity:1}],{duration:750,easing:'ease-out'}).finished.then(()=>{if(row.item?.eventId===item.eventId){row.badgeEvent=null;icon(status,symbols[row.item.status]||'circle-help');}}).catch(()=>{});
          if(changed)row.animate([{transform:'translateX(-9px)',opacity:.55},{transform:'none',opacity:1}],{duration:260,easing:'ease-out'});
        }
      }
    }
    if(!hovered&&!focused&&!busy.size&&!drag){
      const ordered=[...rows.values()].sort((a,b)=>Number(b.item.persistent)-Number(a.item.persistent));
      ordered.forEach((row,index)=>{if(list.children[index]!==row)list.insertBefore(row,list.children[index]||null);});
    }
    if(seen.size>2000){const retained=[...seen].slice(-1000);seen.clear();retained.forEach(id=>seen.add(id));}
    document.getElementById('empty').hidden=next.rows.length>0||next.settings;
    document.getElementById('empty').textContent='暂无进行中的任务';
    scroll.hidden=next.settings&&next.rows.length===0;
    panel.classList.toggle('has-board-cards',next.rows.length>0);
    panel.classList.toggle('inline-task-error',[...rows.values()].some(row=>row.actionError));
    schedule();
  }
  api.onTaskBoard(render);
  api.onBoardSettingsClose(()=>{document.getElementById('diagnostics').hidden=true;panel.classList.remove('settings-open');document.getElementById('diagnosticsButton').setAttribute('aria-expanded','false');});
  panel.addEventListener('pointerenter',()=>{hovered=true;schedule();});
  panel.addEventListener('pointerleave',()=>{hovered=false;render(state);schedule();});
  panel.addEventListener('focusin',()=>{focused=true;schedule();});
  panel.addEventListener('focusout',()=>queueMicrotask(()=>{focused=panel.contains(document.activeElement)&&document.activeElement!==document.body;schedule();}));
  window.addEventListener('blur',()=>{focused=false;hovered=false;schedule();});
  scroll.addEventListener('scroll',schedule);new ResizeObserver(schedule).observe(scroll);
  api.onPanelPhase(()=>schedule());
  api.onCompletionNudge(async notice=>{
    const row=[...rows.values()].find(row=>row.item.completionId===notice.id);
    if(!row||nudging||hovered||focused||busy.size||drag||!state.animation||reduced.matches)return;
    const r=row.getBoundingClientRect(),v=scroll.getBoundingClientRect();if(r.top<v.top||r.bottom>v.bottom)return;
    nudging=true;
    try{
      const start=await api.acknowledgeNudge({...notice,phase:'started'});if(!start?.ok)return;
      const n=Math.min(3,notice.stage);
      await row.animate([{transform:'none'},{transform:`translateX(${-n}px) rotate(-1deg)`},{transform:`translateX(${n}px) rotate(1deg)`},{transform:'none'}],{duration:600,iterations:2,easing:'ease-in-out'}).finished;
      await api.acknowledgeNudge(notice);
    }catch(error){if(error.name!=='AbortError')feedback.textContent=error.message;}
    finally{nudging=false;}
  });
  const handle=panel.querySelector('.brand-block');handle.title='拖动任务板';
  handle.addEventListener('dblclick',()=>api.moveTaskBoard({phase:'reset'}).catch(error=>{feedback.textContent=error.message;}));
  handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.screenX,y:e.screenY,moved:false};handle.setPointerCapture(e.pointerId);});
  const dragQueue=[];let dragSending=false;
  async function move(value){
    if(value.phase==='move'&&dragQueue.at(-1)?.phase==='move')dragQueue[dragQueue.length-1]=value;else dragQueue.push(value);
    if(dragSending)return;dragSending=true;
    try{while(dragQueue.length)await api.moveTaskBoard(dragQueue.shift());}
    catch(error){feedback.textContent=error.message;dragQueue.length=0;}
    finally{dragSending=false;}
  }
  handle.addEventListener('pointermove',e=>{
    if(!drag)return;
    if(!drag.moved&&Math.hypot(e.screenX-drag.x,e.screenY-drag.y)>5){drag.moved=true;move({phase:'start',x:drag.x,y:drag.y});}
    if(drag.moved)move({phase:'move',x:e.screenX,y:e.screenY});
  });
  const end=e=>{if(drag?.moved)move({phase:'end',x:e.screenX,y:e.screenY});drag=null;if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);schedule();};
  handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);handle.addEventListener('lostpointercapture',end);
})();
