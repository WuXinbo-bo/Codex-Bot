import { TaskCenter } from "../shared/task-center.cjs";
import {
  CompletionInbox,
  retainCompletions,
} from "../shared/completion-inbox.cjs";
import { buildSnapshot } from "../shared/status.cjs";
import { taskTarget } from "../shared/task-target.cjs";
import { InteractionManager } from "../shared/interaction-manager.cjs";
import { createBallDragController } from "../shared/ball-drag.cjs";
import { bubblePosition } from "../shared/bubble-position.cjs";
import { NativeCodex } from "./codex.js";
import { createSourcePoller } from "./source-poller.js";
import Appearance from "../src/appearance.js";
import CompletionPolicy from "../shared/completion-policy.cjs";
import { panelLayout, overlap } from "../shared/panel-layout.cjs";
import { NoticeLane } from '../shared/notice-lane.cjs';
import { createUpdateManager } from "../shared/update-manager.cjs";

export async function startCoordinator({ invoke, listen, receive, workbenchAdapter = null }) {
  const boot = await invoke("bootstrap");
  let config = boot.stored["config.json"] || {};
  if(config.appearance?.schemaVersion!==2||(config.appearance.artStyle!=='auto'&&!Object.hasOwn(Appearance.ART_STYLES,config.appearance.artStyle))||config.appearance.eyeStyle!==Appearance.normalizeEye(config.appearance.eyeStyle)){
    config={...config,appearance:Appearance.migrate(config.appearance)};
    await invoke('store',{name:'config.json',value:config});
  }
  // Old timed-hide preferences are migrated once; unconfirmed records never expire.
  if(config.notifications?.autoCloseCompletions||Object.hasOwn(config.notifications||{},'completionCloseMinutes')){
    config={...config,notifications:{...config.notifications,...CompletionPolicy.normalize(config.notifications)}};
    delete config.notifications.completionCloseMinutes;
    await invoke('store',{name:'config.json',value:config});
  }
  let setupVisible = !config.onboarding?.status && !boot.testMode;
  let settingsVisible = false;
  const panelSize = () => rect(setupVisible ? 360 : 280, setupVisible ? 430 : settingsVisible ? 380 : 154);
  const center = new TaskCenter();
  center.saved = boot.stored["task-notices.json"] || {};
  const inbox = new CompletionInbox();
  const nudged=new Map(),pendingNudges=new Map();let boardOffset={x:0,y:0},boardDrag=null,policyFlight=false;
  for (const item of boot.stored["completion-inbox.json"] || [])
    if (item?.id && item.task?.id) inbox.items.set(item.id, {...item,receivedAt:Number(item.receivedAt)||Date.now()});
  let geometry = await invoke("geometry"),
    panelVisible = false,
    completionVisible = false,
    toastVisible = false,
    toastTimer;
  let panelBounds = null,
    stopping = false,
    changeTimer;
  const failures = {};
  const sources = {},
    health = {},
    tasks = { codex: [], workbench: [] },
    lifecycle = new Map();
  let storage = Promise.resolve();
  const persist = (name, value) => {
    const copy = JSON.parse(JSON.stringify(value));
    const result = storage.then(() => invoke("store", { name, value: copy }));
    storage = result.catch((e) => diagnostic(e));
    return result;
  };
  const publish = (target, topic, data) =>
    target === "ball"
      ? (receive({ topic, data }), Promise.resolve())
      : invoke("publish", { target, topic, data });
  const interact = (type, detail = {}) =>
    publish("ball", "interaction:update", { type, ...detail });
  const diagnostic = (e) => {
    console.error(e);
    publish("panel", "status:diagnostic", { message: String(e) }).catch(
      console.error,
    );
  };
  let updateSnapshot=null, updateToast=false, updateNoticeFlight=false;
  const noticeLane=new NoticeLane();let toastKey=null,noticeFlight=Promise.resolve(),noticeHovered=false;
  function armNoticeTimer(){
    clearTimeout(toastTimer);
    const notice=noticeLane.peek(),shown=toastVisible&&visibleWindows.get('toast')&&!layoutSuppressed.has('toast')&&!noticeHovered;
    noticeLane.presented(shown);const remaining=noticeLane.remaining();
    if(shown&&remaining!==null)toastTimer=setTimeout(()=>{noticeLane.expire(notice.id);syncNotices().catch(diagnostic);},remaining);
  }
  function syncNotices(){const result=noticeFlight.then(async()=>{
    const notice=noticeLane.peek();toastVisible=!!notice;updateToast=!!notice?.update;
    clearTimeout(toastTimer);
    const key=JSON.stringify(notice);
    if(key!==toastKey){toastKey=key;await win('toast','passthrough',{value:!notice?.persistent&&!notice?.update});await publish('toast','interaction:update',notice||{});}
    await placeChildren();
    armNoticeTimer();
  });noticeFlight=result.catch(diagnostic);return result;}
  const updateNotices=new Map();
  const updates=createUpdateManager({
    invoke,
    initial:config.updates,
    publish:value=>{updateSnapshot=value;publish('panel','update:state',value).catch(diagnostic);},
    persist:async value=>{const next={...config,updates:value};await persist('config.json',next);config=next;},
    beforeInstall:async()=>{if(boardDrag||drag.isActive())throw Error('请先结束拖拽');await storage;}
  });
  async function maybeUpdateNotice(){
    const value=updateSnapshot,key=value?.version+':'+value?.phase;
    if(updateNoticeFlight||!value?.notify||!['available','ready'].includes(value.phase)||toastVisible||completionVisible||panelVisible||boardDrag||Date.now()-(updateNotices.get(key)||0)<86400000)return;
    updateNoticeFlight=true;
    try{
      updateNotices.set(key,Date.now());
      noticeLane.push({id:'update:'+key,label:value.phase==='ready'?'更新已下载':'发现新版本',title:'Codex Bot '+value.version,update:true,duration:10000});
      await syncNotices();
    }finally{updateNoticeFlight=false;}
  }
  const win = (label, action, args = {}) =>
    invoke("window", { label, action, ...args });
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, Math.max(lo, hi)));
  const rect = (w, h) => ({
    width: Math.round(w * geometry.scale),
    height: Math.round(h * geometry.scale),
  });
  const constrain = (point, size = geometry) => ({
    x: clamp(
      Math.round(point.x),
      geometry.area.x,
      geometry.area.x + geometry.area.width - size.width,
    ),
    y: clamp(
      Math.round(point.y),
      geometry.area.y,
      geometry.area.y + geometry.area.height - size.height,
    ),
  });
  const drag = createBallDragController({ threshold: 6 * geometry.scale });
  const interaction = new InteractionManager({
    dragController: drag,
    ballRadius: 64 * geometry.scale,
    proximityRadius: 180 * geometry.scale,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  });
  interaction.setBallBounds(geometry);
  const bounds = async (label, position, size) =>
    win(label, "bounds", { ...position, ...size });
  const visibleWindows=new Map([['panel',false],['completions',false],['toast',false]]),layoutSuppressed=new Set();
  const panelTargets=new Map();
  let nextBoardLook=Date.now()+45000;
  let layoutQueue=Promise.resolve();
  let layoutRevision=0;const phaseVersions=new Map();
  const requested=label=>label==='completions'?retainCompletions(config)&&inbox.items.size>0:label==='panel'?panelVisible:toastVisible;
  const phase=async(label,data)=>{const version=(phaseVersions.get(label)||0)+1;phaseVersions.set(label,version);await publish(label,'panel:phase',{...data,version});await publish('ball','panel:phase',{...data,version});};
  async function transitionWindow(label,show,focus=false){
    const revision=layoutRevision;
    if(visibleWindows.get(label)===show){if(show)await publish(label,'panel:ensure-visible',true);return;}
    const target=panelTargets.get(label);
    const side=target&&target.x+target.width/2<geometry.x+geometry.width/2?'left':'right';
    const duration=config.appearance?.motion==='reduced'||config.notifications?.boardAnimation===false||!target?0:(show?220:160);
    if(show&&duration){
      await phase(label,{phase:'preparing',duration:0,label,side});
      await publish('ball','panel:phase',{phase:'preparing',duration:100,label,side});
      await new Promise(r=>setTimeout(r,100));
      if(revision!==layoutRevision)return;
    }
    const motion={phase:show?'entering':'leaving',duration,label,side};
    if(show){await win(label,'show',{focus});visibleWindows.set(label,true);}
    await phase(label,motion);
    // Animate the surface on the compositor, not through per-frame native IPC.
    if(duration)await new Promise(r=>setTimeout(r,duration));
    if(revision!==layoutRevision){if(requested(label))await phase(label,{phase:'visible',duration:0,label,side});return;}
    if(!show)await win(label,'hide');
    visibleWindows.set(label,show);
    await phase(label,{phase:show?'visible':'hidden',duration:0,label,side});
  }
  async function placeChildren() {
    layoutRevision++;
    const result=layoutQueue.then(layoutChildren);
    layoutQueue=result.catch(diagnostic);return result;
  }
  async function layoutChildren() {
    completionVisible=requested('completions');
    const specs=[];
    if(panelVisible) specs.push({type:'panel',width:panelSize().width,height:panelSize().height,minHeight:rect(0,100).height});
    if(completionVisible) specs.push({type:'completions',width:rect(280, visibleCompletions().length > 1 ? 76 : 50).width,height:rect(280, visibleCompletions().length > 1 ? 76 : 50).height});
    if(toastVisible) specs.push({type:'toast',width:rect(280,82).width,height:rect(280,82).height,persistent:!!noticeLane.peek()?.persistent});
    const laid=panelLayout(geometry,geometry.area,specs,8*geometry.scale);
    const byType=type=>laid.find(p=>p.type===type);
    for(const p of laid)panelTargets.set(p.type,p);
    layoutSuppressed.clear();
    for(const p of laid)if(p.deferred)layoutSuppressed.add(p.type);
    if (panelVisible&&!layoutSuppressed.has('panel')) {
      const next=byType('panel');
      panelBounds = bubblePosition(
        geometry,
        panelSize(),
        geometry.area,
        8 * geometry.scale,
      );
      const side=next.x>=geometry.x+geometry.width?'right':next.x+next.width<=geometry.x?'left':next.y>=geometry.y+geometry.height?'bottom':'top';
      const offset=side==='left'||side==='right'?geometry.y+geometry.height/2-next.y:geometry.x+geometry.width/2-next.x;
      panelBounds={...next,side,tailOffset:clamp(offset,20*geometry.scale,(side==='left'||side==='right'?next.height:next.width)-20*geometry.scale)};
      await bounds("panel", panelBounds, {width:next.width,height:next.height});
      interaction.setBubbleBounds(panelBounds);
      await publish("panel", "bubble:placement", {
        ...panelBounds,
        tailOffset: panelBounds.tailOffset / geometry.scale,
      });
    }
    if (completionVisible) {
      const next=byType('completions');
      const size = {width:next.width,height:next.height};
      let pos=constrain({ x:next.x+boardOffset.x, y:next.y+boardOffset.y },size);
      if(next.docked||!boardDrag&&(overlap({...pos,...size},geometry)||laid.some(p=>p.type!=='completions'&&!p.deferred&&overlap({...pos,...size},p)))){boardOffset={x:0,y:0};pos=next;}
      panelTargets.set('completions',{...pos,...size});await bounds("completions",pos,size);
    }
    if (toastVisible&&!layoutSuppressed.has('toast')) {
      const next=byType('toast');
      const size = {width:next.width,height:next.height};
      await bounds('toast',constrain({x:next.x,y:next.y},size),size);
    }
    for(const [label,wanted] of [['completions',completionVisible],['panel',panelVisible],['toast',toastVisible]])await transitionWindow(label,wanted&&!layoutSuppressed.has(label));
    await publish('completions','completion:visible',completionVisible);
    armNoticeTimer();
    await publish('panel','panel:overflow',{count:layoutSuppressed.has('completions')?visibleCompletions().length:0});
  }
  async function showPanel(show, focus = false) {
    panelVisible = show;
    interaction.setBubbleVisible(show);
    await placeChildren();
    if(show&&focus&&!layoutSuppressed.has('panel'))await win('panel','show',{focus:true});
    await publish("ball", "bubble:visibility", show);
    interact(show ? "bubble-open" : "bubble-close");
  }
  async function renderCompletions() {
    completionVisible = retainCompletions(config) && visibleCompletions().length > 0;
    await publish('completions','completion:preferences',CompletionPolicy.normalize(config.notifications));
    if(!completionVisible && visibleWindows.get('completions'))await placeChildren();
    await publish(
      "completions",
      "completions:update",
      visibleCompletions().map(({ id, title }) => ({ id, title })),
    );
    await placeChildren();
    await publish('completions','completion:visible',completionVisible&&!layoutSuppressed.has('completions'));
  }
  function visibleCompletions(){return [...inbox.items.values()];}
  async function checkCompletionPolicy(){
    if(stopping||policyFlight)return;policyFlight=true;
    try{
      const items=visibleCompletions();
      if(visibleWindows.get('completions')&&!boardDrag&&Date.now()>nextBoardLook){
        nextBoardLook=Date.now()+45000;
        const p=panelTargets.get('completions');
        await publish('ball','panel:phase',{phase:'attending',duration:650,label:'completions',side:p&&p.x+ p.width/2<geometry.x+geometry.width/2?'left':'right'});
      }
      if(completionVisible!==requested('completions'))await renderCompletions();
      if(!completionVisible||boardDrag)return;
      const candidate=items.map(item=>({item,...CompletionPolicy.evaluate(item,config.notifications)})).sort((a,b)=>b.stage-a.stage)[0];
      if(!candidate?.stage)return;
      const last=nudged.get(candidate.item.id)||{stage:0,at:0};
      if(candidate.stage<=last.stage||Date.now()-last.at<60000)return;
      const pending=pendingNudges.get(candidate.item.id);
      if(pending&&Date.now()-pending.at<10000)return;
      const notice={id:candidate.item.id,stage:candidate.stage,at:Date.now()};
      pendingNudges.set(notice.id,notice);
      await publish('completions','completion:nudge',notice);
    }finally{policyFlight=false;}
  }
  async function sync() {
    const view = center.view();
    await publish("panel", "status:update", view);
    await publish("ball", "indicator:update", view.indicator);
    await publish("ball", "motion:preference", config.appearance?.motion || config.motion?.level || "full");
    await publish("ball", "appearance:preference", Appearance.normalize(config.appearance));
    await renderCompletions();
  }
  center.on("update", (view) => {
    noticeLane.reconcile(view);syncNotices().catch(diagnostic);
    publish("panel", "status:update", view).catch(diagnostic);
    publish("ball", "indicator:update", view.indicator);
    persist("task-notices.json", center.saved).catch(() => {});
  });
  center.on("lifecycle", (events) => {
    for (const e of events)
      lifecycle.set(e.id, {
        ...e,
        targetTask: center.entries.get(e.taskId)?.task,
      });
    interact("task-lifecycle", { events });
    // Notifications do not depend on whether an optional avatar performance runs.
    actions=actions.then(()=>action('ball','lifecycle',[events.map(e=>e.id)])).catch(diagnostic);
  });
  const sourceChanged = () => {
    clearTimeout(changeTimer);
    changeTimer = setTimeout(
      () => poller.refresh("codex").catch(diagnostic),
      150,
    );
  };
  let codex = new NativeCodex(invoke, config.codex || {}, sourceChanged);
  await listen("native:logs", (paths) => {
    for (const p of paths) codex.paths.add(p);
    codex.changed();
  });
  await listen("native:codex", (message) => codex.notification(message));
  const disabled = (name) =>
    config[name]?.enabled === false ||
    (name === "workbench" && (!workbenchAdapter || config[name]?.enabled !== true));
  const poller = createSourcePoller({
    names: ["codex", "workbench"],
    run: refreshSource,
    onError: diagnostic,
    delay: (name) =>
      disabled(name)
        ? null
        : Math.min(
            Number(config.maxOfflineIntervalMs) || 30000,
            failures[name]
              ? (Number(config.intervalMs) || 1500) *
                  2 ** Math.min(5, failures[name] - 1)
              : center.view().activeCount
                ? Number(config.intervalMs) || 1500
                : Number(config.idleIntervalMs) || 2000,
          ),
  });
  async function refreshSource(name) {
    if (stopping) return;
    if (disabled(name)) {
      sources[name] = "disabled";
      health[name] = { state: "disabled" };
      tasks[name] = [];
    } else {
      const started = performance.now();
      try {
        if (name === "codex") tasks[name] = await codex.snapshot();
        else {
          const result = await workbenchAdapter.snapshot();
          config.workbench = {
            ...config.workbench,
            baseUrl: result.baseUrl,
          };
          const spaces = new Map(
            (result.bootstrap.workspaces || []).map((w) => [w.id, w]),
          );
          tasks[name] = result.sessions.map((s) => ({
            id: s.id,
            source: name,
            projectId: s.workspaceId || "workbench:standalone",
            projectName: spaces.get(s.workspaceId)?.name || "Workspace",
            title: s.title,
            status: s.status,
            updatedAt: s.updatedAt,
            detail: s.engine,
          }));
        }
        sources[name] = "connected";
        failures[name] = 0;
        health[name] = {
          state: "connected",
          lastSuccessAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - started),
          ...(name === "codex"
            ? {
                executable: boot.executable,
                codexHome: boot.codexHome,
                watching: codex.watching,
                watchError: codex.watchError,
                queryMode: codex.database ? "database" : "compatibility",
                hasMore: Boolean(codex.nextCursor),
                coverage: codex.coverage,
                runtime: 'Tauri 0.2.0',
              }
            : {}),
        };
      } catch (e) {
        failures[name] = (failures[name] || 0) + 1;
        sources[name] = "offline";
        health[name] = {
          ...health[name],
          state: "offline",
          lastError: String(e),
        };
        tasks[name] = tasks[name].map((t) => ({ ...t, stale: true }));
      }
    }
    if (stopping) return;
    if (disabled(name)) {
      sources[name] = "disabled";
      health[name] = { state: "disabled" };
      tasks[name] = [];
    }
    const snapshot = buildSnapshot([...tasks.codex, ...tasks.workbench], {
      sources: { ...sources },
      sourceHealth: { ...health },
    });
    center.update(snapshot);
    await persist("cache/snapshot.json", snapshot);
  }
  async function refresh() {
    if (stopping) return;
    await publish("panel", "status:refresh", { refreshing: true });
    interact("refresh-start");
    try {
      await poller.refreshAll();
    } finally {
      interact("refresh-end");
      await publish("panel", "status:refresh", { refreshing: false });
    }
  }
  let moving = false,
    pendingMove = null,
    movement = Promise.resolve();
  function move(position, final = false) {
    pendingMove = { position, final };
    if (moving) return movement;
    moving = true;
    movement = (async () => {
      while (pendingMove) {
        const next = pendingMove;
        pendingMove = null;
        const safe = next.final ? constrain(next.position) : next.position;
        geometry = await bounds("ball", safe, rect(128, 128));
        interaction.setBallBounds(geometry);
        interaction.ballRadius = 64 * geometry.scale;
        interaction.proximityRadius = 180 * geometry.scale;
        await placeChildren();
        if (next.final)
          await persist("window-state.json", {
            x: geometry.x / geometry.scale,
            y: geometry.y / geometry.scale,
            nativePhysical: { x: geometry.x, y: geometry.y },
          });
      }
    })().finally(() => (moving = false));
    return movement;
  }
  let lastInteractive = null;
  async function handle(result) {
    if (!result?.handled) return;
    if (lastInteractive !== Boolean(result.ballInteractive)) {
      lastInteractive = Boolean(result.ballInteractive);
      await win("ball", "passthrough", { value: !lastInteractive });
    }
    const detail = result.interaction || {};
    if (detail.velocity)
      detail.velocity = {
        ...detail.velocity,
        x: detail.velocity.x / geometry.scale,
        y: detail.velocity.y / geometry.scale,
        speed: detail.velocity.speed / geometry.scale,
      };
    if (["drag-start", "drag-move"].includes(result.action)) {
      if (result.position) move(result.position).catch(diagnostic);
      interact(result.action, detail);
      if (detail.orbitDetected) interact("drag-orbit", detail);
    } else if (result.action === "drag-end") {
      const safe = constrain(result.position);
      const horizontal =
        safe.x > Math.round(result.position.x)
          ? "left"
          : safe.x < Math.round(result.position.x)
            ? "right"
            : "";
      const vertical =
        safe.y > Math.round(result.position.y)
          ? "top"
          : safe.y < Math.round(result.position.y)
            ? "bottom"
            : "";
      await move(result.position, true);
      interact("drag-end", {
        ...detail,
        edgeHit: Boolean(horizontal || vertical),
        edgeDirection: [vertical, horizontal].filter(Boolean).join("-") || null,
        releaseSpeed: detail.velocity?.speed || 0,
      });
    } else if (result.action === "ball-click") {
      interact("ball-click", detail);
      await showPanel(!panelVisible, true);
    } else if (result.action === "hide-bubble") await showPanel(false);
    else if (result.action) interact(result.action, detail);
  }
  interaction.on("action", (r) => handle(r).catch(diagnostic));
  await listen("native:mouse", (e) => {
    const result =
      e.kind === "down"
        ? interaction.handleMouseDown(e)
        : e.kind === "up"
          ? interaction.handleMouseUp(e)
          : interaction.handleMouseMove(e);
    handle(result).catch(diagnostic);
  });
  await listen("native:geometry", () => {
    if (!moving)
      invoke("geometry")
        .then((g) => {
          geometry = g;
          interaction.setBallBounds(g);
          return placeChildren();
        })
        .catch(diagnostic);
  });
  await listen("native:input-error", (e) => {
    diagnostic(e);
    publish("ball", "input:fallback", true);
  });
  const allowed = {
    ball: new Set(["ready", "toggle", "show", "hide", "lifecycle"]),
    panel: new Set([
      "ready",
      "settings",
      "panel-view",
      "setup", "environment", "pick-path", "connection-paths", "setup-finish", "diagnostic-copy",
      "retention",
      "completion-preferences",
      "show",
      "hide",
      "refresh",
      "open",
      "task",
      "source",
      "appearance",
      "more",
      "quit",
    ]),
    completions: new Set(["ready", "completion", "board-drag", "nudge-played"]),
    toast: new Set(["ready",'notice-open','notice-ack','notice-next','notice-hover']),
  };
  let actions = Promise.resolve();
  for(const type of ['update-state','update-check','update-download','update-install','update-preferences','update-dismiss','update-open'])allowed.panel.add(type);
  allowed.toast.add('update-open');allowed.toast.add('update-dismiss');
  async function action(from, type, args) {
    if (!allowed[from]?.has(type))
      throw new Error("Unauthorized window action");
    const [a, b] = args || [];
    if(type==='notice-hover'){noticeHovered=a===true;armNoticeTimer();return {ok:true};}
    if(type==='notice-next'){noticeLane.next();await syncNotices();return {ok:true};}
    if(type==='notice-open'||type==='notice-ack'){
      const notice=noticeLane.peek();if(!notice?.persistent||notice.id!==a)return {ok:false,error:'提醒已变化'};
      if(type==='notice-open')await invoke('open',{url:taskTarget(notice.task,config)});
      else {const entry=center.entries.get(notice.key);if(!entry||entry.eventId!==a)return {ok:false};const saved={...center.saved,[notice.key]:{eventId:entry.eventId,acknowledged:true,unread:false,snoozedUntil:0}};await persist('task-notices.json',saved);center.action(notice.key,'ack');}
      await syncNotices();return {ok:true};
    }
    if(type==='update-state')return updates.snapshot();
    if(type==='update-check'){updates.check(true).catch(diagnostic);return {ok:true};}
    if(type==='update-download'){updates.download().catch(diagnostic);return {ok:true};}
    if(type==='update-install'){
      if(a!==true)throw Error('需要确认安装');
      updates.install().catch(diagnostic);return {ok:true};
    }
    if(type==='update-preferences')return updates.preferences(a);
    if(type==='update-dismiss'){
      await updates.dismiss(a===true);
      noticeLane.removeUpdates();await syncNotices();
      return {ok:true};
    }
    if(type==='update-open'){
      noticeLane.removeUpdates();await syncNotices();
      settingsVisible=true;setupVisible=false;await showPanel(true,true);
      await publish('panel','setup:visible',false);await publish('panel','update:open',true);
      await publish('panel','update:state',updates.snapshot());return {ok:true};
    }
    if (type === 'setup') {
      setupVisible = Boolean(a);
      await publish('panel','setup:visible',setupVisible);
      await showPanel(true,true);
      return true;
    }
    if (type === 'environment') return {...await invoke('environment'), state:health.codex?.state || 'checking', watching:!!codex.watching, activeCount:center.view().activeCount, configured:config.codex || {}, onboarding:config.onboarding || {}};
    if (type === 'pick-path') return invoke('pick-path',{kind:a});
    if (type === 'connection-paths') {
      const paths = {executable:String(a?.executable || '').trim(),codexHome:String(a?.codexHome || '').trim()};
      await invoke('validate-paths',paths);
      await poller.pause();
      try {
        const next = {...config,codex:{...config.codex,enabled:true}};
        for (const [key,value] of Object.entries(paths)) { if(value) next.codex[key]=value; else delete next.codex[key]; }
        await persist('config.json',next);
        config=next;
        await invoke('stop-source');
        codex = new NativeCodex(invoke,config.codex,sourceChanged);
        const env=await invoke('environment');boot.executable=env.executable;boot.codexHome=env.codexHome;
        tasks.codex=[];failures.codex=0;
      } finally { poller.resume(); }
      await refresh();
      return {ok:true};
    }
    if (type === 'setup-finish') {
      if(!['verified','skipped'].includes(a))throw Error('Invalid setup status');
      if(a==='verified' && (health.codex?.state!=='connected' || b!==true))throw Error('请连接成功并人工确认开始、完成、查看和确认提醒均正常');
      const next={...config,onboarding:{status:a,version:1,at:new Date().toISOString()}};
      await persist('config.json',next);config=next;setupVisible=false;
      await publish('panel','setup:visible',false);await placeChildren();return true;
    }
    if (type === 'diagnostic-copy') {
      const e=await invoke('environment');
      const report={version:e.version,platform:e.platform,executableFound:e.executableFound,homeExists:e.homeExists,homeReadable:e.homeReadable,sessionsPresent:e.sessionsPresent,state:health.codex?.state || 'checking',watching:!!codex.watching,onboarding:config.onboarding?.status || 'pending'};
      await invoke('copy',{text:JSON.stringify(report,null,2)});return true;
    }
    if(type==='nudge-played'){
      const p=pendingNudges.get(a?.id);
      if(!p||p.at!==a.at||p.stage!==a.stage||!completionVisible||!inbox.items.has(a.id))return {ok:false};
      if(a.phase==='started'){await publish('ball','completion:nudge',a);return {ok:true};}
      pendingNudges.delete(a.id);nudged.set(a.id,{stage:a.stage,at:Date.now()});return {ok:true};
    }
    if(type==='board-drag'){
      if(!a||!['start','move','end','reset'].includes(a.phase))throw Error('Invalid board drag');
      if(a.phase==='reset'){boardOffset={x:0,y:0};boardDrag=null;}
      else {const x=Number(a.x),y=Number(a.y);if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid coordinates');
        if(a.phase==='start')boardDrag={x,y,...{ox:boardOffset.x,oy:boardOffset.y}};
        if(boardDrag&&a.phase!=='start'){boardOffset={x:Math.max(-geometry.area.width,Math.min(geometry.area.width,boardDrag.ox+(x-boardDrag.x)*geometry.scale)),y:Math.max(-geometry.area.height,Math.min(geometry.area.height,boardDrag.oy+(y-boardDrag.y)*geometry.scale))};if(a.phase==='end')boardDrag=null;}}
      await placeChildren();return {ok:true};
    }
    if (type === "ready") {
      if(from==='toast'){toastKey=null;await syncNotices();}
      if(from==='panel')await publish(from,'update:state',updates.snapshot());
      await publish(from, "native:ready", true);
      if(from==='panel')await publish(from,'setup:visible',setupVisible);
      await sync();
      return true;
    }
    if (type === "toggle" || type === "show" || type === "hide") {
      await showPanel(
        type === "toggle" ? !panelVisible : type === "show",
        Boolean(a),
      );
      return true;
    }
    if (type === "panel-view") {
      if(typeof a!=='boolean')throw Error('Invalid panel view');
      settingsVisible=a;
      await placeChildren();
      return {ok:true};
    }
    if (type === "settings")
      return { retainCompletions: retainCompletions(config), ...CompletionPolicy.normalize(config.notifications), appearance: config.appearance || {} };
    if (type === "retention") {
      if (typeof a !== "boolean") throw new Error("Invalid setting");
      const next = {
        ...config,
        notifications: { ...config.notifications, retainCompletions: a },
      };
      await persist("config.json", next);
      config = next;
      await renderCompletions();
      return { ok: true };
    }
    if (type === "completion-preferences") {
      const value = a && typeof a === "object" ? a : {};
      const next = { ...config, notifications: { ...config.notifications, ...CompletionPolicy.normalize({...config.notifications,...value}) } };
      await persist("config.json", next); config = next; await publish("completions", "completion:preferences", next.notifications); await renderCompletions();
      return { ok: true, ...next.notifications };
    }
    if (type === "appearance") {
      const value = a && typeof a === "object" ? a : {};
      const merged={...config.appearance,...value};
      if(Object.hasOwn(value,'motion')&&!Object.hasOwn(value,'reducedMotion'))merged.reducedMotion=value.motion==='reduced';
      if(!Object.hasOwn(value,'companionMode')&&(Object.hasOwn(value,'personality')||Object.hasOwn(value,'motion')))delete merged.companionMode;
      const next = { ...config, appearance: Appearance.normalize(merged) };
      await persist("config.json", next); config = next;
      await publish("ball", "appearance:preference", config.appearance);
      return { ok: true, appearance: config.appearance };
    }
    if (type === "completion") {
      const item = inbox.items.get(a);
      if (!item || !["open", "ack"].includes(b)) return { ok: false };
      try {
        if (b === "open") {
          await invoke("open", { url: taskTarget(item.task, config) });return {ok:true};
        }
        await persist(
          "completion-inbox.json",
          [...inbox.items.values()].filter((i) => i.id !== a),
        );
        inbox.acknowledge(a);
        const current = center.entries.get(item.taskId);
        if (
          current?.task.turnId === item.turnId &&
          current.task.status === "completed"
        )
          center.action(item.taskId, "ack");
        await renderCompletions();
        await interact('completion-confirmed');
        return { ok: true };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    }
    if (type === "lifecycle") {
      const events = (a || []).map((id) => lifecycle.get(id)).filter(Boolean);
      const kinds=[...new Set(events.map(e=>e.kind))];
      if(kinds.length>1){for(const kind of kinds)await action('ball','lifecycle',[events.filter(e=>e.kind===kind).map(e=>e.id)]);return true;}
      for (const e of events) lifecycle.delete(e.id);
      if (!events.length) return true;
      noticeLane.removeUpdates();
      if (events[0].kind === "completed") {
        for (const e of events)
          if (e.targetTask) {
            const { targetTask, ...notice } = e;
            inbox.add(notice, targetTask);
          }
        await persist("completion-inbox.json", [...inbox.items.values()]);
        await renderCompletions();
        await syncNotices();
      } else if(['failed','attention'].includes(events[0].kind)) {
        noticeLane.reconcile(center.view());await syncNotices();
      } else {
        const labels = {
          started: "开始任务",
          joined: "已接入进行中的任务",
          completed: "任务已完成",
          failed: "任务失败",
          attention: "需要你处理",
          stopped: "任务已停止",
        };
        noticeLane.push({
          id:events.map(e=>e.id).join('|'),taskIds:events.map(e=>e.taskId),
          label: labels[events[0].kind],
          title: events[0].title,
          count: events.length,
        });
        await syncNotices();
      }
      return true;
    }
    if (type === "refresh") {
      await refresh();
      return true;
    }
    if (type === "more") {
      await codex.loadMore();
      await refresh();
      return true;
    }
    if (type === "open") {
      try {
        await invoke("open", {
          url: taskTarget(center.entries.get(a)?.task, config),
        });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    }
    if (type === "task") {
      if (b === "copy")
        return invoke("copy", {
          text: taskTarget(center.entries.get(a)?.task, config),
        });
      return center.action(a, b);
    }
    if (type === "source") {
      if(a === "workbench" && b && !workbenchAdapter)return {ok:false,error:"工作台接口预留，尚未安装适配器"};
      if (!["codex", "workbench"].includes(a) || typeof b !== "boolean")
        throw new Error("Invalid source");
      const next = { ...config, [a]: { ...config[a], enabled: b } };
      await persist("config.json", next);
      config = next;
      if (a === "codex" && !b) {
        await invoke("stop-source");
        codex.watching = false;
        codex.runtime.clear();
      }
      await refresh();
      return { ok: true };
    }
    if (type === "quit") {
      updates.stop();
      stopping = true;
      poller.stop();
      await storage;
      await invoke("quit");
    }
  }
  await listen("native:request", (request) => {
    const run = async () => {
      try {
        const result = await action(request.from, request.action, request.args);
        await invoke("reply", {
          target: request.from,
          id: request.id,
          result: result ?? null,
        });
      } catch (e) {
        await invoke("reply", {
          target: request.from,
          id: request.id,
          error: String(e),
        });
      }
    };
    if (
      ["completion", "retention", "source", "task", "lifecycle",'notice-ack','completion-preferences'].includes(
        request.action,
      )
    )
      actions = actions.then(run, run);
    else run().catch(diagnostic);
  });
  await listen("native:tray", (type) => {
    if (type === "refresh") refresh().catch(diagnostic);
    else showPanel(type === "show", true).catch(diagnostic);
  });
  await listen('update:progress',value=>updates.progress(value));
  for (const target of ["ball", "panel", "completions", "toast"])
    await publish(target, "native:ready", true);
  const saved = boot.stored["window-state.json"];
  await move(
    saved?.nativePhysical ||
      (saved
        ? { x: saved.x * geometry.scale, y: saved.y * geometry.scale }
        : {
            x: geometry.area.x + geometry.area.width - 160 * geometry.scale,
            y: geometry.area.y + geometry.area.height - 180 * geometry.scale,
          }),
    true,
  );
  await win("ball", "show");
  await win("toast", "passthrough", { value: true });
  await invoke("input");
  const cached = boot.stored["cache/snapshot.json"];
  if (cached?.tasks) {
    tasks.codex = cached.tasks
      .filter((t) => t.source === "codex")
      .map((t) => ({ ...t, stale: true }));
    tasks.workbench = disabled('workbench') ? [] : cached.tasks
      .filter((t) => t.source === "workbench")
      .map((t) => ({ ...t, stale: true }));
    center.update({
      ...cached,
      tasks: [...tasks.codex, ...tasks.workbench],
      sources: { codex: "offline", workbench: "offline" },
    });
  }
  await sync();
  if(setupVisible){await publish('panel','setup:visible',true);await showPanel(true,true);}
  setInterval(() => center.tick(), 1000);
  setInterval(()=>checkCompletionPolicy().catch(diagnostic),1000);
  if(!boot.testMode){await updates.start().catch(diagnostic);setInterval(()=>maybeUpdateNotice().catch(diagnostic),2000);}
  await refresh();
  window.__nativeBot = {
    center,
    inbox,
    geometry: () => geometry,
    move,
    refresh,
    showPanel,
    renderCompletions,
    action,
    services: health,
  };
  if (boot.testMode) {
    try {
      stopping = true;
      poller.stop();
      clearTimeout(changeTimer);
      const actual = center.view();
      if(boot.testMode==='updater'){
        await updates.check(true);
        if(updates.snapshot().phase!=='available')throw Error(updates.snapshot().error||'No release to verify');
        await updates.download();
        if(updates.snapshot().phase!=='ready')throw Error(updates.snapshot().error||'Signature verification failed');
        let blocked=false;try{await invoke('update-install');}catch{blocked=true;}
        if(!blocked)throw Error('Test installer was not blocked');
        await invoke('test-report',{passed:true,scenario:'public-signed-update-download',version:updates.snapshot().version,signatureVerified:true,installationBlocked:true});
        await invoke('quit');return;
      }
      if(boot.testMode==='onboarding'){
        const e=await action('panel','environment');
        if(e.executableFound || e.homeReadable || e.state==='connected')throw Error('Missing environment reported healthy');
        let rejected=false;try{await action('panel','setup-finish',['verified',true]);}catch{rejected=true;}
        if(!rejected)throw Error('Offline setup incorrectly verified');
        await action('panel','setup',[true]);
        if(!(await invoke('inspect')).panel.visible)throw Error('Repair UI hidden');
        await action('panel','setup-finish',['skipped',false]);
        const saved=(await invoke('bootstrap')).stored['config.json'];
        if(saved.onboarding.status!=='skipped')throw Error('Skip did not persist');
        await invoke('test-report',{passed:true,scenario:'uninitialized-home-and-missing-executable',offline:true,repairVisible:true,skipPersisted:true});
        await invoke('quit');return;
      }
      if (health.codex?.state !== "connected")
        throw new Error("Live Codex connection failed");
      const environment = await action('panel','environment');
      if(!environment.executableFound || !environment.homeReadable)throw Error('Environment discovery failed');
      let rejected=false;
      try{await action('panel','setup-finish',['verified',false]);}catch{rejected=true;}
      if(!rejected)throw Error('Setup bypassed human verification');
      await action('panel','setup',[true]);
      const setupWindow=await invoke('inspect');
      if(Math.abs(setupWindow.panel.width-360*geometry.scale)>2||Math.abs(setupWindow.panel.height-430*geometry.scale)>2)throw Error('Setup window size mismatch');
      await action('panel','setup-finish',['skipped',false]);
      await action('panel','setup',[false]);
      const synthetic = {
        id: "native-verification",
        source: "codex",
        title: "Native completion verification",
        turnId: "native-test",
        status: "running",
        eventAt: new Date().toISOString(),
      };
      center.update(
        buildSnapshot([synthetic], { sources: { codex: "connected" } }),
      );
      await new Promise((r) => setTimeout(r, 3500));
      center.update(
        buildSnapshot([{ ...synthetic, status: "completed" }], {
          sources: { codex: "connected" },
        }),
      );
      await new Promise((r) => setTimeout(r, 5000));
      if (!inbox.items.size)
        throw new Error("Completion lifecycle not retained");
      const start = {
        x: geometry.area.x + geometry.area.width / 2,
        y: geometry.area.y + geometry.area.height / 3,
      };
      await move(start, true);
      const before = await invoke("inspect");
      for (let i = 1; i <= 12; i++)
        await move({ x: start.x + i * 2, y: start.y + i * 2 }, true);
      const after = await invoke("inspect");
      if (
        !after.ball.visible ||
        !after.completions.visible ||
        Math.abs(
          after.completions.x -
            before.completions.x -
            (after.ball.x - before.ball.x),
        ) > 2 ||
        Math.abs(
          after.completions.y -
            before.completions.y -
            (after.ball.y - before.ball.y),
        ) > 2
      )
        throw new Error("Completion window did not follow native ball");
      if (Math.abs(geometry.x - start.x - 24) > 2)
        throw new Error("Native movement drift");
      await showPanel(true);
      const expanded=await invoke('inspect');
      if(!expanded.panel.visible||!expanded.completions.visible)throw Error('Opening panel dismissed retained completion');
      await handle({handled:true,ballInteractive:true,action:'drag-start',position:{x:geometry.x+5,y:geometry.y+5},interaction:{}});
      await movement;
      const dragged=await invoke('inspect');
      if(!dragged.panel.visible||!dragged.completions.visible)throw Error('Dragging dismissed expanded panels');
      await handle({handled:true,ballInteractive:true,action:'drag-end',position:{x:geometry.x,y:geometry.y},interaction:{}});
      await showPanel(false);
      if ((await invoke("inspect")).panel.visible)
        throw new Error("Panel failed to hide");
      await action("panel", "retention", [false]);
      if ((await invoke("inspect")).completions.visible)
        throw new Error("Disabled reminders remained visible");
      await action("panel", "retention", [true]);
      const testId=[...inbox.items.keys()][0];
      await action('panel','completion-preferences',[{autoCloseCompletions:true,completionCloseMinutes:1}]);
      inbox.items.get(testId).receivedAt=Date.now()-61000;
      await renderCompletions();
      if(!(await invoke('inspect')).completions.visible||!inbox.items.has(testId))throw Error('Legacy timeout dismissed an unconfirmed completion');
      await action('panel','completion-preferences',[{autoCloseCompletions:false,completionEscalation:'angry'}]);
      const dragBefore=await invoke('inspect');
      // Drag away from the avatar so collision recovery does not mask DPI movement.
      const dragDx=dragBefore.completions.x<dragBefore.ball.x?-20:20;
      await action('completions','board-drag',[{phase:'start',x:100,y:100}]);
      await action('completions','board-drag',[{phase:'end',x:100+dragDx,y:100}]);
      const dragAfter=await invoke('inspect');
      if(Math.abs(dragAfter.completions.x-dragBefore.completions.x-dragDx*geometry.scale)>2)throw Error(`Board drag DPI mismatch: ${JSON.stringify({before:dragBefore.completions,after:dragAfter.completions,scale:geometry.scale,dragDx})}`);
      await action('completions','board-drag',[{phase:'reset'}]);
      if (boot.testMode !== "hold")
        await action("completions", "completion", [
          [...inbox.items.keys()][0],
          "ack",
        ]);
      const report = {
        passed: true,
        liveTasks: actual.activeCount,
        source: health.codex.state,
        geometry,
        retention: true,
        settings: true,
        move: true,
        renderer: {
          width: innerWidth,
          height: innerHeight,
          dpr: devicePixelRatio,
        },
      };
      await invoke("test-report", report);
      if (boot.testMode !== "hold") await invoke("quit");
    } catch (e) {
      await invoke("test-report", { passed: false, error: String(e) });
      await invoke("quit");
    }
  }
}
