(function(){
  const api=window.metaBot;if(!api?.companion)return;
  const section=document.createElement('div');section.className='settings-section companion-tools';section.dataset.settingsSection='companion';section.hidden=true;
  section.innerHTML='<label><input id="companionMouse" type="checkbox"> 鼠标互动</label><small>慢慢摸头、轻点脸颊、绕圈或碰一下抬起的手。右键机器人可主动打招呼或安静一会儿。</small><button id="resumeMouse" hidden>恢复主动互动</button><output id="companionFeedback" role="status"></output>';
  document.getElementById('diagnostics').append(section);
  const input=document.getElementById('companionMouse'),feedback=document.getElementById('companionFeedback'),resume=document.getElementById('resumeMouse');
  async function run(action,value){
    input.disabled=resume.disabled=true;
    try{const result=await api.companion(action,value);if(result?.ok===false)throw Error(result.error);feedback.textContent='';}
    catch(e){feedback.textContent=e.message;try{render(await api.companion('state'));}catch{ /* Keep the original save error visible. */ }}
    finally{input.disabled=resume.disabled=false;}
  }
  input.onchange=e=>run('preferences',{mouse:e.target.checked});resume.onclick=()=>run('quiet',{minutes:0});
  function render(value){input.checked=value.mouse;resume.hidden=!(value.quietUntil>Date.now());}
  function open(tab='companion'){document.getElementById('diagnostics').hidden=false;document.getElementById('panel').classList.add('settings-open');document.getElementById('diagnosticsButton').setAttribute('aria-expanded','true');document.querySelector('[data-settings-tab="'+tab+'"]')?.click();}
  api.onCompanionOpen(()=>open());api.onSettingsOpen?.(tab=>open(tab));api.onCompanion(render);api.companion('state').then(render).catch(e=>feedback.textContent=e.message);
})();
