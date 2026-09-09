(function () {
  const $ = id => document.getElementById(id);
  window.metaBot?.onPanelPhase?.(detail=>window.MetaBotPanelMotion?.play(detail));
  const labels = { running: "正在运行", queued: "排队中", paused: "已暂停", needs_attention: "需要处理", completed: "已完成", failed: "执行失败", stopped: "已停止", idle: "空闲", unknown: "状态确认中", offline: "未连接" };
  let view = { tasks: [], sources: {}, sourceHealth: {}, activeCount: 0, unreadCount: 0 };
  let selected = null, refreshing = false;
  const rows = new Map();
  window.metaBot?.getNotificationSettings?.().then(settings => { if (settings) { $('retainCompletions').checked = settings.retainCompletions; $('autoCloseCompletions').checked = settings.autoCloseCompletions === true; if(settings.completionEscalation) $('completionEscalation').value=settings.completionEscalation; const a = settings.appearance || {}; if (a.skin) $('skinSelect').value = a.skin; if (a.shape) $('shapeSelect').value = a.shape; if (a.motion) $('motionSelect').value = a.motion; if (a.particles != null) $('particlesToggle').checked = a.particles; if (a.random != null) $('randomToggle').checked = a.random; for(const id of ['maskStyle','maskFrequency'])if(a[id])$(id).value=a[id];$('maskAuto').checked=a.maskAuto!==false;$('emojiMask').checked=a.masks!==false&&a.emoji!==false; } }).catch(error => feedback(error.message, true));
  const appearanceControls = ['skinSelect','shapeSelect','emojiMask','motionSelect','particlesToggle','randomToggle','maskAuto','maskStyle','maskFrequency'];
  const saveAppearance = async () => {
    const value = { skin: $('skinSelect').value, shape: $('shapeSelect').value, emoji: $('emojiMask').checked, motion: $('motionSelect').value, particles: $('particlesToggle').checked, random: $('randomToggle').checked };
    Object.assign(value,{masks:$('emojiMask').checked,maskAuto:$('maskAuto').checked,maskStyle:$('maskStyle').value,maskFrequency:$('maskFrequency').value});
    try { if (!window.metaBot?.setAppearance) throw new Error('当前预览不支持保存外观'); const result = await window.metaBot.setAppearance(value); if (!result?.ok) throw new Error(result?.error || '保存失败'); feedback('外观与动作设置已保存'); } catch (error) { feedback(error.message, true); }
  };
  for (const id of appearanceControls) $(id).onchange = saveAppearance;
  $('retainCompletions').onchange = async event => {
    const toggle = event.target; const previous = !toggle.checked; toggle.disabled = true;
    try { const result = await window.metaBot?.setRetainCompletions?.(toggle.checked); if (!result?.ok) throw new Error(result?.error || '保存失败'); }
    catch (error) { toggle.checked = previous; feedback(error.message, true); }
    finally { toggle.disabled = false; }
  };
  window.metaBot?.getNotificationSettings?.().then(s=>{if(s){$('completionCloseMinutes').value=String(s.completionCloseMinutes||15);$('boardAnimation').checked=s.boardAnimation!==false;}}).catch(e=>feedback(e.message,true));
  for(const id of ['autoCloseCompletions','completionEscalation','completionCloseMinutes','boardAnimation']) $(id).onchange=async()=>{try{const result=await window.metaBot?.setCompletionPreferences?.({autoCloseCompletions:$('autoCloseCompletions').checked,completionEscalation:$('completionEscalation').value,completionCloseMinutes:Number($('completionCloseMinutes').value),boardAnimation:$('boardAnimation').checked});if(!result?.ok)throw Error(result?.error||'保存失败');}catch(error){feedback(error.message,true);}};
  const icons = () => window.lucide?.createIcons({ attrs: { "stroke-width": 1.8 } });
  function explainCompletionConflict(){ $('completionConflict').textContent=$('autoCloseCompletions').checked&&Number($('completionCloseMinutes').value)<2&&$('completionEscalation').value!=='off'?'当前 1 分钟即隐藏，早于首次催促（2 分钟）；如需催促，请关闭自动关闭或选择至少 5 分钟。':''; }
  for(const id of ['autoCloseCompletions','completionCloseMinutes','completionEscalation'])$(id).addEventListener('change',explainCompletionConflict);
  setTimeout(explainCompletionConflict,1000);
  const statusText = task => task.stale ? '连接中断 · 状态可能已过期' : task.status === 'running' && task.quiet ? '执行中 · 暂无新输出' : task.status === 'unknown' && task.quiet ? '上次执行中 · 当前状态未核实' : task.waitReason === "approval" ? "等待批准" : task.waitReason === "input" ? "等待你的回答" : labels[task.status] || "状态确认中";
  const color = status => status === "needs_attention" ? "needs-attention" : status;
  const visibleTasks = () => view.tasks.filter(e => e.active ?? (['running','queued','paused','needs_attention'].includes(e.task.status) || (e.task.status === 'unknown' && e.task.trackedActive === true)));
  function reconcileSelection() {
    const visible = visibleTasks();
    if (!visible.some(e => e.key === selected)) selected = visible.find(e => e.key === view.primaryKey)?.key || visible[0]?.key || null;
  }
  function feedback(message, error = false) {
    $('feedback').textContent = error ? message : ''; $('feedback').classList.toggle('error', error);
  }
  function age(at) {
    const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(at)) / 1000));
    return !Number.isFinite(seconds) ? "尚未同步" : seconds < 60 ? `${seconds} 秒前` : seconds < 3600 ? `${Math.floor(seconds / 60)} 分钟前` : `${Math.floor(seconds / 3600)} 小时前`;
  }
  function freshness() {
    const codex = view.sourceHealth?.codex;
    const uncertain = view.tasks.some(e => e.task.source === 'codex' && e.task.status === 'unknown');
    const quiet = view.tasks.some(e => e.task.source === 'codex' && e.task.quiet && e.active);
    const connection = codex?.state === 'connected' ? (codex.coverage?.pending || uncertain || codex.coverage?.unknown ? '正在核实任务状态' : 'Codex 已连接') : 'Codex 未连接';
    $('headerDot').className = `mini-dot ${codex?.state === 'connected' ? (codex.coverage?.pending || uncertain || codex.coverage?.unknown ? 'unknown' : 'running') : 'offline'}`;
    $('headerDot').title = connection;
    $('headerDot').setAttribute('aria-label', connection);
    for (const [name, h] of Object.entries(view.sourceHealth || {})) {
      const output = $('health-' + name);
      if (output) output.textContent = `${h.state === 'connected' ? '已连接' : h.state === 'disabled' ? '已停用' : '未连接'} · ${age(h.lastSuccessAt)}${h.durationMs != null ? ' · ' + h.durationMs + 'ms' : ''}${h.lastError ? '\n' + h.lastError : ''}${h.executable ? '\n' + h.executable : ''}${h.codexHome ? '\n' + h.codexHome : ''}${name === 'codex' ? '\n' + (h.watching ? '日志监听已启用' : '轮询模式') + (h.queryMode === 'database' ? ' · 数据库查询' : '') + (h.hasMore ? ' · 当前为最近任务范围' : '') : ''}${h.watchError ? '\n监听不可用：' + h.watchError : ''}`;
      const toggle = $('enabled-' + name); if (toggle) toggle.checked = h.state !== 'disabled';
    }
  }
  function renderDetail() {
    const entry = visibleTasks().find(e => e.key === selected);
    $('detail').hidden = true;
    if (!entry) return;
    selected = entry.key;
    $('taskTitle').textContent = entry.task.title;
    $('taskTitle').title = entry.task.title;
    $('taskStatus').textContent = `${statusText(entry.task)}${entry.task.stale ? ' · 缓存' : ''}${entry.snoozedUntil ? ' · 稍后提醒' : ''}`;
    $('taskMeta').textContent = `${entry.task.source === 'codex' ? 'Codex' : '工作台'} · ${entry.task.projectName}`;
    $('taskMeta').title = entry.task.detail || '';
    $('ackButton').hidden = !entry.unread;
    $('snoozeButton').hidden = !entry.unread;
  }
  function renderList() {
    $('activeCount').textContent = String(view.activeCount || 0);
    const filtered = visibleTasks();
    const visible = new Set(filtered.map(e => e.key));
    for (const [key, row] of rows) if (!visible.has(key)) { row.remove(); rows.delete(key); }
    filtered.forEach((entry, index) => {
      let row = rows.get(entry.key);
      if (!row) {
        row = document.createElement('div'); row.className = 'task-row';
        row.innerHTML = '<span class="mini-dot"></span><span class="row-copy"><strong></strong><small hidden></small></span><span class="unread-mark"></span><span class="row-actions"></span>';
        for (const [action, icon, label] of [['copy', 'copy', '复制任务链接'], ['open', 'external-link', '查看任务'], ['snooze', 'alarm-clock', '5 分钟后提醒'], ['ack', 'check', '确认提醒']]) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'icon-button'; button.dataset.action = action;
          button.setAttribute('aria-label', label); button.title = label; button.innerHTML = `<i data-lucide="${icon}"></i>`;
          button.onclick = async () => {
            button.disabled = true; feedback('');
            try {
              const result = action === 'open' ? await window.metaBot?.openTarget(entry.key) : await window.metaBot?.taskAction(entry.key, action);
              if (!(action === 'open' ? result?.ok : result)) feedback(result?.error || '操作失败，请重试', true);
            } catch (error) { feedback(error.message, true); }
            finally { button.disabled = false; }
          };
          row.querySelector('.row-actions').append(button);
        }
        rows.set(entry.key, row);
      }
      row.classList.toggle('selected', entry.key === selected);
      for (const action of ['ack', 'snooze']) row.querySelector(`[data-action="${action}"]`).hidden = !entry.unread;
      row.querySelector('.mini-dot').className = `mini-dot ${color(entry.task.status)}`;
      row.querySelector('strong').textContent = entry.task.title;
      row.querySelector('small').textContent = `${statusText(entry.task)} · ${entry.task.projectName}${entry.task.stale ? ' · 缓存' : ''}`;
      row.querySelector('.unread-mark').hidden = !entry.unread;
      row.querySelector('.row-copy').title = `${entry.task.title} · ${statusText(entry.task)} · ${entry.task.projectName || ''}`;
      const child = $('taskList').children[index];
      if (child !== row) $('taskList').insertBefore(row, child || null);
    });
    $('empty').hidden = filtered.length > 0;
    $('empty').textContent = view.sourceHealth?.codex?.coverage?.pending ? '正在读取任务记录…' : view.sourceHealth?.codex?.coverage?.unknown ? '尚未检测到进行中任务，部分状态待核实' : '暂无进行中的任务';
    icons();
  }
  function render(next) {
    const previousPrimary = view.primaryKey;
    view = next;
    const urgent = view.tasks.find(e => e.key === view.primaryKey && e.unread && e.fresh && !e.snoozedUntil);
    if (urgent && view.primaryKey !== previousPrimary && visibleTasks().some(e => e.key === urgent.key)) selected = view.primaryKey;
    reconcileSelection();
    $('headerDot').className = `mini-dot ${color(view.indicator?.status || 'offline')}`;
    renderDetail(); renderList(); freshness();
  }
  $('openButton').onclick = async () => {
    $('openButton').disabled = true; feedback('正在打开任务…');
    try { const result = await window.metaBot?.openTarget(selected); feedback(result?.ok ? '已交给系统打开 Codex / 工作台' : result?.error || '打开失败，请重试或复制链接', !result?.ok); }
    catch (error) { feedback('打开失败：' + error.message, true); }
    finally { $('openButton').disabled = false; }
  };
  for (const [id, action] of [['ackButton','ack'],['snoozeButton','snooze'],['copyButton','copy']]) $(id).onclick = async () => {
    try { const ok = await window.metaBot?.taskAction(selected, action); feedback(ok ? action === 'copy' ? '任务链接已复制' : action === 'snooze' ? '5 分钟后再次提醒' : '已确认提醒' : '操作未完成，请重试', !ok); }
    catch (error) { feedback(error.message, true); }
  };
  $('diagnosticsButton').onclick = async () => {
    const button=$('diagnosticsButton'),open=$('diagnostics').hidden;
    button.disabled=true;
    try {
      const result=await window.metaBot?.setSettingsVisible?.(open);
      if(result?.ok===false)throw Error(result.error||'无法切换设置视图');
      $('diagnostics').hidden=!open;
      $('panel').classList.toggle('settings-open',open);
      button.setAttribute('aria-expanded',String(open));
    } catch(error){feedback(error.message,true);}
    finally{button.disabled=false;}
  };
  document.querySelectorAll('[data-settings-tab]').forEach(tab => tab.onclick = () => { document.querySelectorAll('.settings-tab').forEach(t => t.classList.toggle('active', t === tab)); document.querySelectorAll('[data-settings-section]').forEach(section => { section.hidden = section.dataset.settingsSection !== tab.dataset.settingsTab; }); });
  for (const name of ['codex']) $('enabled-' + name).onchange = async event => {
    try { const result = await window.metaBot?.setSourceEnabled(name, event.target.checked); if (!result?.ok) { feedback(result?.error || '无法保存来源设置', true); freshness(); } }
    catch (error) { feedback(error.message, true); freshness(); }
  };
  $('refreshButton').onclick = async () => {
    if (refreshing) return;
    refreshing = true; $('refreshButton').disabled = true; $('refreshButton').classList.add('spinning');
    try { await window.metaBot?.refresh(); feedback('同步检查已完成'); }
    catch (error) { feedback('同步失败：' + error.message, true); }
    finally { refreshing = false; $('refreshButton').disabled = false; $('refreshButton').classList.remove('spinning'); }
  };
  window.metaBot?.onStatus(render);
  window.metaBot?.onPlacement(p => { document.documentElement.dataset.side = p.side || 'right'; $('panel').style.setProperty('--tail-offset', `${Number(p.tailOffset) || 80}px`); });
  window.metaBot?.onDiagnostic(() => freshness());
  window.metaBot?.onRefreshState(() => freshness());
  $('closeButton').onclick = () => window.metaBot?.hideBubble();
  $('quitButton').onclick = () => window.metaBot?.quit();
  document.addEventListener('keydown', e => { if (e.key === 'Escape') window.metaBot?.hideBubble(); });
  setInterval(freshness, 1000);
  icons(); render(view);
})();
for(const shape of window.MetaBotAppearance?.SHAPES||[]){
  const select=document.getElementById('shapeSelect');
  const labels={pentagon:'五边形',drop:'水滴',capsule:'胶囊',diamond:'菱形',flower:'花形',blob:'软团',pancake:'扁饼',bean:'豆形',bell:'铃形',kite:'风筝形',cushion:'软垫',spring:'弹簧形'};
  if(select&&![...select.options].some(o=>o.value===shape))select.add(new Option(labels[shape]||shape,shape));
}
