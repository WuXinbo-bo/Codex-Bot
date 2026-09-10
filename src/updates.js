(function(){
  const $=id=>document.getElementById(id),api=window.metaBot;
  if(!$('updateStatus'))return;
  let state={};
  const messages={idle:'尚未检查',checking:'正在检查更新',current:'已是最新版本',available:'发现新版本',downloading:'下载并验证中',ready:'更新包已验证，可以安装',installing:'正在启动安装器',unconfigured:'此构建尚未配置更新发布源',error:'更新失败，可重试'};
  function render(value){
    state=value||{};
    $('updateVersion').textContent=state.currentVersion?'v'+state.currentVersion:'';
    $('updateStatus').textContent=state.error||messages[state.phase]||'桌面版本支持检查更新';
    if(state.version&&['available','ready'].includes(state.phase))$('updateStatus').textContent+=' · v'+state.version;
    const busy=['checking','downloading','installing'].includes(state.phase);
    $('updateCheck').disabled=busy||!api?.checkUpdate;
    $('updateCheck').classList.toggle('spinning',state.phase==='checking');
    $('updateCheck').setAttribute('aria-busy',String(state.phase==='checking'));
    $('updateDownload').hidden=!state.version||!['available','error'].includes(state.phase);
    $('updateInstall').hidden=state.phase!=='ready';
    for(const id of ['updateLater','updateIgnore'])$(id).hidden=!state.version||busy;
    $('updateNotes').hidden=!state.notes;$('updateNotes').textContent=String(state.notes||'').slice(0,5000);
    $('updateProgress').hidden=state.phase!=='downloading';
    if(state.total>0)$('updateProgress').value=Math.min(100,100*state.received/state.total);else $('updateProgress').removeAttribute('value');
    const p=state.preferences||{};
    $('updateAutoCheck').checked=p.autoCheck!==false;$('updateAutoDownload').checked=p.autoDownload===true;$('updateNotifications').checked=p.notifications!==false;
    if(state.phase!=='ready')$('updateConfirm').hidden=true;
  }
  async function call(fn){try{if(!fn)throw Error('请在桌面版使用更新功能');await fn();}catch(error){$('updateStatus').textContent=error.message;}}
  api?.onUpdate?.(render);api?.getUpdateState?.().then(render).catch(e=>$('updateStatus').textContent=e.message);
  api?.onUpdateOpen?.(()=>{
    $('diagnostics').hidden=false;$('panel').classList.add('settings-open');$('diagnosticsButton').setAttribute('aria-expanded','true');
    document.querySelector('[data-settings-tab="updates"]').click();
  });
  $('updateCheck').onclick=()=>call(api?.checkUpdate);
  $('updateDownload').onclick=()=>call(api?.downloadUpdate);
  $('updateInstall').onclick=()=>$('updateConfirm').hidden=false;
  $('updateCancelInstall').onclick=()=>$('updateConfirm').hidden=true;
  $('updateConfirmInstall').onclick=()=>{$('updateConfirm').hidden=true;call(api?.installUpdate);};
  $('updateLater').onclick=()=>call(()=>api.dismissUpdate(false));
  $('updateIgnore').onclick=()=>call(()=>api.dismissUpdate(true));
  for(const id of ['updateAutoCheck','updateAutoDownload','updateNotifications'])$(id).onchange=()=>call(()=>api.setUpdatePreferences({autoCheck:$('updateAutoCheck').checked,autoDownload:$('updateAutoDownload').checked,notifications:$('updateNotifications').checked}));
  render(state);
})();
