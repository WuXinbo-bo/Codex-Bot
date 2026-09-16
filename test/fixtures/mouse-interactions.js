(() => {
  const P=MetaBotMousePerformances,select=document.querySelector('#clip'),stage=document.querySelector('#stage'),avatar=document.querySelector('#avatar'),output=document.querySelector('#state');
  const groups={approach:'靠近',pet:'抚摸',cheek:'轻点',tickle:'挠痒',catch:'抓指针',return:'回来',mirror:'模仿',orbit:'绕圈',landing:'落地',social:'招呼'};
  for(const [group,names]of Object.entries(P.groups)){const g=document.createElement('optgroup');g.label=groups[group];for(const name of names){const o=document.createElement('option');o.value=name;o.textContent=P.labels[name];g.append(o);}select.append(g);}
  const ball=MetaBotM1.create(avatar,{expression:'calm'});
  let randomControl,interactive=false,press=null,dragging=false,offset={x:0,y:0},lastOutput='';
  const controller=MetaBotExpressionController.createExpressionController({
    setExpression:(name,options)=>ball.setExpression(name,options),onResolvedAppearance:a=>ball.setAppearance(a),setGaze:(x,y)=>ball.setGaze(x,y),clearGaze:()=>ball.clearGaze(),setMotion:m=>ball.setMotion(m),onPerformance:active=>ball.setPerformanceContext({theater:active}),onRandomControl:fn=>randomControl=fn,
    appearance:{skin:'lemon',shape:'round',maskAuto:false,random:false}
  });
  randomControl(false);controller.update('idle',0,{quiet:true});controller.interact('companion-mode',{active:true});
  const adapter=MetaBotCompanionAvatar.create({expressions:controller,ball});
  function send(type,event,extra={}){const ballPoint={x:event.clientX,y:event.clientY},p=ball.projectPointer(ballPoint),detail={type,ballPoint,local:{x:Math.max(-1,Math.min(1,((p?.x??64)-64)/64)),y:Math.max(-1,Math.min(1,((p?.y??64)-64)/64))},...extra};controller.interact(type,detail);adapter.interact(detail);}
  function replay(){interactive=false;adapter.interact({type:'task-lifecycle'});controller.stop();controller.interact('companion-mode',{active:true});controller.update('idle',0,{quiet:true});document.querySelector('#status').value='idle';controller.playMouse({name:select.value,group:Object.keys(P.groups).find(g=>P.groups[g].includes(select.value)),side:'left'});output.textContent=`逐套预览：${P.labels[select.value]}。切换“试试鼠标”开启真实手势。`;}
  select.onchange=replay;document.querySelector('#replay').onclick=replay;
  for(const [id,step]of [['previous',-1],['next',1]])document.getElementById(id).onclick=()=>{select.selectedIndex=(select.selectedIndex+step+30)%30;replay();};
  document.querySelector('#live').onclick=()=>{controller.stop();adapter.interact({type:'task-lifecycle'});controller.update(document.querySelector('#status').value,0,{quiet:true});interactive=true;lastOutput='';};
  document.querySelector('#status').onchange=e=>{adapter.interact({type:'task-lifecycle'});controller.update(e.target.value,e.target.value==='running'?1:0,{quiet:true});interactive=true;};
  document.querySelector('#reduced').onchange=e=>{const level=e.target.checked?'reduced':'full';controller.setMotionLevel(level);ball.setMotionLevel(level);};
  stage.onpointermove=e=>{if(!interactive)return;if(press){const dx=e.clientX-press.x,dy=e.clientY-press.y;if(!dragging&&Math.hypot(dx,dy)>5){dragging=true;send('drag-start',e);}if(dragging){avatar.style.transform=`translate(${offset.x+dx}px,${offset.y+dy}px)`;send('drag-move',e);}return;}send('hover-move',e);};
  stage.onpointerdown=e=>{if(!interactive||!ball.projectPointer({x:e.clientX,y:e.clientY})?.inBody&&!ball.projectPointer({x:e.clientX,y:e.clientY})?.hand)return;press={x:e.clientX,y:e.clientY};stage.setPointerCapture(e.pointerId);send('press',e);};
  stage.onpointerup=e=>{if(!press)return;if(dragging){offset.x+=e.clientX-press.x;offset.y+=e.clientY-press.y;}send(dragging?'drag-end':'ball-click',e);press=null;dragging=false;};
  stage.onpointercancel=e=>{if(press)send(dragging?'drag-end':'hold-release',e);avatar.style.transform=`translate(${offset.x}px,${offset.y}px)`;press=null;dragging=false;};
  stage.onpointerleave=e=>{if(interactive&&!press)send('pointer-leave',e);};
  const timer=setInterval(()=>{if(!interactive)return;const s=adapter.snapshot(),event=s.events.at(-1),message=`鼠标模式 · ${event?P.labels[event.name]:'等待你的手势'} · 已回应 ${s.accepted} 次${s.chain?' · 互动链 '+s.chain.count+'/3':''}`;if(message!==lastOutput){lastOutput=message;output.textContent=message;}},250);
  window.mousePreview={ball,controller,adapter,replay};replay();
  addEventListener('beforeunload',()=>{clearInterval(timer);adapter.destroy();controller.stop();ball.destroy();});
})();
