(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MetaBotAppearance = api;
})(typeof self !== 'undefined' ? self : globalThis, function() {
  const SKINS = {green:['#02AD45','#87F8AD'],ocean:['#249AD9','#A0EDFF'],sunset:['#F58C40','#FFE0A2'],pink:['#ED83B6','#FFD9EA'],violet:['#9872DE','#E0CAFF'],lemon:['#EDCB42','#FFF5AE'],night:['#536178','#AEBFD8'],neon:['#54DAB9','#CB98FF']};
  const SHAPES = ['circle','square','triangle','pentagon','hexagon','star','drop','capsule','cloud','diamond','flower','blob','pancake','bean','bell','kite','cushion','spring'];
  const EYE_PRESETS = {
    classic:{label:'经典圆眼',group:'base'},
    anime:{label:'动漫亮眼',group:'base',design:{iris:1,shine:1,secondary:1,anime:1}},
    almond:{label:'柔和杏眼',group:'base',eye:{width:1,height:.85,kx:.75,ky:.3},pupil:{width:.94,height:.94}},
    bean:{label:'豆豆圆瞳',group:'base',eye:{width:.88,height:.88},pupil:{width:1.3,height:1.16}},
    retro:{label:'复古动画眼',group:'base',eye:{width:.9,height:1.08},pupil:{width:1.12,height:1.16},design:{retro:1}},
    glass:{label:'清透玻璃眼',group:'base',eye:{width:1,height:.98},design:{iris:1,shine:1,tone:1},pupil:{width:.85,height:.88}},
    manga:{label:'手绘漫画眼',group:'base',eye:{width:1,height:.88,kx:.65,ky:.33},design:{rim:1},pupil:{width:1.08,height:1}},
    soft_square:{label:'软方机械眼',group:'base',eye:{width:.9,height:.91,kx:.88,ky:.88},pupil:{width:.94,height:.86},design:{shine:.55}},
    pixel:{label:'精品像素眼',group:'base',eye:{width:.96,height:.94},design:{pixel:1,shine:1},pupil:{width:1,height:.92}},
    droplet:{label:'水滴幼态眼',group:'base',eye:{width:1,height:1.06,kx:.7,ky:.6,bottomK:.32},pupil:{width:1.08,height:1.07},design:{shine:.8}},
    focus:{label:'专注锐眼',group:'emotion',base:'almond',mood:{upper:.2,lower:.02,tilt:5}},
    crescent:{label:'温柔月牙眼',group:'emotion',base:'almond',mood:{lower:.16,arc:-8}},
    curious:{label:'好奇探头眼',group:'emotion',base:'classic',mood:{asymmetry:.12}},
    sleepy:{label:'困倦半眠眼',group:'emotion',base:'almond',mood:{upper:.46,lower:.03},tempo:1.7},
    shy:{label:'害羞躲闪眼',group:'emotion',base:'droplet',mood:{lower:.1,tilt:-3},gaze:{x:-.45,y:.3},tempo:1.6},
    smug:{label:'得意挑眼',group:'emotion',base:'manga',mood:{upper:.1,lower:.04,asymmetry:.06,oneLid:.18}},
    astonished:{label:'惊讶定睛眼',group:'emotion',base:'classic',mood:{widen:.12,pupil:.76}},
    tender:{label:'委屈含光眼',group:'emotion',base:'glass',mood:{lower:.06,tilt:-7},design:{tear:1},gaze:{x:0,y:.24},tempo:1.6}
  };
  const EYE_STYLES = Object.keys(EYE_PRESETS);
  const LEGACY_EYES = {minimal:'bean',neon:'glass',ink:'manga',asymmetric:'curious'};
  const normalizeEye = id => Object.hasOwn(EYE_PRESETS,id)?id:Object.hasOwn(LEGACY_EYES,id)?LEGACY_EYES[id]:'auto';
  const EYE_CONTEXT = {
    deep_focus:'focus',squint_focus:'focus',thinking:'focus',code:'focus',
    curious:'curious',curious_split:'curious',brow_raise:'curious',side_peek:'curious',
    complete:'crescent',relief:'crescent',soften:'crescent',proud_soft:'smug',
    sleepy_peek:'sleepy',fatigue:'sleepy',shy_squint:'shy',surprise:'astonished',wide_listen:'astonished',
    emotion_setback_1:'tender',emotion_closeness_0:'shy',emotion_recovery_0:'sleepy',
    emotion_achievement_1:'smug',emotion_achievement_3:'crescent'
  };
  function eyeConfig(expression,appearance={},authored='classic') {
    const selected=normalizeEye(appearance.eyeStyle),explicit=selected!=='auto';
    const authoredId=normalizeEye(authored),context=EYE_PRESETS[authoredId]?.group==='emotion'?authoredId:EYE_CONTEXT[expression];
    const id=explicit?selected:normalizeEye(ART_STYLES[appearance.artStyle]?.eye||(EYE_PRESETS[authoredId]?.group==='base'?authoredId:'classic'));
    const emotion=EYE_PRESETS[id]?.group==='emotion'?id:context;
    const baseId=EYE_PRESETS[id]?.base||id;
    const base=EYE_PRESETS[baseId]||EYE_PRESETS.classic,detail=EYE_PRESETS[emotion]||{};
    return {id,baseId,emotion,eye:base.eye||{},pupil:base.pupil||{},design:{...base.design,...detail.design},mood:detail.mood||{},gaze:explicit?detail.gaze:null,tempo:detail.tempo||1};
  }
  const ART_STYLES = {
    classic:{label:'经典',eye:null,shape:null,tempo:1,amplitude:1},
    mime:{label:'无声默剧',eye:'bean',shape:null,tempo:1.15,amplitude:.7},
    clay:{label:'黏土软团',eye:'classic',shape:'blob',tempo:1.2,amplitude:.8},
    paper:{label:'折纸伙伴',eye:'almond',shape:'diamond',tempo:1.1,amplitude:.7},
    doodle:{label:'手绘涂鸦',eye:'manga',shape:null,tempo:1.05,amplitude:.9},
    pixel:{label:'像素掌机',eye:'pixel',shape:'square',tempo:1.1,amplitude:.8},
    rubber:{label:'橡皮管',eye:'retro',shape:null,tempo:1.1,amplitude:1.15}
  };
  const PERSONALITIES={quiet:{label:'安静搭档',interval:1.5,tempo:1.1,social:.45},attentive:{label:'认真助手',interval:1,tempo:1,social:.7},playful:{label:'俏皮伙伴',interval:.85,tempo:1.05,social:1}};
  const COMPANION_MODES={quiet:{label:'安静',personality:'quiet',motion:'soft'},natural:{label:'自然',personality:'attentive',motion:'full'},lively:{label:'活泼',personality:'playful',motion:'full'}};
  function normalizeBase(value = {}) {
    return {eyeStyle:normalizeEye(value.eyeStyle),skin: value.skin==='auto'||Object.hasOwn(SKINS,value.skin) ? value.skin : 'lemon', shape: ['morph','random',...SHAPES].includes(value.shape) ? value.shape : 'morph', motion:['full','soft','reduced'].includes(value.motion) ? value.motion : 'full', emoji:value.emoji !== false, masks:value.masks !== false, maskAuto:value.maskAuto !== false, maskStyle:['sticker','paper','holo'].includes(value.maskStyle)?value.maskStyle:'sticker', maskFrequency:['rare','normal','lively'].includes(value.maskFrequency)?value.maskFrequency:'normal', particles:value.particles !== false, random:value.random !== false};
  }
  function normalize(value={}) {
    const companionMode=Object.hasOwn(COMPANION_MODES,value.companionMode)?value.companionMode:value.personality==='quiet'||value.motion==='soft'?'quiet':value.personality==='playful'?'lively':'natural';
    const reducedMotion=value.reducedMotion===true||(value.reducedMotion==null&&value.motion==='reduced');
    return {...normalizeBase(value),schemaVersion:2,artStyle:Object.hasOwn(ART_STYLES,value.artStyle)?value.artStyle:'auto',companionMode,reducedMotion,motion:reducedMotion?'reduced':COMPANION_MODES[companionMode].motion,personality:COMPANION_MODES[companionMode].personality,stories:value.stories!==false};
  }
  function migrate(value={}) {
    // Older releases persisted the default classic style without recording user intent.
    return normalize(value.schemaVersion===2?value:{...value,artStyle:value.artStyle==='classic'?'auto':value.artStyle});
  }

  function createDirector(value={},options={}) {
    const now=options.now||Date.now,random=options.random||Math.random;
    let preferences=normalize(value),current={},due={},history={},counts={},events=[];
    const ranges={artStyle:[120000,300000],eyeStyle:[30000,90000],shape:[10000,20000],skin:[180000,480000]};
    const draw=()=>Math.max(0,Math.min(.999999,Number(random())||0));
    const automatic=key=>key==='shape'?['morph','random'].includes(preferences.shape):preferences[key]==='auto';
    function pick(key,candidates,preferred) {
      const recent=history[key]||[],fresh=candidates.filter(id=>!recent.slice(-2).includes(id));
      const available=fresh.length?fresh:candidates.filter(id=>id!==current[key]);
      const choices=available.length?available:candidates;
      const weight=id=>(id===preferred?1.6:1)/(1+(counts[key]?.[id]||0)*.35);
      let cursor=draw()*choices.reduce((sum,id)=>sum+weight(id),0);
      const id=choices.find(id=>(cursor-=weight(id))<0)||choices.at(-1);
      history[key]=[...recent,id].slice(-8);counts[key]||={};counts[key][id]=(counts[key][id]||0)+1;
      return id;
    }
    function change(key,expression,time) {
      const art=ART_STYLES[current.artStyle]||ART_STYLES.classic;
      const candidates=key==='artStyle'?Object.keys(ART_STYLES):key==='skin'?Object.keys(SKINS):key==='eyeStyle'?Object.keys(EYE_PRESETS).filter(id=>EYE_PRESETS[id].group==='base'&&(current.artStyle!=='pixel'||['pixel','soft_square','classic','bean'].includes(id))):preferences.shape==='random'?SHAPES:pool(expression);
      current[key]=automatic(key)?pick(key,candidates,key==='eyeStyle'?art.eye:key==='shape'?art.shape:null):preferences[key];
      due[key]=time+ranges[key][0]+draw()*(ranges[key][1]-ranges[key][0]);
      events.push({key,value:current[key],at:time});events=events.slice(-40);
    }
    function sample({expression='neutral',boundary=true,blocked=false,force=false}={}) {
      const time=now();
      for(const key of Object.keys(ranges))if(!current[key])change(key,expression,time);
      // Only one automatic dimension changes per safe boundary; never catch up in a burst.
      if(force){for(const key of Object.keys(ranges))if(automatic(key))change(key,expression,time);}
      else if(boundary&&!blocked&&!preferences.reducedMotion){
        const key=Object.keys(ranges).filter(key=>automatic(key)&&time>=due[key]).sort((a,b)=>due[a]-due[b])[0];
        if(key)change(key,expression,time);
      }
      return {...preferences,...current};
    }
    return {sample,configure(value){
      const next=normalize(value);
      for(const key of Object.keys(ranges))if(next[key]!==preferences[key]){delete current[key];delete due[key];}
      preferences=next;
    },snapshot:()=>({preferences:{...preferences},current:{...current},due:{...due},history:JSON.parse(JSON.stringify(history)),counts:JSON.parse(JSON.stringify(counts)),events:events.map(e=>({...e}))})};
  }
  function points(name) {
    return Array.from({length:120},(_,i)=>{
      const a = -Math.PI/2+i*Math.PI*2/120;
      let r=1;
      const n={square:4,triangle:3,pentagon:5,hexagon:6,diamond:4}[name];
      if(n) { const angle=((a+Math.PI/2+Math.PI/n)%(2*Math.PI/n)+2*Math.PI/n)%(2*Math.PI/n)-Math.PI/n; r=Math.cos(Math.PI/n)/Math.cos(angle); r=.55+.45*r; }
      if(name==='star') r=.82+.18*Math.cos(5*(a+Math.PI/2));
      if(name==='flower') r=.91+.09*Math.cos(6*a);
      if(name==='cloud') r=.91+.09*Math.cos(3*a);
      if(name==='blob') r=.92+.05*Math.sin(3*a)+.03*Math.cos(5*a);
      if(name==='drop') r=.87+.13*Math.sin(a);
      if(name==='bean')r=.84+.12*Math.sin(a)+.04*Math.cos(2*a);
      if(name==='bell')r=.83+.15*Math.sin(a);
      if(name==='kite')r=.8+.12*Math.cos(2*a)+.06*Math.sin(a);
      if(name==='cushion')r=.91-.08*Math.cos(4*a);
      if(name==='spring')r=.85+.1*Math.cos(6*a);
      if(name==='pancake')return {x:Math.cos(a)*.98,y:Math.sin(a)*.63};
      return {x:Math.cos(a)*r*(name==='capsule'?1:.98),y:Math.sin(a)*r*(name==='capsule'?.78:.98)};
    });
  }
  function path(name,b,from=name,t=1) {
    const p=points(name), q=points(from);
    return p.map((v,i)=>`${i?'L':'M'} ${(b.cx+b.rx*(q[i].x+(v.x-q[i].x)*t)).toFixed(2)} ${(b.cy+b.ry*(q[i].y+(v.y-q[i].y)*t)).toFixed(2)}`).join(' ')+' Z';
  }
  function pool(expression) {
    if(/special_(overload|composed|gingerly|apologetic)/.test(expression))return ['triangle','drop','diamond'];
    if(/special_(eureka|understood|jubilant|smug)/.test(expression))return ['star','flower','circle'];
    if(/special_(companion|bashful|covert)/.test(expression))return ['bean','cloud','circle'];
    if(/special_(expectant|juggling)/.test(expression))return ['capsule','square','hexagon'];
    if(/recovery|anticipation/.test(expression))return ['pancake','bean','capsule'];
    if(/achievement/.test(expression))return ['star','kite','diamond'];
    if(/deliberate/.test(expression))return ['square','cushion','hexagon'];
    if(/anxious|astonished/.test(expression))return ['bell','triangle','drop'];
    if(/playful|explore/.test(expression))return ['spring','blob','cloud'];
    if(/complete|victory|delight|celebrat|star/.test(expression)) return ['star','flower','circle'];
    if(/error|frustrat|confus|input|tense/.test(expression)) return ['triangle','diamond','drop'];
    if(/focus|scan|think|steady|code/.test(expression)) return ['square','hexagon','pentagon','capsule'];
    return ['circle','cloud','blob','drop'];
  }
  return {SKINS,SHAPES,EYE_STYLES,EYE_PRESETS,LEGACY_EYES,eyeConfig,normalizeEye,ART_STYLES,PERSONALITIES,COMPANION_MODES,normalize,migrate,createDirector,points,path,pool};
});
