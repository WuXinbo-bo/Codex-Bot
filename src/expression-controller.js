(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./m1-activities.js"),require('./appearance.js'),require('./companion-memory.js'),require('./base-emotions.js'));
  else root.MetaBotExpressionController = factory(root.MetaBotActivities,root.MetaBotAppearance,root.MetaBotCompanionMemory,root.MetaBotBaseEmotions);
})(typeof self !== "undefined" ? self : globalThis, function (Activities,Appearance,Memory,BaseEmotions) {
  const LEGACY_POOLS = Object.freeze({
    offline: ["waiting", "calm", "neutral"],
    idle: ["neutral", "calm", "curious", "waiting"],
    running: ["focus", "scan_left", "scan_right", "context_sort", "idea_trace", "double_check", "quiet_progress"],
    queued: ["waiting", "cautious", "calm", "curious"],
    paused: ["calm", "thinking", "fatigue", "waiting"],
    needs_attention: ["input", "curious", "cautious", "waiting"],
    completed: ["calm", "relief", "neutral"],
    failed: ["confused", "cautious", "waiting"],
    stopped: ["calm", "waiting", "neutral"], unknown: ["waiting", "cautious", "neutral"]
  });
  const POOLS=Object.freeze(Object.fromEntries(Object.entries(LEGACY_POOLS).map(([status,names])=>[status,Object.freeze(names.concat(Object.values(BaseEmotions.entries).filter(e=>(BaseEmotions.routes[status]||[]).includes(e.family)).map(e=>e.id)))])));
  const WEIGHTS = Object.freeze({
    focus: 22, deep_focus: 16, context_sort: 14, micro_confirm: 14, double_check: 12,
    multi_split: 10, idea_trace: 7, fatigue_reset: 5, refocus: 12, cautious_retry: 7,
    quiet_progress: 15, external_wait: 8
  });
  const COOLDOWNS = Object.freeze({ idea_trace: 25_000, multi_split: 30_000, fatigue_reset: 60_000, cautious_retry: 30_000 });

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(Number(value) || 0, minimum), maximum);
  }

  function poolFor(status, count) {
    if (!status || (status === "offline" && count > 0)) return POOLS.idle;
    return POOLS[status] || POOLS.idle;
  }

  function weightedPick(pool, random, recent = []) {
    const available = pool.filter((name) => !recent.includes(name));
    const candidates = available.length ? available : pool.length>1?pool.filter(name=>name!==recent.at(-1)):pool;
    const total = candidates.reduce((sum, name) => sum + (WEIGHTS[name] || 10), 0);
    let cursor = clamp(random(), 0, 0.999999) * total;
    for (const name of candidates) {
      cursor -= WEIGHTS[name] || 10;
      if (cursor < 0) return name;
    }
    return candidates.at(-1);
  }

  function createSeededRandom(seed) {
    let state = (Number(seed) || 1) >>> 0;
    return function () {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  }

  function createExpressionController(options = {}) {
    const setExpression = typeof options.setExpression === "function" ? options.setExpression : () => {};
    const setGaze = typeof options.setGaze === "function" ? options.setGaze : () => {};
    const clearGaze = typeof options.clearGaze === "function" ? options.clearGaze : () => {};
    const setMotion = typeof options.setMotion === "function" ? options.setMotion : () => {};
    const setActive = typeof options.setActive === "function" ? options.setActive : () => {};
    const resetIdle = typeof options.resetIdle === "function" ? options.resetIdle : () => {};
    const schedule = typeof options.setTimeout === "function" ? options.setTimeout : setTimeout;
    const unschedule = typeof options.clearTimeout === "function" ? options.clearTimeout : clearTimeout;
    const now = typeof options.now === "function" ? options.now : Date.now;
    const random = typeof options.random === "function" ? options.random : createSeededRandom(options.seed ?? now());
    const baseRandom=options.baseRandom||createSeededRandom((options.seed??now())+104729);
    const baseDirector=BaseEmotions.createDirector({random:baseRandom,now});
    let baseHoldMs=8500,baseHoldUntil=0;
    const intervalMs = Math.max(2500, Number(options.intervalMs || 8500));
    const standbyAfter = Math.max(intervalMs, Number(options.standbyAfter || 60_000));
    const sleepAfter = Math.max(standbyAfter, Number(options.sleepAfter || 180_000));
    let preferences=Appearance.normalize(options.appearance);
    const appearanceDirector=Appearance.createDirector(preferences,{now:options.appearanceNow||now,random:options.appearanceRandom||createSeededRandom((options.seed??now())+7919)});
    let resolvedAppearance=appearanceDirector.sample();
    const memory=Memory.create(now);
    const personality=()=>Appearance.PERSONALITIES[preferences.personality];

    let status = "offline";
    let count = 0;
    let initialized = false;
    let current = null;
    let baseTimer = null;
    let baseDueAt = null;
    let transientTimer = null;
    let transient = null;
    let token = 0;
    let lastActivity = now();
    let lastDizzyAt = -Infinity;
    let dragPose = "slow_drag";
    let motionLevel = normalizeMotionLevel(options.motionLevel);
    const recent = [];
    const lastPlayed = new Map();
    let activity = null;
    let activityTimer = null;
    let nextActivityAt = now() + 18000;
    let nextTheaterAt=now()+45000;
    let retainedTheaterCount=0;
    let randomEnabled = true;
    let pendingReminder = null;
    let taskKey = null;
    let freshState = false;
    let pointerNear = false;
    let lastLeave = -Infinity;
    let pointer = { x: 0, y: 0 };
    let pointerTravel = 0;
    let pointerSamples = 0;
    let suspendedActivity = null;
    let dragging = false;
    const deliveredReminders = new Set();
    const taskStatuses = new Map();
    let orbited = false;
    let panelOpen = false;
    let reminderAt = Infinity;
    const activityHistory = new Map();
    const activityStats={},ambientSpans=[];
    const panelHistory={};let pendingScore=null,panelSide='right',panelMoveStyle=0;
    function pickPanel(route){
      const names=Object.keys(Activities.Scores.meta).filter(id=>Activities.Scores.meta[id].type==='panel'&&Activities.Scores.meta[id].route===route);
      const recent=panelHistory[route]||[],choices=names.filter(id=>!recent.includes(id));
      const pool=choices.length?choices:names.filter(id=>id!==recent.at(-1));
      const name=pool[Math.floor(random()*pool.length)];panelHistory[route]=[...recent,name].slice(-3);return name;
    }
    const ambientMs=()=>ambientSpans.reduce((sum,s)=>sum+Math.max(0,s.end-Math.max(s.start,now()-300000)),0)+(activity?.priority===5?Math.max(0,now()-Math.max(activity.startedAt,now()-300000)):0);
    const activityReport=()=>({counts:structuredClone(activityStats),ambientMs:ambientMs()});
    function ambientAllowed(name){
      while(ambientSpans.length&&ambientSpans[0].end<now()-300000)ambientSpans.shift();
      const limit=status==='running'?90000:150000;
      const jitter=Activities.THEATERS[name]?1.04:Activities.LABELS[name]&&!Activities.Scores.meta[name]&&!Activities.PropScores.meta[name]&&!Activities.NARRATIVES[name]&&!name.startsWith('performance_')?1.1:1;
      return ambientMs()+Activities.duration(name)*personality().tempo*jitter<=limit;
    }
    const theaterCounts = new Map();
    const theaterEvents = [];
    let lastTheater = null;
    const propExposure={};let propVisible=[],propAt=now(),propFollowup=null;
    const completionProps=new Map();
    const accountProps=()=>{const time=now();for(const id of propVisible)propExposure[id]=(propExposure[id]||0)+Math.max(0,time-propAt);propAt=time;};
    const exposure=()=>{accountProps();return options.getAccessoryExposure?.()||{...propExposure};};
    const propPrevious=previous=>({...previous,exposure:exposure()});
    const theaterVariants = new Map();
    const performanceHistory = new Map();
    const performanceRecent = [];
    let pendingPanel = null;
    let lastPanelStyle = -1;
    let panelStyle = 0;
    let emotionMemory = { name:'settled', intensity:.2, at:now() };
    let panelContact=null;
    const memoryEvents=new Set();
    function feel(name,intensity=.5){emotionMemory={name,intensity,at:now()};}
    function pickPerformance(kind) {
      const pool = (Activities.PERFORMANCES?.[kind === 'joined' ? 'started' : kind] || []).map(name=>`performance_${name}`);
      if(!pool.length)return null;
      const minimum=Math.min(...pool.map(name=>performanceHistory.get(name)||0));
      let choices=pool.filter(name=>(performanceHistory.get(name)||0)===minimum);
      const last=performanceRecent.at(-1);
      const diverse=choices.filter(name=>Activities.family(name)!==last?.family);
      if(diverse.length)choices=diverse;
      const styleFor=name=>Activities.poseFor(Activities.CLIPS[name][1].expression).eyeStyle;
      const freshStyle=choices.filter(name=>styleFor(name)!==last?.eyeStyle);
      if(freshStyle.length)choices=freshStyle;
      const moodWeight=name=> emotionMemory.intensity*Math.exp(-(now()-emotionMemory.at)/60000)<.1 ? 1 : emotionMemory.name==='concerned' && /inspect|review|retry|think/.test(name) ? 2 : emotionMemory.name==='satisfied' && /bow|present|breathe/.test(name) ? 2 : 1;
      const used=exposure(),weight=name=>moodWeight(name)*Activities.exposureWeight(name,choices,used);
      let cursor=random()*choices.reduce((total,name)=>total+weight(name),0);
      const name=choices.find(name=>(cursor-=weight(name))<0)||choices.at(-1);
      performanceHistory.set(name,(performanceHistory.get(name)||0)+1);
      performanceRecent.push({name,kind,family:Activities.family(name),eyeStyle:styleFor(name),at:now()});
      if(performanceRecent.length>32)performanceRecent.shift();
      return name;
    }
    function theaterEvent(kind, name, reason) {
      theaterEvents.push({ kind, name, reason, at: now() });
      if (theaterEvents.length > 100) theaterEvents.shift();
    }
    function chooseTheater(names) {
      const minimum = Math.min(...names.map(name => theaterCounts.get(name) || 0));
      const pool = names.filter(name => (theaterCounts.get(name) || 0) === minimum);
      return Activities.chooseActivity(pool, random, propPrevious(lastTheater ? { name: lastTheater, family: Activities.family(lastTheater) } : null));
    }
    const lifecycleSeen = new Set();
    const lifecycleQueue = new Map();
    let lifecycleCurrent = null;
    let lifecycleTimer = null;
    const reactionHistory = new Map();
    let lastReaction = null;
    let lastPressAt = -Infinity;
    let pressStreak = 0;
    let waryUntil = 0;
    let pleasedUntil = 0;
    let lastRareAt = -Infinity;
    let dragFace = null;

    function interactionMood() {
      return now() < waryUntil ? "wary" : now() < pleasedUntil ? "pleased" : "neutral";
    }

    function pickReaction(group) {
      const working = !["idle", "offline", "completed"].includes(status);
      const history = reactionHistory.get(group) || [];
      const pool = (Activities.REACTIONS[group] || []).filter(name =>
        !(working && (Activities.RARE.has(name) || name === "affection")) &&
        !(Activities.RARE.has(name) && (now() - lastRareAt < 120000 || motionLevel !== "full")));
      const eligible = pool.filter(name => !history.includes(name));
      const candidates = eligible.length ? eligible : pool.filter(name => name !== history.at(-1));
      const tier = name => Activities.RARE.has(name) ? "rare" : Activities.PLAYFUL.has(name) ? "playful" : "ordinary";
      const weights = { ordinary: 70, playful: working ? 10 : interactionMood() === "pleased" ? 40 : 25, rare: 5 };
      const weight = name => weights[tier(name)] / candidates.filter(item => tier(item) === tier(name)).length;
      let cursor = clamp(random(), 0, 0.999999) * candidates.reduce((sum, name) => sum + weight(name), 0);
      let selected = candidates.at(-1);
      for (const name of candidates) { cursor -= weight(name); if (cursor < 0) { selected = name; break; } }
      if (!selected) return null;
      reactionHistory.set(group, history.concat(selected).slice(-3));
      if (Activities.RARE.has(selected)) lastRareAt = now();
      lastReaction = { group, name: selected, at: now(), mood: interactionMood() };
      return selected;
    }

    function reactionPose(group) {
      const name = pickReaction(group);
      return Activities.poseFor(Activities.CLIPS[name]?.[0].expression || "neutral");
    }

    function playSocial(group, priority = 28) {
      if (dragging || transient?.priority >= 50 || transient?.priority > priority) return false;
      if(preferences.personality==='quiet'&&['hover','dwell','return'].includes(group))return playTransient('attentive',{priority,duration:450,transition:300});
      const name = pickReaction(group);
      if (!name) return false;
      if (motionLevel === "reduced") return playTransient(Activities.CLIPS[name][0].expression, { priority, duration: 120 });
      return playActivity(name, priority);
    }

    function receiveLifecycle(events = []) {
      for (const original of events) {
        const event = original && { ...original, kind: ({resumed:'started',queued:'joined',paused:'stopped'})[original.kind] || original.kind };
        if (!event?.id || lifecycleSeen.has(event.id)) continue;
        if(activity&&[56,57].includes(activity.priority)){cancelActivity('new-task');clearTimer('transient');transient=null;}
        lifecycleSeen.add(event.id);
        const urgency={failed:6,attention:5,completed:4,stopped:3,started:2,joined:1};
        if(activity?.priority===55 && (urgency[event.kind]||0)>(urgency[lifecycleCurrent?.kind]||0)){
          cancelActivity('lifecycle-preemption');clearTimer('transient');transient=null;
        }
        if (["completed", "failed", "stopped"].includes(event.kind)) {
          for (const kind of ["started", "joined"]) {
            const remaining = (lifecycleQueue.get(kind) || []).filter(item => item.taskId !== event.taskId || item.turnId !== event.turnId);
            if (remaining.length) lifecycleQueue.set(kind, remaining);
            else lifecycleQueue.delete(kind);
          }
        }
        const group = lifecycleQueue.get(event.kind) || [];
        group.push(event);
        lifecycleQueue.set(event.kind, group);
      }
      if (lifecycleTimer === null) lifecycleTimer = schedule(() => { lifecycleTimer = null; drainLifecycle(); }, 180);
    }

    function drainLifecycle() {
      if (dragging || transient?.priority >= 55 || !lifecycleQueue.size) return false;
      const kind = ["failed", "attention", "completed", "stopped", "started", "joined"].find(key => lifecycleQueue.has(key));
      if (!kind) return false;
      const events = lifecycleQueue.get(kind);
      lifecycleQueue.delete(kind);
      const pools = Activities.LIFECYCLE;
      const authored = Activities.PERFORMANCES?.[kind === 'joined' ? 'started' : kind] || [];
      const pool = authored.length ? authored.map(name => `performance_${name}`) : pools[kind];
      const eligible = pool.filter(name => name !== lifecycleCurrent?.clip);
      const choices = eligible.length ? eligible : pool;
      let narrative=null;
      if(kind==='completed')for(const event of events)if(!memoryEvents.has(event.id)){memoryEvents.add(event.id);narrative=memory.observe('completed')||narrative;}
      while(memoryEvents.size>128)memoryEvents.delete(memoryEvents.values().next().value);
      const clip = (preferences.stories&&narrative) || pickPerformance(kind) || choices[Math.floor(random() * choices.length)];
      lifecycleCurrent = { kind, events, clip };
      if(kind==='completed'&&(Activities.PropScores.meta[clip]||Activities.Scores.meta[clip])){
        for(const e of events)completionProps.set(JSON.stringify([e.taskId,e.turnId||'']),(Activities.PropScores.meta[clip]||Activities.Scores.meta[clip]).prop);
        while(completionProps.size>128)completionProps.delete(completionProps.keys().next().value);
      }
      feel(({started:'engaged',joined:'engaged',completed:'satisfied',failed:'concerned',attention:'expectant',stopped:'settled'})[kind] || 'settled');
      if (kind === "completed") pleasedUntil = now() + 20000;
      options.onLifecycle?.({ kind, events });
      if (motionLevel === "reduced") {
        playTransient(kind === "completed" ? "micro_confirm" : "attentive", { priority: 55, duration: 120 });
        return true;
      }
      return playActivity(clip, 55);
    }

    function deferLifecycle() {
      if (transient?.priority !== 55 || !lifecycleCurrent) return;
      const { kind, events } = lifecycleCurrent;
      lifecycleQueue.set(kind, events.concat(lifecycleQueue.get(kind) || []));
    }

    function cancelActivity(reason = "interrupted") {
      accountProps();propVisible=[];
      if(activity){
        const stats=activityStats[activity.name];
        const elapsed=Math.max(0,now()-activity.startedAt);
        stats.playedMs+=elapsed;stats[reason==='completed'?'completed':'interrupted']++;
        stats.lastReason=reason;
        if(activity.priority===5)ambientSpans.push({start:activity.startedAt,end:now()});
        const followup=Activities.Scores.followups[activity.name];
        if(followup&&preferences.stories&&randomEnabled&&motionLevel!=='reduced'&&activity.context===taskKey&&reason!=='task-changed'&&(reason==='completed'||activity.name==='activity_clip_edges'))pendingScore={name:followup,context:activity.context,at:now()+45000,expires:now()+600000};
        if(Activities.Scores.meta[activity.name])options.onPerformance?.(false);
      }
      if(reason==='completed'&&Activities.PropScores.followups[activity?.name])propFollowup={name:Activities.PropScores.followups[activity.name],at:now()+45000,expires:now()+600000};
      if(activity){
        if(Activities.NARRATIVES[activity.name]){memory.observe(reason==='completed'?'finished':'interrupted',activity.name);options.onPerformance?.(false);}
      }
      if(activity?.name.startsWith('performance_')) options.onPerformance?.(false);
      if(Activities.THEATERS[activity?.name]) {
        const name = activity.name;
        options.onTheaterMask?.(null);
        options.onPerformance?.(false);
        theaterEvent(reason === "completed" ? "completed" : "interrupted", name, reason);
        if (reason === "completed") {
          theaterCounts.set(name, (theaterCounts.get(name) || 0) + 1);
          activityHistory.set(name, now());
          lastTheater = name;
          nextTheaterAt = now() + (status === "running" ? 90000 + random()*60000 : 45000 + random()*45000)*personality().interval;
        } else nextTheaterAt = now() + 15000;
      }
      if (activityTimer !== null) unschedule(activityTimer);
      if (activity?.name === "mimic") setMotion({ mode: "idle" });
      activityTimer = null;
      activity = null;
    }

    function suspendActivity(priority = 60) {
      if (!activity || activity.priority > 20) return;
      if(Activities.NARRATIVES[activity.name]){suspendedActivity=null;return;}
      if((Activities.THEATERS[activity.name] || activity.name.startsWith('performance_')) && (priority >= 50 && priority !== 60 || dragging)){suspendedActivity=null;return;}
      suspendedActivity = { ...activity, remaining: Math.max(1, activity.dueAt - now()), context: taskKey, expires: now() + 15000 };
    }

    function playActivity(name, priority = 5, resume = null, overrideFrames = null) {
      if (!Activities.CLIPS[name] || motionLevel === "reduced" || (transient && transient.priority > priority)) return false;
      if(priority===5&&!resume&&!ambientAllowed(name))return false;
      const variants = [0,1,2].filter(value => value !== theaterVariants.get(name));
      const varied=Activities.THEATERS[name]||Activities.PropScores.meta[name]||Activities.Scores.meta[name];
      const variant = varied ? resume?.variant ?? variants[Math.floor(random() * variants.length)] : 0;
      const frames = overrideFrames || resume?.frames || (Activities.Scores.meta[name]?Activities.Scores.frames(name,variant):Activities.PropScores.meta[name]?Activities.PropScores.frames(name,variant):Activities.THEATERS[name] ? Activities.theaterFrames(name, variant) : Activities.CLIPS[name]);
      if (priority >= 50 && priority !== 60 && (Activities.THEATERS[suspendedActivity?.name] || suspendedActivity?.name.startsWith('performance_'))) suspendedActivity = null;
      if (!resume && priority > 20) suspendActivity(priority);
      cancelActivity(resume ? "resume" : priority >= 50 ? "priority-event" : "social-response");
      clearTimer("transient");
      transient = { name, priority, token: ++token };
      activity = { name, variant, index: resume ? resume.index - 1 : 0, priority, context:taskKey,startedAt:now(),appearance:resume?.appearance,tempo: resume?.tempo || (Activities.LABELS[name] ? 0.9 + random() * 0.2 : 1) };
      activityStats[name]||={started:0,completed:0,interrupted:0,playedMs:0,lastReason:null};activityStats[name].started++;
      if(Activities.Scores.meta[name]){activity.frames=frames;activity.tempo=resume?.tempo||1;theaterVariants.set(name,variant);options.onPerformance?.(true);}
      if(Activities.PropScores.meta[name]){theaterVariants.set(name,variant);activity.tempo=resume?.tempo||1;}
      if(Activities.NARRATIVES[name]){activity.tempo=1;memory.started(name);options.onPerformance?.(true);}
      if(name.startsWith('performance_')) {
        activity.tempo=resume?.tempo || 1;
        options.onPerformance?.(true);
      }
      if (!resume && !Activities.THEATERS[name]) activityHistory.set(name, now());
      nextActivityAt = now() + (12000 + random() * 8000)*personality().interval;
      if(Activities.THEATERS[name]){
        activity.tempo=resume?.tempo||(.96+random()*.08);
        options.onPerformance?.(true);
        theaterVariants.set(name, variant);
        if (resume) {
          const mask = frames.slice(0, resume.index).filter(frame => Object.hasOwn(frame, 'mask')).at(-1)?.mask;
          if (mask) options.onTheaterMask?.(mask);
        }
        theaterEvent(resume ? "resumed" : "started", name);
        nextActivityAt=now()+15000*activity.tempo+15000;
      }
      if(!resume&&priority<60)activity.tempo*=personality().tempo;
      const reminderKey = priority === 50 ? taskKey : null;
      const advance = () => {
        if (!activity) return;
        const frame = frames[activity.index++];
        accountProps();propVisible=[];
        if (!frame) {
          if (reminderKey) deliveredReminders.add(reminderKey);
          cancelActivity("completed");
          if (name === "lifted" && dragging) { playTransient(dragPose, { priority: 70 }); return; }
          restoreBase(); return;
        }
        const duration = resume ? resume.remaining : frame.duration * activity.tempo;
        propVisible=Object.entries(frame.pose?.accessories||{}).filter(([,p])=>p.opacity>.5).map(([id])=>id);
        if(Object.hasOwn(frame,'mask'))options.onTheaterMask?.(frame.mask);
        resume = null;
        const pose = name === "mimic" ? { ...frame.pose, gaze: { ...pointer }, body: { ...frame.pose.body, rotate: pointer.x * 12 } } : name === "lifted" && dragFace ? { ...frame.pose, eyes: dragFace.eyes } : frame.pose;
        apply(frame.expression, { force: true, pose, duration: Math.min(duration*.8,frame.transition || (priority>=60?220:450)), performanceId:name, performanceMs:Activities.duration(name)*activity.tempo,beatId:Activities.Scores?.meta[name]?`${name}:${token}:${activity.index}`:undefined,beatMs:Activities.Scores?.meta[name]?duration:undefined, auto: false });
        activity.dueAt = now() + duration;
        activityTimer = schedule(advance, duration);
      };
      advance();
      return true;
    }

    function remind(repeat = false) {
      const name = status === "completed" ? "hero" : status === "needs_attention" ? "attention" : status === "failed" ? "failed" : null;
      if (!name || !freshState) { pendingReminder = null; return false; }
      if (!repeat && deliveredReminders.has(taskKey)) { pendingReminder = null; return false; }
      if (motionLevel === "reduced") { deliveredReminders.add(taskKey); pendingReminder = null; return false; }
      if (transient?.priority >= 60) { pendingReminder = { name, key: taskKey }; return false; }
      pendingReminder = null;
      reminderAt = now() + 60000;
      return playActivity(name, 50);
    }

    function normalizeMotionLevel(value) {
      return ["full", "soft", "reduced"].includes(value) ? value : "full";
    }

    function apply(name, settings = {}) {
      if (!name || (name === current && !settings.force)) return false;
      if(panelContact&&now()<panelContact.until&&activity?.priority===55&&settings.performanceId){
        const side=panelContact.side,other=side==='right'?'left':'right';
        const coordinated=Activities.PropScores.meta[settings.performanceId]||Activities.Scores.meta[settings.performanceId];
        const props=coordinated?Object.fromEntries(Object.entries(settings.pose?.accessories||{}).map(([id,p])=>[id,{...p,hand:side==='left'?-1:0}])):(settings.pose?.accessories||{});
        settings={...settings,pose:{...settings.pose,accessories:props,gaze:{x:side==='right'?.8:-.8,y:.2},arms:{[side]:{x:4,y:70,bendX:2,bendY:83,opacity:1},[other]:coordinated?(settings.pose?.arms?.[other]||{opacity:0}):{opacity:0}}}};
      }
      current = name;
      if(dragging&&panelOpen&&Activities.Scores){
        const action=['catch','level','withdraw','offer'][panelMoveStyle],holding=Activities.Scores.blocking(null,action);
        settings={...settings,pose:{...settings.pose,arms:panelSide==='left'?{left:holding.arms.right,right:holding.arms.left}:holding.arms,gaze:{x:panelSide==='left'?-.7:.7,y:.2}}};
      }
      if(BaseEmotions.entries[name]&&settings.auto!==false)settings={...settings,duration:550,performanceMs:baseHoldMs};
      resolvedAppearance=activity?.appearance||appearanceDirector.sample({expression:name,boundary:!activity||activity.index===1,blocked:dragging||Boolean(suspendedActivity)||(panelContact&&now()<panelContact.until)||transient?.priority>=50||motionLevel==='reduced'||options.isAppearanceBlocked?.()});
      if(activity)activity.appearance=resolvedAppearance;
      setExpression(name, { appearance:resolvedAppearance, duration: settings.duration, pose: settings.pose, performanceId:settings.performanceId, performanceMs:settings.performanceMs,beatId:settings.beatId,beatMs:settings.beatMs, auto: settings.auto !== false });
      return true;
    }

    function clearTimer(name) {
      const value = name === "base" ? baseTimer : transientTimer;
      if (value !== null) unschedule(value);
      if (name === "base") baseTimer = null;
      else transientTimer = null;
      if (name === "base") baseDueAt = null;
    }

    function remember(name) {
      if (!name) return;
      recent.push(name);
      while (recent.length > 4) recent.shift();
      lastPlayed.set(name, now());
    }

    function chooseBase(first = false) {
      const inactive = ['offline','idle','paused'].includes(status) && count === 0;
      const elapsed = now() - lastActivity;
      if(!randomEnabled)return (LEGACY_POOLS[status]||LEGACY_POOLS.idle)[0];
      const feeling=preferences.stories&&memory.snapshot().afterglow?'satisfied':now()-emotionMemory.at<60000?emotionMemory.name:'settled';
      const chosen=baseDirector.choose(status==='offline'&&count>0?'idle':status,{social:interactionMood(),fatigue:inactive&&elapsed>=standbyAfter,sleep:inactive&&elapsed>=sleepAfter,feeling});
      baseHoldMs=(6000+baseRandom()*6000)*personality().interval;
      baseHoldUntil=now()+baseHoldMs;
      remember(chosen);
      return chosen;
    }

    function nextBaseDelay() {
      return current?.startsWith('base_')?Math.max(1,Math.round(baseHoldUntil-now())):Math.round(intervalMs * personality().interval * (0.72 + clamp(random(), 0, 1) * 0.56));
    }

    function scheduleBase() {
      clearTimer("base");
      let delay = nextBaseDelay();
      if (status === "running" && nextActivityAt > now()) delay = Math.min(delay, nextActivityAt - now());
      if (status === "offline" && count === 0) {
        const elapsed = now() - lastActivity;
        if (elapsed < standbyAfter) delay = Math.min(delay, standbyAfter - elapsed);
        else if (elapsed < sleepAfter) delay = Math.min(delay, sleepAfter - elapsed);
      }
      delay = Math.max(1, delay);
      baseDueAt = now() + delay;
      baseTimer = schedule(rotateBase, delay);
    }

    function restoreBase() {
      cancelActivity();
      transient = null;
      clearTimer("transient");
      if (pendingReminder && pendingReminder.key === taskKey && remind()) return;
      if (drainLifecycle()) return;
      if(pendingPanel && !dragging) {
        const detail=pendingPanel;pendingPanel=null;
        if(now()-detail.at<2500){interact('panel-phase',detail);return;}
      }
      if (suspendedActivity && (suspendedActivity.context !== taskKey || now() >= suspendedActivity.expires)) suspendedActivity = null;
      if (suspendedActivity && (Activities.THEATERS[suspendedActivity.name] || suspendedActivity.name.startsWith('performance_') || (!pointerNear && !panelOpen)) && !dragging && randomEnabled && motionLevel !== "reduced") {
        const saved = suspendedActivity; suspendedActivity = null;
        if (playActivity(saved.name, saved.priority, saved)) return;
      }
      apply(chooseBase(true), { auto: true, duration: 360 });
      if (!baseTimer) scheduleBase();
    }

    function rotateBase() {
      baseTimer = null;
      baseDueAt = null;
      if (!transient) {
        if (drainLifecycle()) { scheduleBase(); return; }
        if (!panelOpen && now() >= reminderAt && ["needs_attention", "failed"].includes(status) && remind(true)) { scheduleBase(); return; }
        if (randomEnabled && now() >= nextActivityAt && motionLevel !== "reduced") {
          const route=status==='offline'?'idle':status;
          if(pendingScore&&(now()>pendingScore.expires||pendingScore.context!==taskKey))pendingScore=null;
          if(preferences.stories&&pendingScore&&now()>=pendingScore.at&&!pointerNear&&!panelOpen&&Activities.Scores.meta[pendingScore.name].route===route&&ambientAllowed(pendingScore.name)){
            const name=pendingScore.name;pendingScore=null;if(playActivity(name,5)){scheduleBase();return;}
          }
          if(propFollowup&&now()>propFollowup.expires)propFollowup=null;
          if(preferences.stories&&propFollowup&&now()>=propFollowup.at&&!pointerNear&&!panelOpen&&Activities.THEATERS[propFollowup.name]?.route===route){
            const name=propFollowup.name;if(ambientAllowed(name)){propFollowup=null;if(playActivity(name,5)){scheduleBase();return;}}
          }
          const theaters=Object.keys(Activities.THEATERS).filter(name=>Activities.THEATERS[name].route===route&&now()-(activityHistory.get(name)??-Infinity)>300000&&ambientAllowed(name));
          if(now()>=nextTheaterAt&&theaters.length){
            const selected=chooseTheater(theaters);
            if(playActivity(selected,5)){scheduleBase();return;}
          }
          const story=preferences.stories?memory.next(status,pointerNear):null;
          if(story&&ambientAllowed(story)&&random()<.2&&playActivity(story,5)){scheduleBase();return;}
          const idle = ["offline", "idle"].includes(status);
          const date = new Date(now());
          const holiday = (date.getMonth() === 0 && date.getDate() === 1) || (date.getMonth() === 11 && date.getDate() === 25);
          const pool = Activities.POOLS[status] || (idle ? Activities.POOLS.idle.concat(now() - lastActivity >= sleepAfter ? ["nap"] : [], holiday ? ["gift"] : []) : []);
          const eligible = pool.filter(name => name !== "mimic" && ambientAllowed(name) && now() - (activityHistory.get(name) ?? -Infinity) > (status === "running" ? 60000 : 180000));
          const last=[...activityHistory].sort((a,b)=>b[1]-a[1])[0];
          const history=[...activityHistory].sort((a,b)=>b[1]-a[1]).slice(0,6);
          if(status==='running'&&random()<.25){
            const name=pickPerformance('running');
            if(name&&ambientAllowed(name)&&playActivity(name,5)){scheduleBase();return;}
          }
          if (!panelOpen && !pointerNear && eligible.length && playActivity(Activities.chooseActivity(eligible,random,propPrevious(last?{name:last[0],family:Activities.family(last[0]),recentFamilies:history.map(([name])=>Activities.family(name))}:null)), 5)) { scheduleBase(); return; }
        }
        const sleepBoundary=status==='offline'&&count===0&&now()-lastActivity>=sleepAfter&&BaseEmotions.entries[current]?.family!=='sleepy';
        // Base scores own a full hold, not the legacy 2.3-second transient/restore loop.
        if(!BaseEmotions.entries[current]||!randomEnabled||now()>=baseHoldUntil||sleepBoundary)apply(chooseBase(), {auto:true,duration:550});
      }
      scheduleBase();
    }

    function playTransient(name, settings = {}) {
      const priority = Number(settings.priority || 0);
      if (transient && priority < transient.priority) return false;
      if (priority >= 50 && priority !== 60 && (Activities.THEATERS[suspendedActivity?.name] || suspendedActivity?.name.startsWith('performance_'))) suspendedActivity = null;
      if (priority > 20) suspendActivity(priority);
      cancelActivity();
      clearTimer("transient");
      const currentToken = ++token;
      transient = { name, priority, token: currentToken };
      const dragVariant = ["slow_drag", "fast_drag", "sharp_turn", "orbit", "landing"].includes(name) && dragFace ? { eyes: dragFace.eyes } : undefined;
      apply(name, { auto: false, force: settings.replay === true, duration: settings.transition, pose: settings.pose || dragVariant });
      const duration = motionLevel === "reduced"
        ? Math.min(120, Math.max(0, Number(settings.duration || 0)))
        : Math.max(0, Number(settings.duration || 0));
      if (duration > 0) {
        transientTimer = schedule(() => {
          if (!transient || transient.token !== currentToken) return;
          transientTimer = null;
          transient = null;
          const next = typeof settings.next === "function" ? settings.next() : settings.next;
          if (next) playTransient(next.name, next);
          else restoreBase();
        }, duration);
      }
      return true;
    }

    function releaseTransient(maxPriority = Infinity) {
      if (!transient || transient.priority > maxPriority) return false;
      restoreBase();
      return true;
    }

    function markActivity() {
      lastActivity = now();
      resetIdle();
    }

    function update(nextStatus, nextCount = 0, detail = {}) {
      const normalized = String(nextStatus || "offline");
      const numericCount = Math.max(0, Number(nextCount) || 0);
      const previousStatus = status;
      const previousCount = count;
      const taskId = String(detail.taskId || "default");
      if (detail.fresh !== false) {
        if (["running", "queued"].includes(normalized) && !["running", "queued"].includes(taskStatuses.get(taskId))) {
          for (const key of deliveredReminders) if (JSON.parse(key)[0] === taskId) deliveredReminders.delete(key);
        }
        taskStatuses.set(taskId, normalized);
      }
      const nextKey = JSON.stringify([taskId, normalized, String(detail.eventId || "")]);
      const identityChanged = nextKey !== taskKey;
      const freshReminder = detail.quiet !== true && detail.fresh !== false && ["needs_attention", "failed", "completed"].includes(normalized) && !deliveredReminders.has(nextKey);
      const changed = !initialized || normalized !== status || numericCount !== count || identityChanged || freshReminder;
      if (identityChanged) { suspendedActivity = null; pendingScore=null; pendingReminder = null; reminderAt = Infinity; }
      taskKey = nextKey;
      freshState = detail.fresh !== false && detail.quiet !== true;
      if (!freshState) { pendingReminder = null; reminderAt = Infinity; }
      else if (identityChanged && deliveredReminders.has(taskKey) && ["needs_attention", "failed"].includes(normalized)) reminderAt = now() + 60000;
      status = normalized;
      count = numericCount;
      if (!changed) {
        if (!baseTimer) scheduleBase();
        return current;
      }
      if (normalized !== "offline" || numericCount > 0) lastActivity = now();
      if (transient?.priority <= 50 && (normalized !== previousStatus || identityChanged)) {
        cancelActivity("task-changed");
        clearTimer("transient");
        transient = null;
      }
      if (!transient) apply(chooseBase(true), { auto: true, duration: 280 });
      scheduleBase();
      if (freshReminder && !(activity?.priority === 50)) {
        remind(); initialized = true; return current;
      }
      if (!["needs_attention", "failed", "completed"].includes(normalized)) { pendingReminder = null; reminderAt = Infinity; }
      if (initialized) {
        if (!detail.lifecycleManaged && numericCount > previousCount && ["running", "queued"].includes(normalized)) {
          playTransient("attentive", { priority: 45, duration: 620 });
        }
      }
      initialized = true;
      return current;
    }

    function updateDragMotion(detail) {
      const velocity = detail?.velocity || {};
      const speed = Math.max(0, Number(velocity.speed) || 0);
      const intensity = clamp(speed / 1400, 0, 1);
      dragPose = speed > (dragPose === "fast_drag" ? 580 : 760) ? "fast_drag" : "slow_drag";
      setGaze(clamp((Number(velocity.x) || 0) / 1000, -1, 1), clamp((Number(velocity.y) || 0) / 1000, -1, 1));
      setMotion({ mode: "dragging", rotate: clamp((Number(velocity.x) || 0) * 0.008, -10, 10), x: clamp(-(Number(velocity.x) || 0) * 0.003, -4, 4), y: clamp(-(Number(velocity.y) || 0) * 0.003, -4, 4), stretch: intensity * 0.15, angle: Math.atan2(Number(velocity.y) || 0, Number(velocity.x) || 0) * 180 / Math.PI });
      if (detail?.directionChanged && now() - lastDizzyAt > 700) {
        lastDizzyAt = now();
        playTransient("sharp_turn", { priority: 75, duration: 300, next: () => ({ name: dragPose, priority: 70 }) });
      } else if (activity?.name !== "lifted" && (!transient || transient.priority <= 70)) {
        if (transient?.name !== dragPose) playTransient(dragPose, { priority: 70, transition: 180 });
      }
    }

    function interact(type, detail = {}) {
      if (!type) return current;
      if(type==='completion-confirmed'){
        const name=memory.observe('confirmed');
        const key=JSON.stringify([detail.taskId,detail.turnId||'']),prop=completionProps.get(key);completionProps.delete(key);
        if(preferences.stories&&!dragging&&['idle','completed','offline'].includes(status)){
          if(motionLevel==='reduced')playTransient('micro_confirm',{priority:57,duration:120});
          else if(prop&&randomEnabled){
            const selected=random()<.2?'theater_activity_take_delivery':pickPanel('confirm');
            playActivity(selected,57,null,Activities.Scores.panelFrames(selected,panelSide,prop));
          }else playActivity(name,57,null,prop?Activities.PropScores.confirmationFrames(prop):null);
        }
        return current;
      }
      const local = detail.local || {};
      if(preferences.stories&&activity?.name==='story_fidget'&&['hover-enter','proximity-enter'].includes(type)){
        const name=memory.observe('noticed',activity.name);pointerNear=true;playActivity(name,28);setGaze(local.x||0,local.y||0);return current;
      }
      // Passive pointer observation shares gaze, never takes ownership of a story.
      if ((Activities.NARRATIVES[activity?.name] || Activities.THEATERS[activity?.name] || ['emotion','continuation'].includes(Activities.Scores.meta[activity?.name]?.type) || activity?.name.startsWith('performance_')) && ["proximity-enter", "hover-enter", "proximity-move", "hover-move", "hover-dwell", "pointer-leave", "bubble-hover"].includes(type)) {
        pointerNear = !["pointer-leave", "bubble-hover"].includes(type);
        if (pointerNear) setGaze(local.x || 0, local.y || 0); else clearGaze();
        return current;
      }
      if (["proximity-enter", "hover-enter"].includes(type)) {
        const entering = !pointerNear;
        pointerNear = true;
        pointer = { x: clamp(local.x, -1, 1), y: clamp(local.y, -1, 1) };
        if (entering) { pointerTravel = 0; pointerSamples = 0; }
        const name = (!transient || transient.priority < 50) && entering
          ? activity?.name === "nap" || current === "fatigue" || BaseEmotions.entries[current]?.family==='sleepy' ? "wake" : activity && !Activities.LABELS[activity.name] ? "caught" : now() - lastLeave >= 800 && now() - lastLeave < 30000 ? "greet" : null : null;
        if (entering && now() - lastLeave < 800) { setGaze(local.x, local.y); return current; }
        if (name) { markActivity(); setGaze(local.x, local.y); if (name === "greet") playSocial("return"); else playActivity(name, 28); return current; }
        if (!entering && activity) { setGaze(local.x, local.y); return current; }
      }
      if (!["proximity-move", "hover-move", "drag-move"].includes(type)) markActivity();
      switch (type) {
        case "task-lifecycle": receiveLifecycle(detail.events); break;
        case "proximity-enter": setGaze(local.x, local.y); playSocial(now() < waryUntil ? "hold" : "hover"); break;
        case "proximity-move":
        case "hover-move": {
          const next = { x: clamp(local.x, -1, 1), y: clamp(local.y, -1, 1) };
          pointerTravel += Math.hypot(next.x - pointer.x, next.y - pointer.y);
          pointerSamples++; pointer = next;
          setGaze(pointer.x, pointer.y);
          if ((!activity || Activities.LABELS[activity.name]) && ["idle", "offline", "paused"].includes(status) && pointerSamples >= 3 && pointerTravel > 0.6 && now() - (activityHistory.get("mimic") ?? -Infinity) > 30000 && (!transient || transient.priority <= 28)) playActivity("mimic", 28);
          if (activity?.name === "mimic") setMotion({ mode: "idle", rotate: pointer.x * 8, y: pointer.y * 2 });
          break;
        }
        case "hover-enter": setGaze(local.x, local.y); playSocial(now() < waryUntil ? "hold" : "hover"); break;
        case "hover-dwell": if (activity?.priority === 28 && (!Activities.LABELS[activity.name] || lastReaction?.group === "return")) break; playSocial(detail.stage === "long" ? "dwell" : "hover"); break;
        case "bubble-hover":
        case "pointer-leave": {
          const wasNear = pointerNear;
          if (pointerNear) lastLeave = now();
          pointerNear = false; pointerTravel = 0; pointerSamples = 0;
          if (!transient || transient.priority < 60) { clearGaze(); setMotion({ mode: "idle" }); if (!releaseTransient(30) && !transient) restoreBase(); }
          if (type === "pointer-leave" && wasNear && !activity && !suspendedActivity && !panelOpen) playSocial("leave", 20);
          break;
        }
        case "press": {
          feel('playful',.6);
          pressStreak = now() - lastPressAt < 1600 ? Math.min(pressStreak + 1, 4) : 1;
          lastPressAt = now();
          if (pressStreak >= 3) waryUntil = now() + 8000;
          deferLifecycle();
          if (transient?.priority === 50) pendingReminder = { name: activity?.name, key: taskKey };
          suspendActivity();
          cancelActivity();
          clearTimer("transient"); transient = null;
          setGaze(local.x, local.y);
          const angle = Math.atan2(Number(local.y) || -0.5, Number(local.x) || 0) * 180 / Math.PI;
          setMotion({ mode: "pressed", stretch: -0.1, angle, x: -(local.x || 0) * 3, y: -(local.y || 0) * 3 });
          const pose = reactionPose(pressStreak >= 3 ? "hold_pose" : "press");
          playTransient("pressed", { priority: 60, transition: 120, replay: true, pose: { eyes: pose.eyes, arms: pose.arms } }); break;
        }
        case "hold-ready": {
          const pose = reactionPose("hold_pose");setMotion({mode:'hold',stretch:.075,y:1.5});
          if(motionLevel!=='reduced'&&randomEnabled){const choices=Object.keys(Activities.Scores.meta).filter(id=>Activities.Scores.meta[id].type==='social'&&Activities.Scores.meta[id].route==='hold');playActivity(Activities.chooseActivity(choices,random,{name:lastReaction?.name}),65);}
          else playTransient('hold',{priority:65,replay:true,pose:{eyes:pose.eyes,arms:pose.arms}});break;
        }
        case "ball-click":
        case "hold-release": clearGaze(); setMotion({ mode: "settling", intensity: 0.3 }); releaseTransient(65); playSocial(type === "hold-release" ? "release" : pressStreak >= 3 ? "hold" : "click", 45); break;
        case "drag-start": deferLifecycle(); dragFace = reactionPose("drag"); dragging = true; panelMoveStyle=(panelMoveStyle+1)%4;orbited = false; dragPose = "slow_drag"; setMotion({ mode: "dragging", stretch: -0.08, y: -3 }); if (motionLevel === "reduced") playTransient("lifted", { priority: 70 }); else playActivity("lifted", 70); break;
        case "drag-move": updateDragMotion(detail); break;
        case "drag-orbit": orbited = true; playTransient("orbit", { priority: 78, duration: 420, next: () => ({ name: dragPose, priority: 70 }) }); break;
        case "drag-end": {
          dragging = false;
          clearGaze();
          const releaseSpeed = Math.max(0, Number(detail.releaseSpeed ?? detail.velocity?.speed) || 0);
          setMotion({ mode: "settling", intensity: clamp(releaseSpeed / 1400, 0, 1) });
          const edge = String(detail.edgeDirection || "");
          const impact = edge.includes("left") ? "edge_left" : edge.includes("right") ? "edge_right" : edge.includes("top") ? "edge_top" : edge.includes("bottom") ? "edge_bottom" : "edge_impact";
          if (orbited && !detail.edgeHit) { orbited = false; playActivity("dizzy", 80); }
          else if (!detail.edgeHit && releaseSpeed < 100) {
            if(panelOpen&&motionLevel!=='reduced'){const selected=pickPanel('move');playActivity(selected,56,null,Activities.Scores.panelFrames(selected,panelSide));}else restoreBase();
          }
          else playTransient(detail.edgeHit ? impact : "landing", { priority: 80, duration: detail.edgeHit ? 330 : 420, transition: 130 });
          break;
        }
        case "panel-phase":
          panelSide=detail.side==='left'?'left':'right';
          if(['entering','leaving'].includes(detail.phase))panelContact={side:detail.side==='left'?'left':'right',until:now()+1400};
          if(detail.phase==='hidden'){panelContact=null;break;}
          // Never erase a lifecycle performance just because its toast has entered.
          if(activity?.priority===55){
            if(detail.label==='panel')pendingPanel={...detail,at:now()};
            break;
          }
          if(detail.label==='completions'&&detail.phase==='leaving')retainedTheaterCount=0;
          if(detail.phase==='attending'){
            const retained=Object.keys(Activities.THEATERS).filter(name=>Activities.THEATERS[name].route==='retained'&&now()-(activityHistory.get(name)??-Infinity)>300000);
            if(detail.label==='completions'&&retainedTheaterCount<2&&retained.length&&randomEnabled&&!dragging&&!transient&&status==='idle'&&now()>=nextTheaterAt){
              if(playActivity(chooseTheater(retained),5))retainedTheaterCount++;
              break;
            }
            if(!dragging&&!pointerNear&&!transient&&['idle','offline'].includes(status))playTransient('curious',{priority:25,duration:650,pose:{gaze:{x:detail.side==='left'?-.8:.8,y:.3}}});
            break;
          }
          if(!['entering','leaving','preparing'].includes(detail.phase))break;
          if(['entering','leaving'].includes(detail.phase)&&!dragging&&(!transient||transient.priority<56)&&motionLevel!=='reduced'){
            const selected=pickPanel(detail.phase==='entering'?'enter':'switch');
            playActivity(selected,56,null,Activities.Scores.panelFrames(selected,panelSide));break;
          }
          if(!dragging && (!transient || transient.priority<60)){
            // Native preparing has zero duration and is not forwarded by app.js.
            if(detail.phase==='entering'){
              const choices=[0,1,2].filter(value=>value!==lastPanelStyle);
              panelStyle=choices[Math.floor(random()*choices.length)];lastPanelStyle=panelStyle;
            }
            const side=detail.side==='left'?'left':'right',other=side==='left'?'right':'left';
            const name=detail.phase==='leaving'?'special_bashful':['special_covert','special_gingerly','special_expectant'][panelStyle];
            playTransient(name,{priority:56,duration:Math.max(650,detail.duration||0),pose:{gaze:{x:side==='left'?-.8:.8,y:.2},arms:{[side]:Activities.poseFor('neutral').arms[side], [other]:{opacity:0}},body:{rotate:side==='left'?-8:8}}});
            // The hand reaches to the same edge used as the native panel origin.
            apply(name,{force:true,auto:false,duration:340,pose:{gaze:{x:side==='left'?-.8:.8,y:.2},arms:{[side]:{x:detail.phase==='preparing'?24:4,y:panelStyle===1?57:63,bendX:5,bendY:83,opacity:1},[other]:{opacity:0}},body:{rotate:(side==='left'?-1:1)*[6,3,8][panelStyle],cy:panelStyle===0?67:64}}});
          }
          break;
        case 'panel-move':
        case 'panel-switch':
          if(!dragging&&motionLevel!=='reduced'&&(!transient||transient.priority<56)){
            const selected=pickPanel(type==='panel-move'?'move':'switch');playActivity(selected,56,null,Activities.Scores.panelFrames(selected,panelSide));
          }
          break;
        case "completion-nudge": {
          if(dragging||['failed','needs_attention','running','queued'].includes(status)||transient?.priority>=50)break;
          const stage=clamp(detail.stage,1,3);
          options.onTheaterMask?.(null);
          feel(stage>=3?'impatient':'expectant',stage/3);
          const name=['special_expectant','special_composed','special_overload'][stage-1];
          playTransient(name,{priority:50,duration:stage>=3?1600:1200,transition:450,pose:{effects:{complete:0,input:0,error:0},arms:{left:Activities.poseFor('neutral').arms.left,right:{x:5,y:59,bendX:3,bendY:80,opacity:1}},performance:{sway:stage>=3?2:0,tilt:stage>=3?3:0,cycles:2}}});
          break;
        }
        case "bubble-open": panelOpen = true; if (transient?.priority < 35 || !transient) playSocial("panel", 35); break;
        case "bubble-close": panelOpen = false; reminderAt = now() + 60000; if (transient?.priority < 35 || !transient) playSocial("leave", 35); break;
        case "activity-request": if ((['emotion','continuation'].includes(Activities.Scores.meta[detail.name]?.type)&&Activities.Scores.meta[detail.name].route===(status==='offline'?'idle':status))||(Activities.NARRATIVES[detail.name]?.route===(status==='offline'?'idle':status))||(Activities.THEATERS[detail.name]?.route===(status==='offline'?'idle':status))||(Activities.PropScores.meta[detail.name]?.type==='short'&&Activities.PropScores.meta[detail.name]?.route===(status==='offline'?'idle':status))||(["offline", "idle", "paused"].includes(status) && Activities.POOLS.idle.concat(["nap", "rain", "gift"]).includes(detail.name))) playActivity(detail.name,20); break;
        case "refresh-start": playTransient("refreshing", { priority: 40 }); break;
        case "refresh-success":
        case "refresh-recovered": playTransient("micro_confirm", { priority: 40, duration: 520 }); break;
        case "refresh-partial":
        case "refresh-offline": playTransient("confused", { priority: 40, duration: 900 }); break;
        default: break;
      }
      return current;
    }

    function setMotionLevel(nextLevel) {
      motionLevel = normalizeMotionLevel(nextLevel);
      setActive(motionLevel !== "reduced");
      if (motionLevel === "reduced") {
        suspendedActivity = null;
        propFollowup=null;
        pendingScore=null;
        if (activity?.priority === 50 || pendingReminder) deliveredReminders.add(taskKey);
        pendingReminder = null;
        cancelActivity(); clearTimer("transient"); transient = null;
        clearGaze();
        setMotion({ mode: "reduced" });
        apply(chooseBase(true), { auto: true, force: true, duration: 0 });
      }
      return motionLevel;
    }

    function stop() {
      if (lifecycleTimer !== null) unschedule(lifecycleTimer);
      lifecycleTimer = null; lifecycleQueue.clear();
      cancelActivity(); pendingReminder = null; pendingPanel=null; panelContact=null; suspendedActivity = null; dragging = false; pointerNear = false;
      propFollowup=null;
      pendingScore=null;
      completionProps.clear();
      clearTimer("base");
      clearTimer("transient");
      transient = null;
      clearGaze();
      setMotion({ mode: "idle" });
    }

    function setRandomEnabled(value) {
      randomEnabled = value !== false;
      if (!randomEnabled) {suspendedActivity = null;pendingScore=null;}
      if(!randomEnabled&&(Activities.THEATERS[activity?.name]||Activities.NARRATIVES[activity?.name]||Activities.PropScores.meta[activity?.name]||Activities.Scores.meta[activity?.name]||activity?.name.startsWith('performance_'))&&activity.priority===5)restoreBase();
    }
    options.onRandomControl?.(setRandomEnabled);
    options.onAppearanceControl?.({snapshot:()=>appearanceDirector.snapshot(),shuffle:()=>{
      resolvedAppearance=appearanceDirector.sample({expression:current||'neutral',force:true});
      options.onResolvedAppearance?.(resolvedAppearance);return resolvedAppearance;
    }});
    options.onBehaviorControl?.(value=>{
      preferences=Appearance.normalize(value);appearanceDirector.configure(preferences);
      resolvedAppearance=appearanceDirector.sample({blocked:true});options.onResolvedAppearance?.(resolvedAppearance);
      if(!preferences.stories){memory.reset();propFollowup=null;pendingScore=null;if(Activities.NARRATIVES[activity?.name]||Activities.Scores.meta[activity?.name]?.type==='continuation')restoreBase();}
    });
    setMotionLevel(motionLevel);
    options.onPerformanceDiagnostics?.(()=>({activities:activityReport(),continuation:pendingScore?{...pendingScore}:null,props:{exposure:exposure(),source:options.getAccessoryExposure?'renderer':'timeline',followup:propFollowup?{...propFollowup}:null},base:baseDirector.snapshot(),history:performanceRecent.map(item=>({...item})),counts:Object.fromEntries(performanceHistory),story:memory.snapshot(),personality:preferences.personality,appearance:appearanceDirector.snapshot(),emotion:{...emotionMemory,intensity:emotionMemory.intensity*Math.exp(-(now()-emotionMemory.at)/60000)}}));
    return { update, interact, stop, setMotionLevel, getCurrent: () => current, getState: () => ({ status, count, current, activity: activity ? { ...activity } : null, suspendedActivity: suspendedActivity ? { ...suspendedActivity } : null, pendingReminder, transient: transient ? { ...transient } : null, motionLevel, recent: recent.slice(), baseDueAt, theater: { nextAt: nextTheaterAt, completed: Object.fromEntries(theaterCounts), events: theaterEvents.map(event => ({ ...event })), blocker: !randomEnabled ? "disabled" : motionLevel === "reduced" ? "reduced-motion" : transient ? "performing" : now() < nextTheaterAt ? "cooldown" : "ready" }, reaction: lastReaction ? { ...lastReaction } : null, mood: interactionMood(), pressStreak: now() - lastPressAt < 1600 ? pressStreak : 0 }), pools: POOLS };
  }

  return { POOLS, WEIGHTS, COOLDOWNS, poolFor, weightedPick, createSeededRandom, createExpressionController };
});
