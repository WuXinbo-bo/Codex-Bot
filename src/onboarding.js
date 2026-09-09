(function () {
  const $ = id => document.getElementById(id);
  const api = window.metaBot;
  let connected = false, initialized = false, busy = false;
  const message = text => { $('setupMessage').textContent = text; };
  function controls() {
    for (const id of ['setupCheck','setupSave','pickExecutable','pickHome','setupDone','setupSkip','setupTasks','setupCopy']) $(id).disabled = busy;
    $('setupDone').disabled = busy || !connected || !$('setupVerified').checked;
  }
  async function run(fn) {
    if(busy)return;
    busy=true;controls();message('处理中…');
    try { await fn(); message(''); } catch(e) { message(e.message || String(e)); }
    finally {busy=false;controls();}
  }
  async function inspect() {
    if (!api?.inspectConnection) throw Error('此网页是界面预览；请在新版原生 Meta Bot 中执行连接检查。');
    const e=await api.inspectConnection();
    connected=e.state==='connected';
    if(!initialized){$('setupExecutable').value=e.configured?.executable==='codex'?'':e.configured?.executable || '';$('setupHome').value=e.configured?.codexHome || '';initialized=true;}
    $('setupChecks').textContent=connected?`已连接 Codex · ${e.activeCount?`进行中 ${e.activeCount} 项`:'没有进行中任务'}`:e.state==='disabled'?'Codex 已停用，请在连接详情中重新连接。':'未连接，请打开 Codex 或检查连接详情。';
    $('setupDetails').textContent=[
      `${e.executableFound?'✓':'!'} Codex 程序：${e.executable}`,
      `${e.homeReadable?'✓':'!'} 数据目录：${e.codexHome}${e.homeReadable?'':'（不存在或不可读）'}`,
      `${connected?'✓':'!'} 查询通道：${connected?'已连接':e.state==='disabled'?'已停用，请保存并重新连接':'未连接，请初始化 Codex 或修复路径'}`,
      `${e.watching?'✓':'△'} 日志同步：${e.watching?'文件监听 + 轮询':'轮询兜底；无会话日志时可先创建任务'}`,
      connected?(e.activeCount?`进行中 ${e.activeCount} 项`:'连接可用，目前没有进行中任务。'):'连接未确认，不能断言没有任务。',
      `实际任务跳转：${e.onboarding?.status==='verified'?'此前已由用户验证':'等待下面的人工验证（系统打开成功不等于目标正确）'}`
    ].join('\n');controls();
  }
  function show(value){$('setup').hidden=!value;document.body.classList.toggle('setup-open',value);if(value)run(inspect);}
  api?.onSetup?.(show);
  $('setupReopen').onclick=()=>{if(!api?.setup){message('请在原生 Meta Bot 中打开连接向导');return;}api.setup(true).catch(e=>message(e.message));};
  $('setupCheck').onclick=()=>run(async()=>{await api?.refresh?.();await inspect();});
  $('setupSave').onclick=()=>run(async()=>{await api.saveConnectionPaths({executable:$('setupExecutable').value,codexHome:$('setupHome').value});await inspect();});
  for(const [id,kind,field] of [['pickExecutable','executable','setupExecutable'],['pickHome','codexHome','setupHome']])$(id).onclick=()=>run(async()=>{const value=await api.pickConnectionPath(kind);if(value)$(field).value=value;});
  $('setupVerified').onchange=controls;
  $('setupDone').onclick=()=>run(()=>api.finishSetup('verified',$('setupVerified').checked));
  $('setupSkip').onclick=()=>run(()=>api.finishSetup('skipped',false));
  $('setupTasks').onclick=()=>run(()=>api.setup(false));
  $('setupCopy').onclick=async()=>{await run(()=>api.copyConnectionDiagnostic());if(!$('setupMessage').textContent)message('已复制；不包含路径、任务内容、标识符或凭据。');};
  // Standalone visual preview has no native backend and never fakes a connection.
  if(new URLSearchParams(location.search).has('setup-preview'))show(true);
})();
