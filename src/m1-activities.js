(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./m1-rig.js") : root.MetaBotM1Rig);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MetaBotActivities = api;
})(typeof self !== "undefined" ? self : globalThis, function (Rig) {
  const A = Rig.ARMS;
  const eyes = name => ({ left: { symbols: { [name]: 1 } }, right: { symbols: { [name]: 1 } } });
  const wear = (name, values = {}) => ({ [name]: { opacity: 1, ...values } });
  const step = (expression, duration, pose = {}) => ({ expression, duration, pose });
  const look = (x, y) => ({ gaze: { x, y } });
  const props = (...names) => Object.assign({}, ...names.map(name => wear(name)));
  const CLIPS = {
    receive: [step("attentive", 350), step("curious", 550, { accessories: wear("card", { x: -25, y: -12 }), arms: { right: A.present } }), step("micro_confirm", 550, { accessories: props("card"), body: { cy: 69 } }), step("focus", 450)],
    prepare: [step("attentive", 350, { arms: { right: A.salute } }), step("micro_confirm", 450, { body: { cy: 69 } }), step("focus", 400)],
    keyboard: [step("focus", 450, { accessories: props("glasses", "card"), arms: { left: A.think, right: A.down } }), step("deep_focus", 450, { accessories: props("glasses", "card"), arms: { left: A.down, right: A.think } }), step("focus", 450, { accessories: props("glasses", "card"), arms: { left: A.think, right: A.down } }), step("micro_confirm", 550)],
    deliver: [step("micro_confirm", 400), step("complete", 750, { body: { cy: 64, rotate: -3 }, performance: { bob: 2, tilt: 2 }, accessories: props("card"), arms: { right: A.present }, eyes: eyes("star") }), step("relief", 650)],
    finish_check: [step("double_check", 400, { accessories: props("glasses", "card") }), step("complete", 700, { body: { cy: 64, rotate: -3 }, performance: { bob: 2, tilt: 2 }, arms: { right: A.up } }), step("delight", 550, { eyes: eyes("star"), body: { cy: 62 }, performance: { bob: 3, tilt: 2 } }), step("relief", 450)],
    pack_up: [step("micro_confirm", 400, { accessories: props("card", "glasses") }), step("relief", 650, { accessories: wear("glasses", { y: 28, opacity: 0 }), arms: { right: A.down } }), step("calm", 650)],
    research: [step("thinking", 420, { accessories: wear("glasses", { y: 30, rotate: -16 }) }), step("curious", 650, { accessories: props("glasses", "card"), arms: { right: A.think } }), step("deep_focus", 1100, { accessories: props("glasses", "card"), ...look(-0.4, 0.7) }), step("micro_confirm", 650, { accessories: wear("glasses", { y: 8 }), arms: { right: A.think } })],
    caught: [step("calm", 550, { body: { rotate: 13 }, ...look(0.7, -0.4) }), step("surprise", 320, { eyes: eyes("dot") }), step("steady", 750, { body: { rotate: 0 }, arms: { left: A.none, right: A.none } })],
    ponder: [step("thinking", 700), step("curious", 650, look(0.4, -0.8)), step("attentive", 420, { eyes: eyes("star"), arms: { right: A.point } }), step("micro_confirm", 500)],
    dizzy: [step("orbit", 600, { eyes: eyes("spiral"), body: { rotate: 17 } }), step("tense", 450, { eyes: eyes("spiral"), body: { rotate: -11 }, arms: { left: A.think, right: A.think } }), step("recover", 550, { eyes: { left: { closed: 1, arc: -12 } } }), step("neutral", 300)],
    lifted: [step("surprise", 300), step("lifted", 400, { eyes: eyes("squeeze") }), step("lifted", 600, { arms: { right: A.down } })],
    stretch: [step("fatigue", 500, { eyes: eyes("squeeze"), body: { rx: 59, ry: 43 } }), step("victory", 700, { effects: { complete: 0 }, eyes: eyes("squeeze"), body: { rx: 43, ry: 60 } }), step("relief", 550, { arms: { left: A.up, right: A.down } }), step("calm", 450)],
    shades: [step("curious", 500, { accessories: wear("shades", { y: 32, rotate: -20 }), arms: { right: A.think } }), step("confident", 900, { accessories: props("shades"), body: { rotate: -12 } }), step("curious", 650, { accessories: wear("shades", { y: 13, rotate: 7 }), eyes: { left: { closed: 1, arc: -9 } } }), step("confident", 600, { accessories: props("shades"), arms: { right: A.think } }), step("neutral", 400, { accessories: wear("shades", { y: 35, opacity: 0 }) })],
    magic: [step("curious", 650, { accessories: wear("topHat", { y: 12, rotate: -8 }) }), step("thinking", 800, { accessories: props("topHat", "wand"), arms: { right: A.up } }), step("surprise", 650, { accessories: { ...props("topHat", "wand"), ...wear("spark", { x: -28, y: -20 }) }, eyes: eyes("star") }), step("delight", 700, { accessories: props("topHat", "spark"), arms: { right: A.present } }), step("micro_confirm", 600, { accessories: wear("topHat", { rotate: 12, y: 9 }), body: { cy: 69, rotate: 10 } })],
    dance: [step("confident", 500, { body: { rotate: -14 }, arms: { left: A.up, right: A.down } }), step("confident", 500, { body: { rotate: 14 }, arms: { left: A.down, right: A.up } }), step("surprise", 260, { eyes: eyes("dot") }), step("delight", 650, { body: { cy: 58 }, arms: { left: A.up, right: A.up } }), step("micro_confirm", 450)],
    nap: [step("waiting", 650, { accessories: props("sleepHat", "pillow"), eyes: eyes("flat") }), step("fatigue", 950, { accessories: props("sleepHat", "pillow"), body: { rotate: 9 } }), step("fatigue", 900, { accessories: props("sleepHat", "pillow"), body: { rotate: -8 } }), step("calm", 500, { accessories: wear("sleepHat", { y: 8, opacity: 0 }) })],
    hero: [step("surprise", 350), step("confident", 650, { accessories: props("cape"), eyes: eyes("star"), body: { cy: 59 } }), step("complete", 850, { accessories: wear("cape", { rotate: -9 }), arms: { right: A.salute } }), step("relief", 650, { accessories: wear("cape", { y: 15, opacity: 0 }) })],
    attention: [step("attentive", 420, look(0.8, 0)), step("input", 700, { arms: { right: A.up } }), step("input", 650, { eyes: eyes("tear"), arms: { right: A.present } }), step("waiting", 450, { effects: { input: 1 }, ...look(0.7, 0) })],
    affection: [step("curious", 450), step("delight", 900, { eyes: eyes("heart"), arms: { left: A.think, right: A.think } }), step("recover", 500, { eyes: { left: { closed: 1, arc: -12 } } })],
    toss: [step("curious", 550, { accessories: props("cube"), arms: { right: A.present } }), step("attentive", 600, { accessories: wear("cube", { x: -30, y: -58, rotate: 110 }), ...look(0.3, -0.9) }), step("surprise", 450, { accessories: wear("cube", { x: -10, y: -15, rotate: 190 }), arms: { right: A.open } }), step("confident", 650, { accessories: props("cube"), eyes: eyes("star") })],
    fold: [step("thinking", 700, { accessories: props("card"), arms: { left: A.think, right: A.think } }), step("confused", 500, { accessories: wear("plane", { rotate: 35 }) }), step("deep_focus", 550, { accessories: wear("plane", { x: -30, rotate: -10 }) }), step("confident", 700, { accessories: props("plane"), arms: { right: A.present } })],
    balance: [step("curious", 500, { accessories: props("cube") }), step("tense", 650, { accessories: wear("cube", { x: -55, y: -70, rotate: -9 }), body: { rotate: -8 } }), step("tense", 550, { accessories: wear("cube", { x: -45, y: -65, rotate: 13 }), body: { rotate: 8 } }), step("surprise", 500, { accessories: props("cube"), arms: { right: A.open } })],
    cup: [step("waiting", 500, { accessories: wear("cup", { y: 20 }), arms: { left: A.think, right: A.think } }), step("calm", 1100, { accessories: props("cup"), eyes: { left: { lower: 0.3 }, right: { lower: 0.3 } } }), step("relief", 700, { accessories: props("cup") })],
    tidy: [step("confused", 400, { body: { rotate: -10 } }), step("recover", 500, { arms: { left: A.think }, body: { rotate: 6 } }), step("recover", 500, { arms: { right: A.think }, body: { rotate: -4 } }), step("confident", 400)],
    mimic: [step("curious", 500), step("attentive", 600, { arms: { right: A.open } }), step("curious", 450), step("delight", 550)],
    compare: [step("scan_left", 600, { accessories: wear("card", { x: -30, rotate: -12 }) }), step("scan_right", 650, { accessories: wear("card", { x: 5, rotate: 12 }) }), step("double_check", 700, { accessories: props("card", "glasses"), arms: { right: A.think } }), step("focus", 450)],
    trace: [step("deep_focus", 550, { accessories: props("card") }), step("idea_trace", 800, { accessories: props("card"), arms: { right: A.point }, ...look(-0.6, 0.3) }), step("scan_right", 700, { accessories: wear("card", { rotate: -8 }), ...look(0.6, 0.3) }), step("focus", 450)],
    organize: [step("context_sort", 600, { accessories: wear("card", { x: -26, rotate: -20 }), arms: { left: A.think } }), step("deep_focus", 600, { accessories: wear("card", { x: -10, y: -8, rotate: 10 }), arms: { right: A.think } }), step("context_sort", 650, { accessories: wear("card", { rotate: 0 }), arms: { right: A.present } }), step("focus", 450)],
    inspect: [step("curious", 550, { accessories: wear("lens", { y: 10 }) }), step("double_check", 850, { accessories: wear("lens", { x: -22, y: -8 }), arms: { right: A.think }, ...look(-0.5, 0.3) }), step("deep_focus", 650, { accessories: wear("lens", { x: -8, y: -4 }), ...look(0.4, 0.2) }), step("focus", 450)],
    detective: [step("thinking", 600, { accessories: props("detectiveHat", "lens") }), step("curious", 850, { accessories: wear("lens", { x: -22, y: -8 }), arms: { right: A.think } }), step("curious", 700, { accessories: props("detectiveHat", "lens"), ...look(0.7, 0) }), step("micro_confirm", 450)],
    drums: [step("focus", 350, { arms: { left: A.think, right: A.down } }), step("focus", 350, { arms: { left: A.down, right: A.think } }), step("steady", 300), step("delight", 650, { arms: { left: A.open, right: A.open } })],
    cards: [step("focus", 600, { accessories: wear("card", { rotate: -10 }), arms: { left: A.think } }), step("confused", 450, { accessories: wear("card", { rotate: 15 }) }), step("deep_focus", 750, { accessories: props("card"), arms: { right: A.think } }), step("micro_confirm", 450)],
    paint: [step("curious", 600, { accessories: props("beret", "brush", "card") }), step("focus", 800, { accessories: { ...props("beret", "card"), ...wear("brush", { x: -26, rotate: -35 }) }, arms: { right: A.think } }), step("curious", 700, { accessories: props("beret", "brush", "drawing"), body: { rotate: -10 } }), step("delight", 650, { accessories: props("beret", "drawing"), eyes: eyes("star") })],
    rain: [step("surprise", 400, { eyes: eyes("dot") }), step("cautious", 850, { accessories: props("umbrella"), arms: { right: A.up, left: A.present } }), step("curious", 800, { accessories: wear("umbrella", { rotate: -12 }), ...look(-0.6, -0.5) }), step("relief", 650, { accessories: props("umbrella") })],
    gift: [step("curious", 650, { accessories: props("gift") }), step("surprise", 650, { accessories: { ...wear("gift", { y: 10 }), ...wear("spark", { x: -40, y: -30 }) }, eyes: eyes("star") }), step("delight", 800, { accessories: props("gift", "beret"), eyes: eyes("heart") }), step("micro_confirm", 550, { accessories: props("gift") })],
    failed: [step("surprise", 300), step("confused", 650, { effects: { error: 1 } }), step("cautious", 700, { effects: { error: 1 }, arms: { right: A.present } })],
    wake: [step("fatigue", 300, { eyes: { left: { closed: 0, upper: 0 }, right: { closed: 1 } } }), step("surprise", 300, { eyes: eyes("dot") }), step("attentive", 550)],
    greet: [step("curious", 350), step("recover", 750, { arms: { right: A.up }, eyes: { left: { closed: 1, arc: -12 } } })]
  };
  const POOLS = { running: ["research", "ponder", "cards", "compare", "trace", "organize", "inspect"], idle: ["caught", "stretch", "shades", "magic", "dance", "toss", "fold", "balance", "cup", "detective", "drums", "paint", "mimic", "tidy"], paused: ["cup", "stretch", "nap"], queued: ["cards", "ponder", "organize"] };
  const duration = name => (CLIPS[name] || []).reduce((sum, frame) => sum + frame.duration, 0);
  POOLS.running.push("keyboard", "receive");
  const replies = {
    wink_ack: ["单眼回应", "wide_listen", "wink_left", "soften"],
    double_blink: ["左右眨眼", "wink_left", "wink_right", "wide_listen"],
    nod_hello: ["点头招呼", "chin_up", "nod_down", "soften"],
    head_tilt: ["歪头听你说", "side_peek", "curious_split", "wide_listen"],
    glasses_tap: ["扶眼镜回应", "peek_over", "amused", "squint_focus"],
    shy_reply: ["有点害羞", "tiny_eyes", "shy_squint", "soften"],
    side_inspect: ["侧目观察", "side_peek", "brow_raise", "squint_focus"],
    listen_close: ["认真听着", "wide_listen", "chin_up", "nod_down"],
    eye_follow: ["眼神追踪", "curious_split", "side_peek", "wide_listen"],
    peek_back: ["偷偷看回来", "shy_squint", "side_peek", "wink_right"],
    slow_smile: ["慢慢笑起来", "soften", "smile_arc", "amused"],
    finger_wave: ["小小招手", "wide_listen", "proud_soft", "wink_left"],
    puff_hold: ["鼓起来撑住", "puff_cheeks", "tiny_eyes", "soften"],
    brace_hold: ["伸手挡一下", "guarded", "brace_play", "side_peek"],
    squish_hold: ["挤眼装镇定", "brace_play", "amused", "soften"],
    patient_hold: ["耐心等松手", "flat_stare", "brow_raise", "nod_down"],
    spring_back: ["松手回弹", "puff_cheeks", "chin_up", "smile_arc"],
    smooth_landing: ["轻轻落稳", "hang_loose", "nod_down", "soften"],
    shake_off: ["扶正再看你", "wind_squint", "wink_right", "proud_soft"],
    glance_back: ["目送后回头", "side_peek", "sleepy_peek", "squint_focus"],
    present_note: ["递出任务资料", "wide_listen", "proud_soft", "nod_down"],
    point_note: ["示意看任务", "curious_split", "brow_raise", "squint_focus"],
    glasses_peek: ["从镜框上看你", "peek_over", "wink_left", "squint_focus"],
    back_to_work: ["收到继续工作", "nod_down", "soften", "squint_focus"]
  };
  const LABELS = {};
  for (const [name, [label, ...poses]] of Object.entries(replies)) {
    LABELS[name] = label;
    CLIPS[name] = poses.map((pose, index) => step(pose, [300, 450, 350][index], {
      ...(name === "present_note" || name === "point_note" ? { accessories: props("card"), arms: { right: name === "point_note" ? A.point : A.present } } : {}),
      ...(name === "glasses_tap" ? { accessories: wear("glasses", { y: index === 1 ? 8 : 0 }), arms: { right: A.think } } : {})
    }));
  }
  const REACTIONS = {
    // Panel motion is mandatory semantic feedback, not a random idle reaction.
    click: ["wink_ack", "double_blink", "nod_hello", "head_tilt", "glasses_tap", "shy_reply", "shades", "magic"],
    hover: ["side_inspect", "listen_close", "eye_follow", "peek_back", "slow_smile", "finger_wave"],
    dwell: ["listen_close", "glasses_peek", "slow_smile", "head_tilt", "shy_reply", "affection"],
    hold: ["puff_hold", "brace_hold", "squish_hold", "patient_hold"],
    release: ["spring_back", "smooth_landing", "shake_off", "glance_back"],
    panel: ["present_note", "point_note", "glasses_peek", "back_to_work"],
    return: ["finger_wave", "wink_ack", "peek_back", "nod_hello", "shy_reply", "shades"],
    leave: ["glance_back", "back_to_work", "smooth_landing", "peek_back"]
  };
  const PLAYFUL = new Set(["shy_reply", "slow_smile", "peek_back", "affection", "spring_back"]);
  CLIPS.panel_takeout=[step('curious',320,{arms:{right:A.think}}),step('micro_confirm',420,{accessories:props('card'),arms:{right:A.present}}),step('neutral',360,{accessories:props('card'),arms:{right:A.point}})];
  CLIPS.panel_putaway=[step('neutral',320,{accessories:props('card'),arms:{right:A.present}}),step('calm',360,{accessories:props('card'),arms:{right:A.think}}),step('neutral',360)];
  LABELS.panel_takeout='取出并展示面板';LABELS.panel_putaway='接回并收好面板';
  REACTIONS.press = REACTIONS.click.filter(name => name !== "shades" && name !== "magic");
  REACTIONS.hold_pose = REACTIONS.hold;
  REACTIONS.drag = REACTIONS.release;
  const RARE = new Set(["shades", "magic"]);
  const PROP_ROUTINES={
    notebook:[['read_notes','翻阅笔记','deep_focus',A.think,-8],['compare_notes','核对笔记','double_check',A.point,8],['remember_notes','回想记录','thinking',A.think,-14],['close_notes','合上笔记','micro_confirm',A.down,0]],
    pencil:[['write_notes','认真写几笔','focus',A.think,18],['pencil_think','转笔推敲','thinking',A.question,-28],['pencil_point','圈出重点','attentive',A.point,35],['pencil_stow','整理文具','calm',A.down,0]],
    hourglass:[['sand_watch','观察流沙','curious',A.present,-8],['sand_turn','翻转沙漏','thinking',A.grip,180],['sand_wait','耐心等待','waiting',A.present,0],['sand_check','看一眼时间','side_peek',A.think,12]],
    stamp:[['stamp_ready','准备印章','attentive',A.grip,-12],['stamp_check','检查印章','double_check',A.think,25],['stamp_done','盖章收工','complete',A.down,0],['stamp_clean','擦拭印章','calm',A.think,-8]],
    flag:[['flag_ready','举起小旗','attentive',A.up,-12],['flag_wave','挥旗示意','input',A.up,18],['flag_cheer','摇旗庆祝','delight',A.open,-18],['flag_stow','卷起小旗','calm',A.down,0]]
  };
  for(const [prop,routines] of Object.entries(PROP_ROUTINES))for(const [id,label,expression,arm,rotation] of routines){
    LABELS[id]=label;
    CLIPS[id]=[
      step('curious',260,{arms:{right:A.think},accessories:wear(prop,{opacity:0,y:18,scale:.55})}),
      step('attentive',340,{arms:{right:A.present},accessories:wear(prop,{y:4,rotate:-10})}),
      step(expression,650,{arms:{right:arm},accessories:wear(prop,{rotate:rotation}),gaze:{x:.45,y:.35}}),
      step(expression,450,{arms:{right:arm},accessories:wear(prop,{rotate:rotation-8,y:3}),body:{rotate:-3}}),
      step('micro_confirm',300,{arms:{right:A.think},accessories:wear(prop,{opacity:.35,y:18,scale:.6})}),
      step('neutral',250)
    ];
  }
  POOLS.idle.push("slow_smile", "peek_back", "glasses_peek", "glance_back");
  const EMOTION_ROUTES={explore:'running',deliberate:'running',achievement:'idle',anxious:'queued',closeness:'idle',playful:'idle',anticipation:'queued',recovery:'paused',setback:'paused',astonished:'idle',caring:'idle',mixed:'idle'};
  for(const [id,emotion] of Object.entries(Rig.EMOTIONS)){
    LABELS[id]=emotion.label;
    const quiet={effects:{complete:0,input:0,error:0}};
    CLIPS[id]=[step('attentive',280,quiet),step(id,650,quiet),step(id,450,{...quiet,gaze:{x:0,y:.1}}),step('calm',300,quiet)];
    POOLS[EMOTION_ROUTES[emotion.group]].push(id);
    if(['closeness','playful','caring','astonished'].includes(emotion.group))REACTIONS.hover.push(id);
    if(['closeness','achievement','mixed'].includes(emotion.group))REACTIONS.click.push(id);
    if(['anxious','anticipation','setback'].includes(emotion.group))REACTIONS.hold.push(id);
    if(emotion.group==='recovery')REACTIONS.release.push(id);
  }
  const SPECIAL_ROUTES={overload:'running',eureka:'running',covert:'running',caught_red:'idle',unravel:'paused',composed:'running',smug:'idle',companion:'idle',juggling:'running',expectant:'queued',understood:'running',gingerly:'queued',bashful:'idle',jubilant:'idle',apologetic:'paused'};
  for(const [id,meta] of Object.entries(Rig.SPECIALS)){
    LABELS[id]=meta.label;
    CLIPS[id]=[step('attentive',420,{effects:{complete:0,input:0,error:0}}),step(id,1400,{effects:{complete:0,input:0,error:0}}),step(id,1800,{effects:{complete:0,input:0,error:0}}),step('calm',720,{effects:{complete:0,input:0,error:0}})];
    POOLS[SPECIAL_ROUTES[id.replace('special_','')]||'idle'].push(id);
  }
  POOLS.running.push('read_notes','compare_notes','remember_notes','write_notes','pencil_think','pencil_point');
  POOLS.queued.push('sand_watch','sand_turn','sand_wait','sand_check');
  POOLS.idle.push('close_notes','pencil_stow','stamp_ready','stamp_check','stamp_clean','flag_ready','flag_stow');
  const LIFECYCLE={started:['research','receive','prepare','keyboard'],joined:['prepare'],completed:['hero','deliver','finish_check','pack_up','stamp_done','flag_cheer'],failed:['failed'],attention:['attention','flag_wave'],stopped:['pack_up']};
  const PERFORMANCES = {
    started:['start_card','start_scan','start_idea','start_inspect','start_wave'],
    completed:['done_flag','done_shades','done_stamp','done_report','done_bow','done_surprise','done_present'],
    attention:['help_offer','help_pause','help_shy'],
    failed:['help_review','help_retry']
    ,running:['work_write','work_sort','work_think','work_wait','work_breathe','work_reset']
  };
  const authored = {
    start_card:['认真接单',['special_gingerly','special_expectant','special_understood','focus']],
    start_scan:['扫描任务',['special_composed','special_overload','special_understood','deep_focus']],
    start_idea:['点亮思路',['special_covert','special_eureka','special_understood','focus']],
    start_inspect:['谨慎验单',['special_gingerly','special_covert','special_understood','focus']],
    start_wave:['招手开工',['special_bashful','special_expectant','special_companion','focus']],
    done_flag:['举旗交付',['special_expectant','special_jubilant','special_smug','special_companion']],
    done_shades:['墨镜收工',['special_composed','special_smug','special_bashful','special_smug']],
    done_stamp:['盖章确认',['special_gingerly','special_understood','special_smug','special_companion']],
    done_report:['递出成果',['special_covert','special_understood','special_smug','special_bashful']],
    done_bow:['礼貌谢幕',['special_smug','special_companion','special_bashful','special_companion']],
    done_surprise:['藏不住开心',['special_composed','special_covert','special_jubilant','special_bashful']],
    done_present:['等待你查看',['special_expectant','special_gingerly','special_covert','special_companion']],
    help_offer:['递出疑问',['special_gingerly','special_expectant','special_covert','special_gingerly']],
    help_pause:['收手等指示',['special_composed','special_expectant','special_gingerly','special_companion']],
    help_shy:['不好意思打扰',['special_bashful','special_covert','special_expectant','special_gingerly']],
    help_review:['仔细复盘',['special_apologetic','special_covert','special_composed','special_gingerly']],
    help_retry:['整理好再来',['special_apologetic','special_composed','special_understood','special_gingerly']],
    work_write:['写下再推敲',['special_composed','focus','special_covert','special_understood']],
    work_sort:['卡片归位',['special_juggling','special_gingerly','special_covert','focus']],
    work_think:['悬笔思考',['special_composed','special_covert','special_eureka','focus']],
    work_wait:['观察流沙',['special_expectant','special_gingerly','special_covert','special_companion']],
    work_breathe:['从容陪伴',['special_companion','special_covert','special_companion','focus']],
    work_reset:['忙中缓口气',['special_overload','special_composed','special_companion','focus']]
  };
  // Hand-space and object-space trajectories are authored per score, not sampled
  // from previous clips. Back-layer reach -> present -> use -> put away.
  const hand=(right,left=A.none,body={},gaze={x:.3,y:.2})=>({arms:{right,left},body,gaze});
  const object=(prop,values,pose)=>Rig.merge(pose,{accessories:wear(prop,values)});
  const reach=(prop)=>object(prop,{back:1,y:16,scale:.7},hand(A.grip));
  const trajectories={
    start_card:[reach('card'),object('card',{y:4,rotate:-12},hand(A.present)),object('card',{rotate:4},hand(A.point,A.none,{rotate:4})),object('card',{y:18,scale:.65,back:1},hand(A.think))],
    start_scan:[hand(A.down,A.down,{cy:68}),hand(A.point,A.none,{rotate:-5},{x:-.8,y:.2}),hand(A.open,A.point,{rotate:5},{x:.8,y:.2}),hand(A.think,A.none,{cy:64})],
    start_idea:[reach('pencil'),object('pencil',{y:-10,rotate:25},hand(A.up)),object('pencil',{rotate:45},hand(A.point)),object('pencil',{y:15,back:1},hand(A.think))],
    start_inspect:[reach('lens'),object('lens',{x:-12,y:-10},hand(A.think)),object('lens',{x:12,y:4},hand(A.present)),object('lens',{back:1,y:16},hand(A.grip))],
    start_wave:[hand(A.open),hand(A.up,A.none,{rotate:-7}),hand(A.open,A.none,{rotate:5}),hand(A.down)],
    done_flag:[reach('flag'),object('flag',{rotate:-15},hand(A.up)),object('flag',{rotate:18},hand(A.open)),object('flag',{back:1,y:22,scale:.6},hand(A.think))],
    done_shades:[reach('shades'),object('shades',{y:0},hand(A.think,A.none,{rotate:-9})),object('shades',{y:12,rotate:9},hand(A.question)),object('shades',{y:24,back:1},hand(A.down))],
    done_stamp:[reach('stamp'),object('stamp',{y:-20},hand(A.up)),object('stamp',{y:10},hand(A.down,A.none,{cy:68})),object('stamp',{y:20,back:1},hand(A.grip,A.none,{cy:64}))],
    done_report:[reach('notebook'),object('notebook',{rotate:-8},hand(A.present)),object('notebook',{rotate:5},hand(A.point)),object('notebook',{back:1,y:22,scale:.7},hand(A.think))],
    done_bow:[hand(A.open,A.open,{cy:62}),hand(A.think,A.think,{cy:70,rotate:6}),hand(A.rest,A.rest,{cy:64,rotate:0}),hand(A.present)],
    done_surprise:[hand(A.rest,A.rest),hand(A.think,A.none,{}, {x:.8,y:0}),object('spark',{x:-20,y:-26},hand(A.up,A.up,{cy:60})),hand(A.open,A.none,{cy:64,rotate:7})],
    done_present:[reach('card'),object('card',{x:4},hand(A.present)),object('card',{rotate:6},hand(A.point,A.none,{}, {x:.8,y:.1})),object('card',{back:1,y:18,scale:.7},hand(A.think))],
    help_offer:[reach('card'),object('card',{},hand(A.present)),object('card',{rotate:-8},hand(A.open)),object('card',{back:1,y:20},hand(A.think))],
    help_pause:[hand(A.brace,A.brace),hand(A.think,A.think,{cy:66}),hand(A.open,A.none,{rotate:5}),hand(A.present)],
    help_shy:[hand(A.think),hand(A.grip,A.none,{rotate:-6},{x:.8,y:0}),hand(A.open,A.none,{rotate:4}),hand(A.present)],
    help_review:[reach('lens'),object('lens',{x:-12,y:-8},hand(A.think)),object('lens',{x:10,y:4},hand(A.present)),object('lens',{y:18,back:1},hand(A.grip))],
    help_retry:[object('pencil',{rotate:55},hand(A.down)),object('pencil',{rotate:0},hand(A.think)),object('pencil',{rotate:-20},hand(A.point)),object('pencil',{back:1,y:18},hand(A.grip))],
    work_write:[reach('pencil'),object('pencil',{rotate:25,x:4},hand(A.present)),object('pencil',{rotate:-15,y:-8},hand(A.think)),object('pencil',{y:16,back:1},hand(A.grip))],
    work_sort:[object('card',{x:-18,rotate:-18},hand(A.present,A.present)),object('card',{x:18,rotate:18},hand(A.open)),object('card',{y:-9,rotate:0},hand(A.think)),object('card',{y:18,back:1},hand(A.down))],
    work_think:[reach('pencil'),object('pencil',{rotate:50,y:-16},hand(A.think,A.none,{}, {x:-.5,y:-.6})),object('pencil',{rotate:10,y:-5},hand(A.point)),object('pencil',{back:1,y:18},hand(A.grip))],
    work_wait:[reach('hourglass'),object('hourglass',{rotate:180},hand(A.present)),object('hourglass',{rotate:0},hand(A.present,A.none,{}, {x:.6,y:.5})),object('hourglass',{back:1,y:16},hand(A.grip))],
    work_breathe:[hand(A.rest,A.rest,{cy:66}),hand(A.rest,A.rest,{cy:63,rotate:-3}),hand(A.rest,A.rest,{cy:66,rotate:0}),hand(A.think,A.none,{cy:64})],
    work_reset:[hand(A.brace,A.think,{rotate:-4}),hand(A.down,A.down,{rotate:4}),hand(A.rest,A.rest,{cy:68,rotate:0}),hand(A.think,A.none,{cy:64})]
  };
  for(const [key,[label,beats]] of Object.entries(authored)){
    const id='performance_'+key;
    LABELS[id]=label;
    CLIPS[id]=beats.map((expression,index)=>({...step(expression,[520,1050,1250,900][index],Rig.merge(trajectories[key][index],{effects:{complete:0,input:0,error:0},performance:{bob:0,sway:0,tilt:0,wave:0,squash:0}})),transition:[400,650,700,700][index],phase:['prepare','act','hold','stow'][index]}));
    CLIPS[id].push({...step('calm',600,{effects:{complete:0,input:0,error:0}}),transition:550,phase:'exit'});
  }
  for(const [kind,names] of Object.entries(PERFORMANCES)){
    const target = kind==='running' ? POOLS.running : LIFECYCLE[kind];
    names.forEach(name=>target.push('performance_'+name));
  }
  const THEATERS={};
  const stories=[
    ['notes','认真做笔记','running',['read_notes','write_notes','remember_notes','close_notes']],
    ['insight','灵感推演','running',['ponder','trace','pencil_think','write_notes']],
    ['sorting','资料整理员','running',['cards','compare','organize','close_notes']],
    ['investigate','放大镜调查','running',['detective','inspect','caught','inspect']],
    ['pen','转笔想问题','running',['pencil_think','balance','caught','write_notes']],
    ['workstation','小小工作站','running',['receive','keyboard','stretch','keyboard','pack_up']],
    ['sand','耐心等流沙','queued',['sand_watch','sand_wait','ponder','sand_turn']],
    ['busy','假装很忙','idle',['caught','read_notes','side_inspect','compare_notes','close_notes']],
    ['pancake','无聊变扁饼','idle',['emotion_anticipation_1','squish_hold','puff_hold','spring_back']],
    ['doze','午后打盹','paused',['nap','emotion_recovery_0','wake','tidy']],
    ['exercise','一套伸展操','idle',['stretch','dance','brace_hold','smooth_landing']],
    ['airplane','纸飞机练习','idle',['fold','toss','glance_back','tidy']],
    ['balance','方块平衡挑战','idle',['toss','balance','caught','proud_soft']],
    ['portrait','小画家自画像','idle',['paint','side_inspect','paint','shy_reply']],
    ['magic','魔术练习失误','idle',['magic','confused','caught','magic']],
    ['masks','面具试衣间','idle',['shy_reply','head_tilt','slow_smile','wink_ack']],
    ['star','墨镜小明星','idle',['shades','head_tilt','shades','tidy']],
    ['proud','完成后的邀功','retained',['present_note','point_note','shy_reply','back_to_work']],
    ['patient','克制的小赌气','retained',['emotion_anticipation_0','patient_hold','point_note','glance_back']],
    ['companion','安静陪你工作','running',['quiet_progress','listen_close','glance_back','soften']]
  ];
  for(const [key,label,route,parts] of stories){
    const name='theater_'+key;
    const frames=parts.flatMap((part,index)=>{
      if(CLIPS[part]) {
        const stages = CLIPS[part].slice();
        // Short clips reset to base; only the final chapter should put everything away.
        if (index < parts.length - 1) {
          while (stages.length > 1 && ['neutral','calm','focus','micro_confirm','steady'].includes(stages.at(-1).expression) && !Object.values(stages.at(-1).pose?.accessories || {}).some(p => p.opacity > 0)) stages.pop();
        }
        return stages;
      }
      if(!Rig.EXPRESSIONS[part])throw new Error('Unknown theater stage: '+part);
      return [step(part,800)];
    }).map(f=>({expression:f.expression,duration:f.duration,pose:Rig.merge(structuredClone(f.pose||{}),{effects:{complete:0,input:0,error:0}})}));
    // Preserve the story's object when reusing the physical toss/balance gestures.
    for(const frame of frames){
      if(frame.pose.accessories?.cube&&['airplane','pen'].includes(key)){
        frame.pose.accessories[key==='airplane'?'plane':'pencil']=frame.pose.accessories.cube;
        delete frame.pose.accessories.cube;
      }
    }
    const persistent = {
      notes:['notebook','pencil'], insight:['pencil'], sorting:['card'],
      investigate:['lens','detectiveHat'], pen:['pencil'], workstation:['card'],
      sand:['hourglass'], busy:['notebook'], doze:['pillow'], airplane:['plane'],
      balance:['cube'], portrait:['beret','drawing'], magic:['topHat','wand'],
      star:['shades'], proud:['notebook'], patient:['notebook']
    }[key] || [];
    const held = {};
    for (const frame of frames) {
      const visible = Rig.merge(Rig.getExpression(frame.expression),frame.pose).accessories;
      for (const prop of persistent) {
        if (visible[prop]?.opacity > 0) held[prop] = structuredClone(visible[prop]);
        else if (held[prop]) frame.pose = Rig.merge(frame.pose,{accessories:{[prop]:held[prop]}});
      }
    }
    frames.push(step('calm',500));
    const total=frames.reduce((n,f)=>n+f.duration,0);
    frames.forEach(f=>f.duration=Math.round(f.duration/total*15000));
    frames.at(-1).duration+=15000-frames.reduce((n,f)=>n+f.duration,0);
    if(key==='masks'){frames[Math.floor(frames.length*.2)].mask='shy';frames[Math.floor(frames.length*.6)].mask='cool';frames.at(-1).mask=null;}
    CLIPS[name]=frames;LABELS[name]=label;THEATERS[name]={label,route,duration:15000};
  }
  function theaterFrames(name, variant = 0) {
    const frames = structuredClone(CLIPS[name]);
    if (!THEATERS[name] || !variant) return frames;
    // Vary the acting, not the story's object or its meaningful task signals.
    frames.slice(1,-1).forEach((frame,index) => {
      if (index % 3 !== 1 || frame.mask) return;
      const base = Rig.merge(Rig.getExpression(frame.expression), frame.pose);
      frame.pose = Rig.merge(frame.pose, {
        gaze: { x: variant === 1 ? -.45 : .45, y: .15 },
        body: { rotate: base.body.rotate + (variant === 1 ? -3 : 3) }
      });
    });
    return frames;
  }
  const family=name=>{
    const props=new Set((CLIPS[name]||[]).flatMap(f=>Object.entries(f.pose.accessories||{}).filter(([,v])=>v.opacity>0).map(([k])=>k)));
    for(const [family,items] of [['magic',['topHat','wand']],['art',['brush','drawing','beret']],['play',['cube','plane']],['rest',['cup','pillow','sleepHat','hourglass']],['inspect',['lens','detectiveHat']],['work',['glasses','card','notebook','pencil','stamp']],['signal',['flag']],['costume',['shades','cape']]])if(items.some(p=>props.has(p)))return family;
    return 'gesture';
  };
  function chooseActivity(names,random,previous){
    const alternatives=names.filter(name=>name!==previous?.name);
    if(alternatives.length)names=alternatives;
    const groups={};for(const name of names)(groups[family(name)]||=[]).push(name);
    const keys=Object.keys(groups),weights=keys.map(k=>(k===previous?.family ? 0.25 : 1)/(1+(previous?.recentFamilies||[]).filter(f=>f===k).length));
    let r=random()*weights.reduce((a,b)=>a+b,0),key=keys.at(-1);
    for(let i=0;i<keys.length;i++){r-=weights[i];if(r<0){key=keys[i];break;}}
    const pool=groups[key];return pool?.[Math.min(pool.length-1,Math.floor(random()*pool.length))];
  }
  return { CLIPS, POOLS, LIFECYCLE, PERFORMANCES, THEATERS, theaterFrames, duration, LABELS, REACTIONS, PLAYFUL, RARE, family,chooseActivity, poseFor: name => Rig.getExpression(name) };
});
