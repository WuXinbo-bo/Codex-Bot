(function () {
  const A=window.MetaBotAppearance,$=id=>document.getElementById(id);
  const section=document.querySelector('[data-settings-section="appearance"]');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let saved=A.normalize(),draft=saved,ready=false,saving=false,preview=null,controller=null;
  let configure=()=>{},randomControl=()=>{},appearanceControl=null;
  const selectFields={artStyle:'artStyle',eyeStyle:'eyeStyle',shape:'shapeSelect',skin:'skinSelect',companionMode:'companionMode',maskStyle:'maskStyle',maskFrequency:'maskFrequency'};
  const toggles={emoji:'emojiMask',maskAuto:'maskAuto',particles:'particlesToggle',random:'randomToggle',stories:'storiesToggle',reducedMotion:'reducedMotion'};
  const modes={artStyle:'artMode',eyeStyle:'eyeMode',shape:'shapeMode',skin:'skinMode'};
  const icons=()=>window.lucide?.createIcons();
  for(const [id,meta] of Object.entries(A.ART_STYLES))$('artStyle').add(new Option(meta.label,id));
  for(const [id,meta] of Object.entries(A.EYE_PRESETS))$('eyeStyle').add(new Option(meta.label,id));
  const skinLabels=['草木绿','深海蓝','日落橙','樱花粉','紫罗兰','柠檬黄','暗夜','霓虹'];
  Object.entries(A.SKINS).forEach(([id,colors],index)=>{
    const button=document.createElement('button');button.type='button';button.className='skin-swatch';
    button.style.setProperty('--swatch',colors[0]);button.title=skinLabels[index];button.setAttribute('aria-label',skinLabels[index]);button.dataset.skin=id;
    button.onclick=()=>{draft=A.normalize({...draft,skin:id});sync();updatePreview();};$('skinSwatches').append(button);
  });
  function changed(){return JSON.stringify(draft)!==JSON.stringify(saved);}
  function sync(message=''){
    for(const id of [...Object.values(selectFields),...Object.values(toggles),...Object.values(modes),'appearanceShuffle','appearancePin','appearanceAuto'])$(id).disabled=!ready||saving;
    for(const button of $('skinSwatches').children)button.disabled=!ready||saving;
    $('appearanceShuffle').disabled=!ready||saving||!(['artStyle','eyeStyle','skin'].some(key=>draft[key]==='auto')||['morph','random'].includes(draft.shape));
    for(const [key,id] of Object.entries(selectFields)){
      const automatic=key==='shape'?['morph','random'].includes(draft[key]):draft[key]==='auto';
      if(!automatic)$(id).value=draft[key];
      if(modes[key]){
        $(modes[key]).value=automatic?(key==='shape'?draft[key]:'auto'):'fixed';
        if(key!=='skin')$(id).hidden=automatic;
      }
    }
    $('skinSwatches').hidden=draft.skin==='auto';
    for(const button of $('skinSwatches').children)button.setAttribute('aria-pressed',String(button.dataset.skin===draft.skin));
    for(const [key,id] of Object.entries(toggles))$(id).checked=draft[key];
    for(const button of document.querySelectorAll('.appearance-apply,.appearance-discard'))button.disabled=!ready||saving||!changed();
    for(const output of document.querySelectorAll('.appearance-status'))output.textContent=message||(!ready?'加载中':saving?'应用中':changed()?'未应用':'已应用');
  }
  function effectiveMotion(){return reduced.matches?'reduced':draft.motion;}
  function stopPreview(){controller?.stop();preview?.destroy();controller=null;preview=null;appearanceControl=null;}
  function visible(){return ready&&!document.hidden&&!$('diagnostics').hidden&&!section.hidden&&document.body.dataset.phase!=='hidden';}
  function updatePreview(){
    if(!visible()){stopPreview();return;}
    if(!preview){
      preview=window.MetaBotM1.create($('appearancePreview'),{appearance:draft,motionLevel:effectiveMotion()});
      controller=window.MetaBotExpressionController.createExpressionController({
        appearance:draft,motionLevel:effectiveMotion(),appearanceNow:()=>Date.now()*8,
        setExpression:(name,options)=>preview?.setExpression(name,options),
        onResolvedAppearance:value=>preview?.setAppearance(value),
        isAppearanceBlocked:()=>Boolean(preview?.getMaskState()?.current),
        setMotion:value=>preview?.setMotion(value),setGaze:(x,y)=>preview?.setGaze(x,y),clearGaze:()=>preview?.clearGaze(),setActive:value=>preview?.setActive(value),
        onPerformance:theater=>preview?.setPerformanceContext({theater}),
        onTheaterMask:id=>id?preview?.setMask(id,'classic'):preview?.clearMask(true),
        onBehaviorControl:fn=>{configure=fn;},onRandomControl:fn=>{randomControl=fn;},onAppearanceControl:value=>{appearanceControl=value;}
      });
      controller.update('idle',0,{quiet:true});
    }
    configure(draft);randomControl(draft.random);preview.setMotionLevel(effectiveMotion());controller.setMotionLevel(effectiveMotion());
  }
  for(const [key,id] of Object.entries(modes))$(id).onchange=()=>{
    const value=$(id).value,current=appearanceControl?.snapshot().current;
    draft=A.normalize({...draft,[key]:value==='fixed'?(current?.[key]||$(selectFields[key]).value):value});sync();updatePreview();
  };
  for(const [key,id] of Object.entries(selectFields))$(id).onchange=()=>{draft=A.normalize({...draft,[key]:$(id).value});sync();updatePreview();};
  for(const [key,id] of Object.entries(toggles))$(id).onchange=()=>{
    const value=$(id).checked;draft=A.normalize({...draft,[key]:value,...(key==='emoji'?{masks:value}:{})});sync();updatePreview();
  };
  $('appearanceShuffle').onclick=()=>{appearanceControl?.shuffle();};
  $('appearancePin').onclick=()=>{const current=appearanceControl?.snapshot().current;if(current){draft=A.normalize({...draft,...current});sync();updatePreview();}};
  $('appearanceAuto').onclick=()=>{draft=A.normalize({...draft,artStyle:'auto',eyeStyle:'auto',shape:'morph'});sync();updatePreview();};
  for(const button of document.querySelectorAll('.appearance-discard'))button.onclick=()=>{draft={...saved};sync();updatePreview();};
  for(const button of document.querySelectorAll('.appearance-apply'))button.onclick=async()=>{
    if(!ready||saving)return;
    const submitted={...draft};saving=true;sync();
    let message='';
    try{
      if(!window.metaBot?.setAppearance)throw Error('当前预览不支持保存');
      const result=await window.metaBot.setAppearance(submitted);if(!result?.ok)throw Error(result?.error||'保存失败');
      saved=A.normalize(result.appearance||submitted);
      if(JSON.stringify(draft)===JSON.stringify(submitted))draft={...saved};
    }catch(error){message=error.message;}
    finally{saving=false;sync(message);}
  };
  // One preview instance, and no animation loop in hidden settings or a hidden native window.
  const observer=new MutationObserver(()=>updatePreview());
  for(const target of [section,$('diagnostics'),document.body])observer.observe(target,{attributes:true,attributeFilter:['hidden','data-phase']});
  document.addEventListener('visibilitychange',updatePreview);reduced.addEventListener('change',updatePreview);
  window.addEventListener('pagehide',()=>{observer.disconnect();stopPreview();});
  window.__appearancePreview={state:()=>({draft:{...draft},saved:{...saved},active:Boolean(preview),runtime:appearanceControl?.snapshot(),render:preview?.getState()}),shuffle:()=>appearanceControl?.shuffle()};
  sync();icons();
  window.metaBot?.getNotificationSettings?.().then(settings=>{saved=A.migrate(settings?.appearance);draft={...saved};ready=true;sync();updatePreview();}).catch(error=>sync(error.message));
})();
