(function (root, factory) {
  const rig = factory();
  if (typeof module === "object" && module.exports) module.exports = rig;
  else root.MetaBotM1Rig = rig;
})(typeof self !== "undefined" ? self : globalThis, function () {
  const COLORS = Object.freeze({ body: "#02AD45", eyes: "#F3F6F2", ink: "#181B20", attention: "#F4BE4F", error: "#F0645D" });
  const SYMBOLS = Object.freeze(["star", "heart", "spiral", "squeeze", "flat", "cross", "dot", "tear"]);
  const ACCESSORIES = Object.freeze(["glasses", "shades", "topHat", "wand", "cape", "sleepHat", "pillow", "beret", "brush", "card", "cube", "spark", "plane", "cup", "detectiveHat", "lens", "umbrella", "gift", "drawing", "notebook", "pencil", "hourglass", "stamp", "flag"]);
  const eye = (cx) => ({ cx, cy: 54, rx: 18, ry: 21, rotate: 0, upper: 0, lower: 0, closed: 0, arc: 3, symbols: Object.fromEntries(SYMBOLS.map(name => [name, 0])) });
  const arm = (x = 9, y = 91, bendX = 8, bendY = 85, opacity = 1) => ({ x, y, bendX, bendY, opacity });
  const ARMS = {
    none: arm(13, 86, 12, 83, 0), rest: arm(), open: arm(6, 59, 2, 77),
    up: arm(12, 32, 1, 56), brace: arm(11, 56, 3, 77), down: arm(14, 105, 6, 98),
    think: arm(32, 70, 4, 97), question: arm(9, 51, 1, 75), retry: arm(12, 46, 3, 72),
    point: arm(8, 43, 2, 71), salute: arm(24, 35, 3, 65), grip: arm(12, 61, 4, 83),
    trail: arm(8, 109, 3, 98), push: arm(6, 58, 3, 76), present: arm(4, 63, 5, 83)
  };
  const BASE = {
    body: { cx: 64, cy: 64, rx: 52, ry: 52, curve: 0.55228475, topShift: 0, bottomShift: 0, topInset: 0, bottomInset: 0, leftInset: 0, rightInset: 0, rotate: 0 },
    eyes: { left: eye(43), right: eye(85) },
    pupils: { left: { rx: 9, ry: 11 }, right: { rx: 9, ry: 11 } },
    gaze: { x: 0, y: 0.12 },
    arms: { left: ARMS.none, right: ARMS.none },
    effects: { complete: 0, input: 0, error: 0 },
    accessories: Object.fromEntries(ACCESSORIES.map(name => [name, { opacity: 0, x: 0, y: 0, rotate: 0, scale: 1, back:0 }])),
    performance: { bob: 0, sway: 0, tilt: 0, wave: 0, squash: 0, cycles: 2 },
    eyeStyle: 'classic',
    eyeDesign: { anime:0,manga:0,minimal:0,pixel:0,neon:0,ink:0,sleepy:0,asymmetric:0 },
    accents: { blush: 0, sweat: 0, glint: 0, stress: 0 },
    breathe: 0.003
  };

  function merge(target, source) {
    const output = { ...target };
    for (const [key, value] of Object.entries(source || {})) {
      output[key] = value && typeof value === "object" && !Array.isArray(value)
        ? merge(target?.[key] || {}, value) : value;
    }
    return output;
  }

  const both = (value) => ({ left: value, right: value });
  const CORE = {
    neutral: {},
    calm: { eyes: both({ upper: 0.06 }), breathe: 0.002 },
    focus: { gaze: { x: 0.28, y: 0.22 }, eyes: both({ upper: 0.04 }), body: { rx: 54, ry: 50 }, breathe: 0.003 },
    deep_focus: { gaze: { x: 0.4, y: 0.3 }, body: { rotate: 4, rx: 55, ry: 49 }, eyes: both({ upper: 0.12 }) },
    scan_left: { body: { rotate: -6 }, gaze: { x: -0.85, y: -0.1 }, performance: { sway: 2, tilt: 3, cycles: 1 } },
    scan_right: { body: { rotate: 6 }, gaze: { x: 0.85, y: -0.1 }, performance: { sway: -2, tilt: -3, cycles: 1 } },
    curious: { body: { rotate: 11, rx: 49, ry: 55 }, eyes: { left: { rx: 20, ry: 25, cy: 51 }, right: { rx: 16, ry: 18, cy: 56 } }, gaze: { x: 0.3, y: -0.4 }, arms: { left: ARMS.think }, performance: { bob: 2, tilt: 5, cycles: 1 } },
    thinking: { body: { rotate: -9 }, eyes: { left: { upper: 0.25 }, right: { ry: 23 } }, gaze: { x: -0.5, y: -0.65 }, arms: { left: ARMS.think }, performance: { tilt: 4, cycles: 1 } },
    confident: { body: { rx: 54, ry: 50 }, eyes: both({ lower: 0.28 }), arms: { left: ARMS.open, right: ARMS.open }, performance: { bob: 3, tilt: 3 } },
    steady: { gaze: { x: 0.1, y: 0.12 }, breathe: 0.0015 },
    delight: { eyes: both({ closed: 1, arc: -15, cy: 54 }), body: { cy: 61, rx: 55, ry: 49 }, arms: { left: ARMS.open, right: ARMS.open }, performance: { bob: 7, tilt: 5, wave: 9, squash: 0.045 } },
    victory: { body: { cy: 62, rx: 49, ry: 55 }, eyes: both({ closed: 1, arc: -17 }), arms: { left: ARMS.up, right: ARMS.up }, effects: { complete: 1 }, performance: { bob: 8, tilt: 7, wave: 12, squash: 0.05 } },
    surprise: { eyes: both({ rx: 20, ry: 26, cy: 51 }), pupils: both({ rx: 5, ry: 6 }), body: { rx: 47, ry: 57 }, gaze: { x: 0, y: 0 }, arms: { left: ARMS.brace, right: ARMS.brace }, performance: { bob: 5, squash: 0.045, cycles: 1 } },
    confused: { body: { rotate: -12 }, eyes: { left: { rx: 16, ry: 16, upper: 0.2, cy: 57 }, right: { rx: 20, ry: 25, cy: 51 } }, gaze: { x: -0.45, y: -0.3 }, arms: { right: ARMS.question }, performance: { tilt: 7, wave: 6, cycles: 1 } },
    cautious: { eyes: both({ ry: 18, upper: 0.1 }), gaze: { x: 0.55, y: -0.2 }, body: { rx: 56, ry: 48, cy: 66 }, arms: { left: ARMS.brace } },
    tense: { body: { rx: 48, ry: 56 }, eyes: both({ ry: 25 }), pupils: both({ rx: 6.5, ry: 8 }), arms: { left: ARMS.brace, right: ARMS.brace }, performance: { sway: 2, tilt: 2, cycles: 3 } },
    frustrated: { eyes: both({ upper: 0.4 }), gaze: { x: -0.3, y: 0.5 }, body: { cy: 68, rx: 56, ry: 48, rotate: -5 }, arms: { left: ARMS.down, right: ARMS.down }, effects: { error: 1 }, performance: { tilt: 6, cycles: 2 } },
    retry: { body: { rotate: 6 }, gaze: { x: 0.5, y: -0.3 }, arms: { right: ARMS.retry }, performance: { bob: 3, wave: 10 } },
    fatigue: { body: { cy: 70, rx: 57, ry: 46, rotate: -5 }, eyes: both({ upper: 0.55, closed: 1, arc: 7 }), gaze: { x: 0, y: 0.5 }, arms: { left: ARMS.down, right: ARMS.down }, performance: { bob: -2, tilt: 4, cycles: 1 }, breathe: 0.006 },
    relief: { eyes: both({ closed: 0.95, arc: -8 }), body: { cy: 66, rx: 55, ry: 49 }, arms: { left: ARMS.rest, right: ARMS.rest }, performance: { bob: -3, squash: 0.025, cycles: 1 }, breathe: 0.004 },
    input: { body: { cy: 62, rx: 49, ry: 55, rotate: 7 }, eyes: both({ ry: 24, lower: 0.12 }), gaze: { x: 0.65, y: -0.4 }, arms: { right: ARMS.point }, effects: { input: 1 }, performance: { bob: 4, tilt: 5, wave: 18 } },
    waiting: { eyes: both({ upper: 0.08 }), gaze: { x: 0, y: 0.15 }, breathe: 0.002 },
    complete: { body: { cy: 61, rx: 51, ry: 53, rotate: -7 }, eyes: { left: { closed: 1, arc: -14 }, right: { lower: 0.22, ry: 23 } }, arms: { left: ARMS.open, right: ARMS.salute }, effects: { complete: 1 }, performance: { bob: 6, tilt: 6, wave: 18, squash: 0.035 } },
    recover: { eyes: both({ lower: 0.12 }), gaze: { x: 0.15, y: 0 } }
  };
  const INTERACTION = {
    attentive: { body: { cy: 62, rx: 49, ry: 55 }, gaze: { x: 0.2, y: -0.3 }, eyes: both({ ry: 24 }), performance: { bob: 4, cycles: 1 } },
    pressed: { eyes: both({ lower: 0.2, ry: 19 }), arms: { left: ARMS.open, right: ARMS.open }, breathe: 0 },
    hold: { body: { rotate: 5 }, eyes: { left: { lower: 0.25 }, right: { ry: 24 } }, gaze: { x: 0, y: -0.6 }, arms: { right: ARMS.grip }, performance: { tilt: 4, cycles: 1 }, breathe: 0 },
    lifted: { eyes: both({ ry: 25 }), pupils: both({ rx: 7, ry: 9 }), arms: { left: ARMS.grip, right: ARMS.trail }, breathe: 0 },
    slow_drag: { arms: { right: ARMS.grip }, breathe: 0 },
    fast_drag: { eyes: both({ ry: 24, upper: 0.12 }), pupils: both({ rx: 7, ry: 9 }), arms: { left: ARMS.trail, right: ARMS.trail }, breathe: 0 },
    sharp_turn: { body: { rotate: -9 }, eyes: { left: { closed: 0.95, arc: -9 }, right: { ry: 25 } }, arms: { left: ARMS.brace, right: ARMS.brace }, breathe: 0 },
    orbit: { body: { rotate: 12 }, eyes: { left: { ry: 24 }, right: { closed: 1, arc: -12 } }, arms: { left: ARMS.open, right: ARMS.up }, performance: { tilt: 12, wave: 15 }, breathe: 0 },
    edge_impact: { body: { rightInset: 3, rx: 53, ry: 51 }, arms: { right: ARMS.push }, breathe: 0 },
    edge_left: { body: { leftInset: 3, rx: 53, ry: 51 }, arms: { left: ARMS.push }, breathe: 0 },
    edge_right: { body: { rightInset: 3, rx: 53, ry: 51 }, arms: { right: ARMS.push }, breathe: 0 },
    edge_top: { body: { topInset: 3, rx: 51, ry: 53 }, gaze: { x: 0, y: -0.35 }, breathe: 0 },
    edge_bottom: { body: { bottomInset: 3, rx: 51, ry: 53 }, gaze: { x: 0, y: 0.35 }, breathe: 0 },
    landing: { body: { cy: 68, rx: 56, ry: 48 }, eyes: both({ closed: 0.85, arc: -10 }), arms: { left: ARMS.open, right: ARMS.open }, breathe: 0 },
    panel: { body: { rotate: 6 }, gaze: { x: 0.65, y: 0 }, arms: { right: ARMS.present }, performance: { wave: 10, cycles: 1 } },
    refreshing: { gaze: { x: -0.6, y: -0.4 }, body: { rotate: -7 }, eyes: { left: { ry: 24 }, right: { ry: 19 } }, arms: { left: ARMS.think }, performance: { tilt: 5, cycles: 1 } }
  };
  const WORKING = {
    context_sort: { body: { rotate: -5 }, eyes: { left: { ry: 23 }, right: { ry: 20 } }, gaze: { x: -0.6, y: 0.15 }, arms: { left: ARMS.think }, performance: { tilt: 4, cycles: 1 } },
    micro_confirm: { body: { cy: 65.5 }, eyes: both({ lower: 0.25 }), gaze: { x: 0.15, y: 0.3 }, performance: { bob: -5, cycles: 1 } },
    idea_trace: { body: { rotate: 8, rx: 49, ry: 55 }, eyes: both({ ry: 24 }), gaze: { x: 0.5, y: -0.65 }, arms: { right: ARMS.point }, performance: { bob: 4, wave: 8, cycles: 1 } },
    double_check: { body: { rotate: -7 }, eyes: { left: { ry: 24 }, right: { ry: 18 } }, gaze: { x: -0.6, y: 0.25 }, performance: { tilt: 6, cycles: 2 } },
    multi_split: { gaze: { x: 0.5, y: 0.1 } },
    external_wait: CORE.waiting,
    fatigue_reset: CORE.relief,
    refocus: CORE.focus,
    cautious_retry: CORE.retry,
    quiet_progress: { gaze: { x: 0.3, y: 0.1 }, breathe: 0.002 }
  };
  const CORE_EXPRESSION_NAMES = Object.freeze(Object.keys(CORE));
  const SOCIAL = {
    wink_left: { eyes: { left: { closed: 1, arc: -12 }, right: { lower: 0.2 } }, body: { rotate: -3 } },
    wink_right: { eyes: { right: { closed: 1, arc: -12 }, left: { lower: 0.2 } }, body: { rotate: 3 } },
    smile_arc: { eyes: both({ closed: 1, arc: -10 }), arms: { right: ARMS.open } },
    side_peek: { eyes: { left: { upper: 0.35 }, right: { ry: 24 } }, gaze: { x: -0.65, y: 0 }, body: { rotate: -4 } },
    brow_raise: { eyes: { left: { ry: 25, cy: 51 }, right: { upper: 0.35, ry: 18 } }, arms: { right: ARMS.question } },
    shy_squint: { eyes: both({ lower: 0.4, ry: 18 }), gaze: { x: -0.3, y: 0.5 }, arms: { left: ARMS.think } },
    tiny_eyes: { eyes: both({ symbols: { dot: 1 } }), arms: { left: ARMS.brace } },
    wide_listen: { eyes: both({ ry: 25 }), pupils: both({ rx: 7, ry: 9 }), arms: { right: ARMS.open } },
    nod_down: { body: { cy: 67, rx: 53, ry: 49 }, eyes: both({ lower: 0.3 }), gaze: { x: 0, y: 0.5 } },
    chin_up: { body: { cy: 62 }, eyes: both({ lower: 0.2 }), gaze: { x: 0, y: -0.5 } },
    puff_cheeks: { body: { rx: 56, ry: 48 }, eyes: both({ ry: 16 }), arms: { left: ARMS.open, right: ARMS.open } },
    guarded: { eyes: both({ upper: 0.45 }), arms: { left: ARMS.push, right: ARMS.push } },
    soften: { eyes: both({ lower: 0.35, ry: 19 }), arms: { right: ARMS.rest } },
    curious_split: { eyes: { left: { ry: 25 }, right: { ry: 16, lower: 0.3 } }, body: { rotate: 4 }, gaze: { x: 0.5, y: -0.2 } },
    amused: { eyes: { left: { closed: 1, arc: -8 }, right: { lower: 0.4 } }, arms: { right: ARMS.think } },
    flat_stare: { eyes: both({ symbols: { flat: 1 } }), arms: { left: ARMS.down, right: ARMS.down } },
    squint_focus: { eyes: both({ upper: 0.3, lower: 0.18 }), gaze: { x: 0.3, y: 0.2 } },
    peek_over: { accessories: { glasses: { opacity: 1, y: 12 } }, eyes: both({ ry: 24 }), gaze: { x: 0, y: -0.4 } },
    brace_play: { eyes: both({ symbols: { squeeze: 1 } }), arms: { left: ARMS.brace, right: ARMS.brace } },
    hang_loose: { eyes: both({ lower: 0.2 }), arms: { left: ARMS.down, right: ARMS.grip } },
    wind_squint: { eyes: { left: { upper: 0.18, lower: 0.16, rotate: -6 }, right: { closed: 1, arc: -9, rotate: 6 } }, gaze: { x: 0.3, y: -0.1 }, arms: { left: ARMS.trail, right: ARMS.trail } },
    dizzy_peek: { eyes: { left: { symbols: { spiral: 1 } }, right: { closed: 1, arc: 7 } }, arms: { right: ARMS.think } },
    proud_soft: { eyes: both({ lower: 0.35 }), arms: { right: ARMS.salute }, body: { cy: 63 } },
    sleepy_peek: { eyes: { left: { upper: 0.55 }, right: { closed: 1, arc: 6 } }, gaze: { x: 0.4, y: 0.2 } }
  };
  const EMOTION_GROUPS = {
    explore: ['探头|发现线索|恍然大悟|跃跃欲试|追根究底', ['curious','side_peek','brow_raise','attentive','curious_split']],
    deliberate: ['凝视|推敲|权衡|回想|灵感闪现', ['deep_focus','thinking','double_check','scan_left','idea_trace']],
    achievement: ['胸有成竹|得意|骄傲|满足|邀功', ['confident','amused','proud_soft','relief','chin_up']],
    anxious: ['忐忑|警觉|犹豫|担忧|松一口气', ['tense','wide_listen','cautious','guarded','relief']],
    closeness: ['害羞|信任|亲近|欢迎|默契', ['shy_squint','soften','smile_arc','wink_left','wink_right']],
    playful: ['偷笑|装无辜|恶作剧|故作严肃|被抓包', ['amused','tiny_eyes','side_peek','flat_stare','surprise']],
    anticipation: ['期待|无聊|不耐烦|赌气|克制催促', ['attentive','flat_stare','puff_cheeks','guarded','waiting']],
    recovery: ['困倦|走神|疲惫|打起精神|伸懒腰', ['sleepy_peek','scan_right','fatigue','refocus','recover']],
    setback: ['懊恼|委屈|尴尬|不服气|重新振作', ['frustrated','tiny_eyes','shy_squint','cautious_retry','retry']],
    astonished: ['吓一跳|不可置信|茫然|震惊|看傻了', ['surprise','brow_raise','confused','wide_listen','tiny_eyes']],
    caring: ['关切|安慰|鼓励|体贴|安心守候', ['wide_listen','soften','nod_down','side_peek','calm']],
    mixed: ['累但开心|害羞又得意|好奇又害怕|着急但克制|无奈又配合', ['sleepy_peek','proud_soft','curious_split','tense','flat_stare']]
  };
  const EMOTIONS = {}, emotionPoses = {}, originals={...CORE,...INTERACTION,...WORKING,...SOCIAL};
  for(const [group,[labels,bases]] of Object.entries(EMOTION_GROUPS))labels.split('|').forEach((label,i)=>{
    const id=`emotion_${group}_${i}`;
    EMOTIONS[id]={label,group,base:bases[i]};
    emotionPoses[id]=merge(originals[bases[i]],{
      body:{rotate:[-7,5,-3,8,0][i],cy:[64,62,66,61,65][i]},
      gaze:{x:[-.45,.5,-.2,.15,0][i],y:[-.3,-.15,.3,-.45,.15][i]},
      eyes:{left:{rotate:[-5,2,0,-3,0][i]},right:{rotate:[3,-4,0,4,0][i]}},
      performance:{bob:group==='recovery'?1:2,tilt:i%2?2:-2,cycles:1}
    });
    if(group==='mixed')emotionPoses[id]=merge(emotionPoses[id],{eyes:{right:merge(originals[['smile_arc','shy_squint','guarded','squint_focus','wink_right'][i]]?.eyes?.right||{}, {rotate:3})}});
  });
  emotionPoses.emotion_anticipation_3=merge(emotionPoses.emotion_anticipation_3,{body:{rx:56,ry:48},eyes:both({upper:.35}),arms:{left:ARMS.think,right:ARMS.think}});
  emotionPoses.emotion_setback_1=merge(emotionPoses.emotion_setback_1,{eyes:both({lower:.3,rotate:-3}),body:{rx:48,ry:53},gaze:{x:0,y:.65}});
  emotionPoses.emotion_caring_1=merge(emotionPoses.emotion_caring_1,{arms:{right:ARMS.present},gaze:{x:.55,y:.05},body:{rotate:4}});
  // Authored poses, not aliases of the core catalog. No synthetic task signal.
  const SPECIAL = {
    overload: ['认真过载','neon',{eyes:both({upper:.4}),gaze:{x:.45,y:.3},accents:{sweat:1,stress:.5},arms:{left:ARMS.think,right:ARMS.brace}}],
    eureka: ['灵光一现','anime',{eyes:both({ry:25}),pupils:both({rx:7,ry:9}),body:{rx:49,ry:55,cy:61},accents:{glint:1},arms:{right:ARMS.point}}],
    covert: ['偷偷观察','asymmetric',{eyes:{left:{upper:.65},right:{ry:25}},gaze:{x:-.85,y:0},body:{rotate:-4},arms:{left:ARMS.grip}}],
    caught_red: ['被抓包','manga',{eyes:both({ry:25}),pupils:both({rx:5,ry:6}),accents:{blush:1,sweat:.5},body:{rx:48,ry:55,cy:67},arms:{left:ARMS.brace,right:ARMS.brace}}],
    unravel: ['有点晕乎','pixel',{eyes:both({symbols:{spiral:1}}),body:{rx:56,ry:48,rotate:8},arms:{left:ARMS.down,right:ARMS.down},accents:{stress:.7}}],
    composed: ['强装镇定','ink',{eyes:both({upper:.36}),gaze:{x:.6,y:.25},accents:{sweat:1},arms:{left:ARMS.grip,right:ARMS.grip},breathe:.006}],
    smug: ['得意邀功','manga',{eyes:{left:{upper:.5},right:{lower:.3}},gaze:{x:0,y:-.3},body:{rotate:-8,cy:61},accents:{blush:.55},arms:{right:ARMS.salute}}],
    companion: ['安心陪伴','minimal',{eyes:both({closed:1,arc:-8}),body:{cy:66},arms:{right:ARMS.rest},breathe:.005}],
    juggling: ['忙而不乱','pixel',{eyes:{left:{upper:.15},right:{lower:.2}},gaze:{x:.75,y:0},arms:{left:ARMS.open,right:ARMS.point},accents:{sweat:.45}}],
    expectant: ['翘首等候','anime',{eyes:both({ry:25,lower:.15}),gaze:{x:0,y:-.6},body:{rx:49,ry:54,cy:61},arms:{left:ARMS.grip,right:ARMS.grip}}],
    understood: ['突然理解','neon',{eyes:both({rotate:-8,lower:.15}),body:{cy:61,rotate:3},accents:{glint:.7},arms:{right:ARMS.open}}],
    gingerly: ['小心翼翼','ink',{eyes:both({upper:.18,rotate:5}),gaze:{x:.7,y:.4},body:{rotate:-5,rx:54,ry:50},arms:{left:ARMS.brace,right:ARMS.present}}],
    bashful: ['害羞躲闪','anime',{eyes:{left:{closed:.95,arc:-7},right:{lower:.32}},accents:{blush:1},gaze:{x:-.6,y:.4},body:{rotate:9},arms:{left:ARMS.think}}],
    jubilant: ['闪耀庆典','anime',{eyes:both({symbols:{star:1}}),accents:{glint:1,blush:.5},body:{cy:60,rx:50,ry:54},arms:{left:ARMS.up,right:ARMS.up}}],
    apologetic: ['认真致歉','sleepy',{eyes:both({upper:.4,rotate:-5}),gaze:{x:0,y:.7},body:{cy:69,rotate:2,rx:54,ry:50},arms:{left:ARMS.think,right:ARMS.think},accents:{sweat:.4}}]
  };
  const SIGNATURE_MOTION = {
    overload:{sway:1,tilt:1,cycles:3},eureka:{bob:3,tilt:2,cycles:1},covert:{tilt:-3,cycles:1},
    caught_red:{bob:2,squash:.018,cycles:1},unravel:{sway:3,tilt:5,squash:.02,cycles:2},
    composed:{sway:.8,cycles:3},smug:{bob:2,tilt:-3,cycles:1},companion:{bob:1,cycles:1},
    juggling:{sway:2,wave:4,cycles:2},expectant:{bob:2,squash:.01,cycles:1},understood:{bob:3,cycles:1},
    gingerly:{tilt:2,wave:2,cycles:1},bashful:{tilt:3,sway:1,cycles:1},jubilant:{bob:4,wave:6,cycles:2},apologetic:{bob:-2,tilt:2,cycles:1}
  };
  const SPECIALS = Object.fromEntries(Object.entries(SPECIAL).map(([key,[label,eyeStyle,pose]])=>['special_'+key,{label,eyeStyle,pose:merge(pose,{eyeStyle,performance:SIGNATURE_MOTION[key]})}]));
  const EXPRESSIONS = Object.freeze(Object.fromEntries(Object.entries({ ...originals,...emotionPoses,...Object.fromEntries(Object.entries(SPECIALS).map(([id,s])=>[id,s.pose])) }).map(([name, value]) => [name, merge(BASE, value)])));
  function getExpression(name) { return merge({}, EXPRESSIONS[name] || EXPRESSIONS.neutral); }

  function bodyPath(body) {
    const b = merge(BASE.body, body);
    const left = b.cx - b.rx + b.leftInset;
    const right = b.cx + b.rx - b.rightInset;
    const topX = b.cx + b.topShift;
    const bottomX = b.cx + b.bottomShift;
    const top = b.cy - b.ry + b.topInset;
    const bottom = b.cy + b.ry - b.bottomInset;
    const kx = b.rx * b.curve;
    const ky = b.ry * b.curve;
    return `M ${topX} ${top} C ${topX + kx} ${top} ${right} ${b.cy - ky} ${right} ${b.cy} C ${right} ${b.cy + ky} ${bottomX + kx} ${bottom} ${bottomX} ${bottom} C ${bottomX - kx} ${bottom} ${left} ${b.cy + ky} ${left} ${b.cy} C ${left} ${b.cy - ky} ${topX - kx} ${top} ${topX} ${top} Z`;
  }

  function eyePath(e) {
    const k = 0.55228475;
    return `M ${e.cx} ${e.cy - e.ry} C ${e.cx + e.rx * k} ${e.cy - e.ry} ${e.cx + e.rx} ${e.cy - e.ry * k} ${e.cx + e.rx} ${e.cy} C ${e.cx + e.rx} ${e.cy + e.ry * k} ${e.cx + e.rx * k} ${e.cy + e.ry} ${e.cx} ${e.cy + e.ry} C ${e.cx - e.rx * k} ${e.cy + e.ry} ${e.cx - e.rx} ${e.cy + e.ry * k} ${e.cx - e.rx} ${e.cy} C ${e.cx - e.rx} ${e.cy - e.ry * k} ${e.cx - e.rx * k} ${e.cy - e.ry} ${e.cx} ${e.cy - e.ry} Z`;
  }

  // In ellipse-normalized space, the center offset plus pupil radius stays inside 1.
  function constrainPupil(e, p, gaze) {
    const radius = Math.max(p.rx / e.rx, p.ry / e.ry);
    const travel = Math.max(0, 1 - radius - 0.09);
    const length = Math.max(1, Math.hypot(gaze.x, gaze.y));
    return { ...p, cx: e.cx + gaze.x / length * travel * e.rx, cy: e.cy + gaze.y / length * travel * e.ry };
  }

  function interpolate(from, to, amount) {
    if (typeof from === "number" && typeof to === "number") return from + (to - from) * amount;
    if (from && to && typeof from === "object" && typeof to === "object" && !Array.isArray(from) && !Array.isArray(to)) {
      const keys = new Set([...Object.keys(from), ...Object.keys(to)]);
      return Object.fromEntries([...keys].map((key) => [key, interpolate(from[key], to[key], amount)]));
    }
    return amount < 0.5 ? from : to;
  }
  return { COLORS, SYMBOLS, ACCESSORIES, ARMS, merge, CORE_EXPRESSION_NAMES, EXPRESSIONS, EMOTIONS, SPECIALS, getExpression, bodyPath, eyePath, constrainPupil, interpolate };
});
