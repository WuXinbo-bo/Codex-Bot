(function(){
  const api=window.metaBot,C=window.MetaBotCompanion;if(!api?.companion||!C)return;
  const section=document.createElement('div');section.className='settings-section companion-tools';section.dataset.settingsSection='companion';section.hidden=true;
  section.innerHTML=`
    <div class="tool-row"><label><input id="companionEnabled" type="checkbox">陪伴能力</label><label><input id="companionMouse" type="checkbox">鼠标互动</label></div>
    <div class="tool-row"><button data-tool="wake">开工</button><button data-tool="sleep">收拾休息</button><small id="companionMood"></small></div>
    <output id="companionFeedback" role="status"></output>
    <nav class="tool-row" aria-label="陪伴分类"><button data-companion-group="work">陪工道具</button><button data-companion-group="space">生活物件</button><button data-companion-group="games">短时互动</button></nav>
    <fieldset><legend>小生活角</legend><div id="spaceButtons" class="space-buttons"></div><div class="tool-row"><button data-tool="water"><i data-lucide="sprout"></i>浇水</button><small id="wateredLabel"></small></div></fieldset>
    <fieldset><legend>台灯 · 专注陪工</legend><div class="tool-row"><button data-focus="25">25 分钟</button><button data-focus="50">50 分钟</button><button data-focus="0">结束专注</button></div><small id="focusLabel">专注时减少娱乐动作，任务提醒照常</small></fieldset>
    <fieldset><legend>沙漏 · 轻提醒</legend><div class="tool-row"><label>分钟 <input id="timerMinutes" type="number" min="1" max="120" value="5" style="width:58px"></label><button id="startHourglass">翻转沙漏</button><button data-timer="0">取消</button></div><small id="timerLabel"></small></fieldset>
    <fieldset><legend>工作本 · 便签与重点任务</legend><select id="companionTask" aria-label="选择任务"></select><input id="taskNote" type="text" maxlength="160" placeholder="这轮完成后，提醒我…" aria-label="完成便签"><div class="tool-row"><button id="saveTaskNote">夹好便签</button><button id="pinTask">插旗关注</button><button id="unpinTask">撤旗</button><button id="copyTaskPlane">纸飞机 · 复制链接</button></div><ul id="companionNotes"></ul></fieldset>
    <fieldset><legend>放大镜 · 连接检查</legend><button id="companionInspect">检查 Codex 连接</button><small id="companionConnection"></small></fieldset>
    <fieldset><legend>收纳箱 · 最近完成</legend><ul id="companionHistory"></ul></fieldset>
    <fieldset><legend>休息片刻 · 12 种小互动</legend><select id="companionGameSelect" aria-label="选择小互动"></select><div class="tool-row"><button id="startCompanionGame">开始</button><button id="randomCompanionGame">随机玩一个</button><button data-tool="game-stop">收好</button></div><small id="gameHint">每次 18–25 秒；任务有新进展时自动让路</small><div id="companionGame" class="companion-game" tabindex="0" aria-label="小互动区域，左右键移动，空格操作" hidden></div><div id="gameKeys" class="companion-games-controls" hidden><button data-game-x="20">左</button><button data-game-x="50">中</button><button data-game-x="80">右</button></div><output id="gameScore" role="status"></output><small>可用鼠标、左右键和空格；按住类玩法用空格按下与松开。纸飞机先在左侧按下，再移动到右侧松开。</small></fieldset>
    <ul id="companionAlerts"></ul>`;
  document.getElementById('diagnostics').append(section);
  const $=id=>document.getElementById(id);let state={},lastTasks='',lastNotes='',lastHistory='',lastAlerts='',frame=null,lastFrame=0,cursor=50,cursorY=50,moveAt=0,moveBusy=false,lastGameStarted=null;
  const run=async(action,value={})=>{try{const result=await api.companion(action,value);if(result?.ok===false)throw Error(result.error||'操作失败');$('companionFeedback').textContent=result?.message||'';return result;}catch(error){$('companionFeedback').textContent=error.message;return null;}};
  function group(name){section.querySelectorAll('fieldset').forEach((el,i)=>{el.hidden=(i===0?'space':i===6?'games':'work')!==name;});section.querySelectorAll('[data-companion-group]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.companionGroup===name)));if(name!=='games'&&state.game)run('game-stop');}
  section.querySelectorAll('[data-companion-group]').forEach(b=>b.onclick=()=>group(b.dataset.companionGroup));group('work');
  function icon(){window.lucide?.createIcons({root:section,attrs:{'stroke-width':1.8}});}
  for(const [id,label]of Object.entries(C.SPACES)){const b=document.createElement('button');b.textContent=label;b.dataset.space=id;b.onclick=()=>run('preferences',{space:id});$('spaceButtons').append(b);}
  for(const game of C.GAMES)$('companionGameSelect').add(new Option(game.label,game.id));
  section.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>run(b.dataset.tool));
  section.querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>run('focus',{minutes:Number(b.dataset.focus)}));
  section.querySelectorAll('[data-timer]').forEach(b=>b.onclick=()=>run('timer',{minutes:Number(b.dataset.timer)}));
  $('companionEnabled').onchange=e=>run('preferences',{enabled:e.target.checked});$('companionMouse').onchange=e=>run('preferences',{mouse:e.target.checked});
  $('startHourglass').onclick=()=>{if($('timerMinutes').reportValidity())run('timer',{minutes:Number($('timerMinutes').value)});};
  $('saveTaskNote').onclick=async()=>{if(await run('note',{key:$('companionTask').value,text:$('taskNote').value}))$('taskNote').value='';};
  $('pinTask').onclick=()=>run('pin',{key:$('companionTask').value});$('unpinTask').onclick=()=>run('pin',{key:null});
  $('copyTaskPlane').onclick=()=>run('copy',{key:$('companionTask').value});
  $('companionInspect').onclick=async()=>{const b=$('companionInspect');b.disabled=true;b.textContent='正在检查…';try{const r=await run('inspect');$('companionConnection').textContent=r?.message||'检查失败，可重试';}finally{b.disabled=false;b.textContent='检查 Codex 连接';}};
  $('startCompanionGame').onclick=()=>run('game',{id:$('companionGameSelect').value});$('randomCompanionGame').onclick=()=>run('game',{id:'random'});
  function list(id,items,render){const el=$(id);el.replaceChildren();for(const item of items){const li=document.createElement('li');render(li,item);el.append(li);}}
  function text(el,value){const span=document.createElement('span');span.textContent=value;el.append(span);}
  function button(el,label,action){const b=document.createElement('button');b.textContent=label;b.onclick=action;el.append(b);}
  const remaining=until=>Math.max(0,Math.ceil((until-Date.now())/60000));
  function render(value){
    state=value;$('companionEnabled').checked=value.enabled;$('companionMouse').checked=value.mouse;
    $('companionMood').textContent=value.sleeping?'休息中':value.focused?'专心陪你':'在你身边';
    section.querySelectorAll('[data-space]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.space===value.space)));
    $('focusLabel').textContent=value.focused?'剩余约 '+remaining(value.focusUntil)+' 分钟':'专注时减少娱乐动作，任务提醒照常';
    $('timerLabel').textContent=value.timer?'剩余约 '+remaining(value.timer.until)+' 分钟，关闭面板也会继续计时':'计时结束后，会在任务板上留一条提醒';
    $('wateredLabel').textContent=value.wateredAt?'上次浇水 '+new Date(value.wateredAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'不用每日照料，想起来再浇水';
    const tasks=(value.tasks||[]).filter(t=>t.active),key=JSON.stringify(tasks);
    if(key!==lastTasks){lastTasks=key;const select=$('companionTask'),selected=select.value;select.replaceChildren();for(const t of tasks)select.add(new Option(t.title,t.key));if(!tasks.length)select.add(new Option('暂无进行中的任务',''));if(tasks.some(t=>t.key===selected))select.value=selected;}
    const notes=JSON.stringify(value.notes);if(notes!==lastNotes){lastNotes=notes;list('companionNotes',value.notes,(li,n)=>{text(li,n.text);button(li,'移除',()=>run('remove-note',{id:n.id}));});}
    const history=JSON.stringify(value.history);if(history!==lastHistory){lastHistory=history;list('companionHistory',value.history.slice(0,20),(li,h)=>{text(li,h.title);button(li,'查看',()=>run('history-open',{key:h.key}));});if(!value.history.length)$('companionHistory').textContent='完成的任务会收在这里';}
    const alerts=JSON.stringify(value.alerts);if(alerts!==lastAlerts){lastAlerts=alerts;list('companionAlerts',value.alerts,(li,a)=>{text(li,a.title);button(li,'收好',()=>run('ack',{id:a.id}));});}
    const game=value.game;$('companionGame').hidden=!game;$('gameKeys').hidden=!game;
    if(game){$('gameHint').textContent=C.GAMES.find(g=>g.id===game.id).hint;draw();if(frame===null)frame=requestAnimationFrame(animate);if(lastGameStarted!==game.started){lastGameStarted=game.started;requestAnimationFrame(()=>{const area=$('companionGame').getBoundingClientRect(),scroller=$('diagnostics'),bounds=scroller.getBoundingClientRect();if(area.bottom+38>bounds.bottom)scroller.scrollTop+=area.bottom+38-bounds.bottom;});}}
    else {if(frame!==null)cancelAnimationFrame(frame);frame=null;$('gameScore').textContent=value.lastResult||'';}
  }
  const dot=(x,y,r=11,fill='#c5dfcf',extra='')=>`<circle cx="${x*2}" cy="${y}" r="${r}" fill="${fill}" stroke="#557b64" ${extra}/>`;
  function draw(){
    const g=state.game;if(!g)return;
    const t=(Date.now()-g.started)/1000,beat=t%2,target=g.target,quiet=matchMedia('(prefers-reduced-motion: reduce)').matches;
    let svg='',label='';
    if(g.id==='catch'){svg=dot(target,50,13,'#e7cc59');label='接住小球';}
    if(g.id==='hands'){const side=(g.round+Math.floor(g.seed*10))%2;svg=dot(25,55,20)+dot(75,55,20)+(beat<.8?`<text x="${side?150:50}" y="55">★</text>`:'');label=beat<.8?'记住星星的位置':'猜一只手';}
    if(g.id==='mirror'||g.id==='balance'){svg=dot(g.id==='mirror'?target:50,25,10,'#e7cc59')+`<path d="M100 12v78" stroke="#a3b9aa" stroke-dasharray="3 4"/>`+dot(cursor,72,12);label=g.id==='mirror'?'在下面做镜像':'把软块稳在中间';}
    if(g.id==='stretch'||g.id==='water'){const duration=g.holding?Date.now()-g.holding:0,level=Math.min(100,duration/(g.id==='water'?20:35));svg=`<rect x="25" y="40" width="150" height="24" rx="8" fill="#dfebe2"/><rect x="25" y="40" width="${level*1.5}" height="24" rx="8" fill="#8bb79a"/><path d="M${g.id==='water'?130:120} 32v40" stroke="#53715c" stroke-width="3"/>`;label=g.id==='water'?'按住，水位到绿线再松开':'按住约 2 秒，再轻轻松开';}
    if(g.id==='trace'){svg=[[20,25],[80,25],[80,75],[20,75]].map(([x,y],i)=>dot(x,y,13,i===g.trace%4?'#e7cc59':'#dfebe2')+`<text x="${x*2}" y="${y}">${i+1}</text>`).join('');label='按顺序描一圈';}
    if(g.id==='five'||g.id==='rhythm'){const active=g.id==='five'?beat>.9&&beat<1.7:beat<.45||beat>1.8;svg=dot(50,55,25,active?'#e7cc59':'#dfebe2')+`<text x="100" y="55">${g.id==='five'?'✋':'♪'}</text>`;label=active?'现在轻点':'等它亮起';}
    if(g.id==='sort'){const colors=['#ecd46f','#9fc5e2'];svg=`<rect x="80" y="15" width="40" height="23" rx="6" fill="${colors[g.round%2]}"/><rect x="20" y="60" width="60" height="25" rx="7" fill="${colors[0]}"/><rect x="120" y="60" width="60" height="25" rx="7" fill="${colors[1]}"/>`;label='选择相同颜色的盒子';}
    if(g.id==='stack'){const x=50+35*Math.sin(t*1.5);svg=`<rect x="${(quiet?50:x)*2-13}" y="22" width="26" height="20" rx="5" fill="#e7cc59"/><rect x="80" y="60" width="40" height="25" rx="6" fill="#b2d2be"/><path d="M100 12v80" stroke="#789682" stroke-dasharray="3 4"/>`;label=quiet?(Math.abs(x-50)<14?'现在放下':'等提示'):'经过中央时放下';}
    if(g.id==='plane'){svg=`<path d="m15 45 45 10-30 15 4-13z" fill="#e9d47c" stroke="#907947"/><rect x="147" y="27" width="35" height="49" rx="8" fill="#b2d2be"/><path d="M153 43h23" stroke="#4d775d"/>`;label='从纸飞机拖到邮筒';}
    $('companionGame').innerHTML=`<svg viewBox="0 0 200 100" aria-hidden="true">${svg}</svg>`;
    $('gameScore').textContent=`${Math.max(0,Math.ceil((g.ends-Date.now())/1000))} 秒 · 配合 ${g.score} 次 · ${label}`;
  }
  function animate(at){frame=null;if(!state.game||section.hidden||document.hidden||!$('companionGame').getClientRects().length)return;if(at-lastFrame>50){lastFrame=at;draw();}frame=requestAnimationFrame(animate);}
  const game=$('companionGame');
  function point(e){const r=game.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100};}
  const input=(kind,p={x:cursor,y:cursorY})=>run('game-input',{kind,...p});
  game.addEventListener('pointerdown',e=>{if(e.button!==0)return;game.setPointerCapture(e.pointerId);if(['water','stretch','plane'].includes(state.game?.id))input('down',point(e));});
  game.addEventListener('pointerup',e=>{if(e.button!==0)return;input(['water','stretch','plane'].includes(state.game?.id)?'up':'click',point(e));if(game.hasPointerCapture(e.pointerId))game.releasePointerCapture(e.pointerId);});
  game.addEventListener('pointercancel',()=>input('cancel'));
  game.addEventListener('pointermove',e=>{cursor=Math.max(0,Math.min(100,point(e).x));if(!['mirror','balance'].includes(state.game?.id)||moveBusy||performance.now()-moveAt<100)return;moveAt=performance.now();moveBusy=true;input('move',point(e)).finally(()=>moveBusy=false);});
  game.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter'].includes(e.key))return;e.preventDefault();if(e.repeat)return;if(e.key.startsWith('Arrow')){cursor=Math.max(0,Math.min(100,cursor+(e.key==='ArrowLeft'?-10:e.key==='ArrowRight'?10:0)));cursorY=Math.max(0,Math.min(100,cursorY+(e.key==='ArrowUp'?-10:e.key==='ArrowDown'?10:0)));input('move');}else input(['water','stretch','plane'].includes(state.game?.id)?'down':'click');});
  game.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();input('up');}});
  section.querySelectorAll('[data-game-x]').forEach(b=>b.onclick=()=>{cursor=Number(b.dataset.gameX);input('click');game.focus({preventScroll:true});});
  function open(detail={}){ $('diagnostics').hidden=false;$('panel').classList.add('settings-open');$('diagnosticsButton').setAttribute('aria-expanded','true');document.querySelector('[data-settings-tab="companion"]').click();group(detail.group||'work');}
  $('companionButton').onclick=()=>run('show');api.onCompanionOpen(open);api.onCompanion(render);
  document.querySelectorAll('[data-settings-tab]').forEach(tab=>tab.addEventListener('click',()=>{if(tab.dataset.settingsTab!=='companion'&&state.game)run('game-stop');}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.game)run('game-stop');});
  api.companion('state').then(render).catch(e=>$('companionFeedback').textContent=e.message);icon();
})();
