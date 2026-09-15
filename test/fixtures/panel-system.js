(async()=>{
  const frames={},handlers={},windows={},events=[],stored={'config.json':{codex:{enabled:false},onboarding:{status:'skipped'},appearance:{motion:'full'},notifications:{retainCompletions:true}},'window-state.json':{nativePhysical:{x:60,y:130}}};
  const geometry={x:60,y:130,width:128,height:128,scale:1,area:{x:0,y:0,width:900,height:520}};
  let turn=0,tasks=[];
  const faults={store:null,open:false};
  const log=text=>document.getElementById('log').textContent=text;
  const emit=(label,topic,payload)=>{for(const fn of handlers[label]?.[topic]||[])fn({payload});};
  window.attachDemo=(label,w)=>{
    handlers[label]={};
    w.__TAURI__={event:{listen:async(topic,fn)=>{(handlers[label][topic]||=[]).push(fn);return()=>{};}},core:{invoke:async(command,r)=>{
      if(command==='client_request'){emit('ball','native:request',{...r,from:label});return;}
      const {op,args={}}=r;
      if(op==='update-info')return {currentVersion:'0.3.0',configured:true};
      if(op==='update-check')return {version:'0.4.0',notes:'改进提醒与动画。\n测试更新，不会下载真实文件。'};
      if(op==='update-download'){emit('ball','update:progress',{received:50,total:100});return {verified:true};}
      if(op==='update-install'){events.push({topic:'test:update-install'});return {ok:true};}
      if(op==='bootstrap')return{stored,executable:'demo-only',codexHome:'demo-only'};
      if(op==='geometry')return structuredClone(geometry);
      if(op==='environment')return {executable:'demo-only',codexHome:'demo-only',executableFound:false,homeReadable:false};
      if(op==='window'){
        events.push({topic:'window',target:args.label,data:structuredClone(args)});
        const frame=frames[args.label],state=windows[args.label]||={};Object.assign(state,args);
        if(args.action==='bounds'){for(const key of ['x','y','width','height'])if(args[key]!=null)frame.style[{x:'left',y:'top'}[key]||key]=args[key]+'px';if(args.label==='ball')Object.assign(geometry,args);}
        if(args.action==='show'||args.action==='hide'){state.visible=args.action==='show';frame.style.visibility=state.visible?'visible':'hidden';}
        return structuredClone(geometry);
      }
      if(op==='publish'){events.push({topic:args.topic,target:args.target,data:args.data});emit(args.target,'bridge:event',args);return;}
      if(op==='reply'){emit(args.target,'bridge:reply',args);return;}
      if(op==='store'){if(faults.delayStore===args.name){faults.delayStore=null;await new Promise(resolve=>{faults.releaseStore=resolve;});}if(faults.store===args.name){faults.store=null;throw Error('模拟保存失败');}stored[args.name]=structuredClone(args.value);return true;}
      if(op==='open'){if(faults.open){faults.open=false;throw Error('模拟打开失败');}log('模拟系统打开任务链接（演示不会打开真实 Codex）');return true;}
      if(['input','stop-source','copy','quit'].includes(op))return true;
      throw Error('Demo does not implement '+op);
    }}};
  };
  try{
    for(const [label,file] of [['panel','panel.html'],['completions','completions.html'],['toast','lifecycle-toast.html'],['ball','index.html']]){
      const response=await fetch('../../dist/tauri/'+file,{cache:'no-store'});if(!response.ok)throw Error('先运行 node scripts/build-tauri.cjs');
      let html=await response.text();
      html=html.replace('<head>',`<head><base href="${new URL('../../dist/tauri/',location.href)}"><style>:root{color-scheme:light!important}</style><script>parent.attachDemo('${label}',window)</script>`);
      const frame=document.createElement('iframe');frame.title=label;frame.style.visibility='hidden';frames[label]=frame;
      document.getElementById('stage').append(frame);frame.srcdoc=html;
    }
    await new Promise((resolve,reject)=>{const start=Date.now();const timer=setInterval(()=>{if(frames.ball.contentWindow.__nativeBot){clearInterval(timer);resolve();}else if(Date.now()-start>20000){clearInterval(timer);reject(Error('初始化超时'));}},50);});
    const bot=()=>frames.ball.contentWindow.__nativeBot;
    function update(){bot().center.update({tasks:structuredClone(tasks),sources:{codex:'connected'},sourceHealth:{codex:{state:'connected'}},fetchedAt:new Date().toISOString()});}
    async function act(action){
      if(action==='show'||action==='hide')return bot().showPanel(action==='show',true);
      if(action==='start'||action==='both'){turn++;tasks=[{id:'demo-a',source:'codex',title:'Alpha · 演示任务',status:'running',turnId:'turn-'+turn,eventAt:new Date().toISOString()}];if(action==='both')tasks.push({...tasks[0],id:'demo-b',title:'Beta · 演示任务'});}
      if(action==='finish'){tasks=tasks.map(t=>({...t,status:'completed',eventAt:new Date().toISOString()}));}
      const status={pause:'paused',resume:'running',attention:'needs_attention',fail:'failed',stop:'stopped'}[action];
      if(status)tasks=tasks.map(t=>({...t,status,eventAt:new Date().toISOString()}));
      update();log('已发送真实任务状态：'+action);
    }
    for(const b of document.querySelectorAll('[data-action]'))b.onclick=()=>act(b.dataset.action).catch(e=>log(e.message));
    window.panelDemo={frames,events,windows,stored,faults,act,bot,resize:(width,height)=>{geometry.area={x:0,y:0,width,height};Object.assign(document.getElementById('stage').style,{width:width+'px',height:height+'px'});emit('ball','native:geometry',{});},mouse:e=>emit('ball','native:mouse',e)};log('已就绪：真实生产界面，模拟数据。点击开始任务，等待动作，再点击完成。');
    if(new URLSearchParams(location.search).has('companion'))await bot().action('panel','companion',['show']);
  }catch(e){log(e.message);}
})();
