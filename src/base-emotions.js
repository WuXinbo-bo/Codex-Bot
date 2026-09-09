(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MetaBotBaseEmotions=api;
})(typeof self!=='undefined'?self:globalThis,function(){
  const both=value=>({left:{...value},right:{...value}});
  const arms={rest:{x:9,y:91,bendX:8,bendY:85,opacity:1},near:{x:29,y:83,bendX:9,bendY:99,opacity:1},open:{x:7,y:69,bendX:3,bendY:81,opacity:1},down:{x:14,y:103,bendX:6,bendY:96,opacity:1}};
  // Each score authors a readable resting pose and a brief, non-looping second thought.
  function score(label,eyes,gaze,body,micro,accent=null,hand=null){
    return {label,pose:{eyes:both(eyes),gaze:{x:gaze[0],y:gaze[1]},body:{rotate:body[0],cy:64+body[1],rx:52+body[2],ry:52-body[2]},pupils:both({rx:9,ry:11}),
      micro:{gazeX:0,gazeY:0,nod:0,lean:0,left:0,right:0,rightLag:0,leftHand:0,rightHand:0,at:.26,span:.18,second:0,...micro},
      accents:accent?{[accent]:.65}:{},performance:{bob:0,sway:0,tilt:0,wave:0,squash:0,cycles:1},breathe:.002,
      ...(hand?{arms:{left:{...arms[hand]},right:{...arms[hand]}}}:{})}};
  }
  const families={
    calm:{label:'平静自在',tone:0,items:[
      score('放松呼吸',{upper:.08},[0,.1],[0,0,0],{nod:.8}),
      score('微眯安坐',{upper:.26,ry:19},[0,.2],[0,2,2],{left:.2,right:.2}),
      score('舒展慢眨',{lower:.12,ry:22},[0,-.1],[0,-1,-1],{left:.85,right:.85,span:.12}),
      score('侧头静观',{upper:.14},[.2,.08],[5,0,0],{gazeX:-.25,lean:-2})]},
    trust:{label:'安心信任',tone:1,items:[
      score('对视放松',{lower:.25},[0,0],[0,0,1],{left:.8,right:.8},'warmth'),
      score('安心靠近',{upper:.12,ry:22},[0,-.15],[2,-2,-1],{nod:-1.8},null,'rest'),
      score('合眼舒展',{closed:.9,arc:-8},[0,0],[0,1,2],{left:-.55,right:-.55},'softShine'),
      score('放心跟随',{upper:.18},[-.25,.1],[-3,1,1],{gazeX:.45},null,'down')]},
    focus:{label:'专注认真',tone:0,items:[
      score('窄眼定睛',{upper:.3,lower:.08,ry:20},[.35,.2],[2,0,1],{gazeX:-.12}),
      score('前倾凝视',{upper:.1,ry:23},[.15,.4],[4,-2,-1],{nod:1.4}),
      score('屏息细看',{upper:.22,lower:.14},[-.25,.2],[-2,-1,1],{gazeY:.2,second:1}),
      score('确认点头',{lower:.25,ry:20},[.2,.15],[0,0,0],{nod:2.2,gazeY:.18})]},
    thought:{label:'思考推敲',tone:0,items:[
      score('抬眼回想',{upper:.15},[-.35,-.6],[-5,0,0],{gazeX:.2},null,'near'),
      score('侧看停顿',{upper:.28,ry:20},[.65,-.1],[3,0,1],{gazeX:-.35,at:.45}),
      score('眯眼权衡',{upper:.36,lower:.1},[-.3,.1],[-7,1,0],{left:-.2,lean:2},'hesitation'),
      score('收手沉思',{upper:.22,ry:19},[0,.6],[0,2,1],{gazeY:-.35},null,'near')]},
    curious:{label:'好奇探索',tone:1,items:[
      score('歪头研究',{ry:24,lower:.08},[.4,-.2],[8,-1,-1],{left:.25,lean:-2}),
      score('向前探看',{ry:25},[0,-.3],[0,-3,-2],{nod:1.4},'softShine'),
      score('偷看回正',{upper:.28,ry:20},[-.65,.05],[-4,0,0],{gazeX:.6,lean:3}),
      score('追着线索',{lower:.1,ry:22},[.55,.2],[5,0,0],{gazeX:-.65,gazeY:-.25,second:1})]},
    doubt:{label:'疑惑求证',tone:-1,items:[
      score('停住求证',{upper:.16,ry:23},[0,-.2],[-8,0,-1],{left:.35},'question'),
      score('来回核对',{upper:.24},[-.5,.15],[0,1,1],{gazeX:.9,second:1}),
      score('退后细看',{upper:.38,lower:.08},[.35,0],[-4,3,2],{lean:3},'hesitation'),
      score('抬眼再确认',{upper:.12,ry:22},[0,.6],[3,2,0],{gazeY:-.7,nod:-1.5})]},
    expectant:{label:'期待盼望',tone:1,items:[
      score('眼亮起来',{ry:24,lower:.15},[0,-.35],[0,-2,-1],{nod:-1},'softShine'),
      score('向板轻倾',{upper:.1,ry:23},[.6,.15],[6,-1,0],{gazeX:-.2},null,'open'),
      score('捧手等候',{lower:.2,ry:22},[0,-.2],[0,-1,-1],{left:.3,right:.3},null,'near'),
      score('等你看看',{upper:.15},[.65,.2],[4,0,0],{gazeX:-.65,gazeY:-.3,second:1})]},
    happy:{label:'开心愉悦',tone:2,items:[
      score('弧眼轻浮',{closed:1,arc:-12},[0,0],[0,-2,1],{nod:-1.8},'blush'),
      score('睁眼含笑',{lower:.38,ry:21},[0,0],[2,-1,1],{left:.35,right:.35},'warmth'),
      score('笑意传开',{lower:.22,ry:22},[-.15,0],[-3,-1,0],{left:.8,right:.55},'softShine'),
      score('愉快点头',{lower:.3},[.1,.1],[0,-1,-1],{nod:2,second:1},null,'open')]},
    satisfied:{label:'满足欣慰',tone:1,items:[
      score('半闭眼放松',{upper:.38,lower:.12,ry:20},[0,.2],[0,2,2],{nod:1}),
      score('柔眼回看',{lower:.3,ry:20},[.5,.3],[4,1,1],{gazeX:-.3},'warmth'),
      score('闭眼回味',{closed:1,arc:-7},[0,.1],[-2,1,1],{left:-.65,right:-.65,at:.5}),
      score('舒心歇手',{upper:.2,lower:.12},[0,.2],[0,3,2],{lean:2},null,'down')]},
    confident:{label:'自信笃定',tone:1,items:[
      score('挺身对视',{lower:.24},[0,0],[0,-2,-1],{nod:1}),
      score('昂首笃定',{upper:.16,lower:.15},[0,-.4],[2,-3,0],{gazeY:.25}),
      score('从容摊手',{lower:.32,ry:20},[.25,0],[-4,0,1],{lean:2},null,'open'),
      score('点头认可',{lower:.2,ry:22},[0,.1],[0,-1,0],{nod:2.4,left:.25,right:.25})]},
    proud:{label:'得意邀功',tone:2,items:[
      score('斜眼等夸',{upper:.25,lower:.2},[-.55,-.1],[-6,-1,1],{gazeX:.35},'blush'),
      score('抬头等回应',{lower:.3},[0,-.4],[3,-3,0],{nod:1.4,at:.55}),
      score('藏不住得意',{lower:.35,ry:20},[.2,.05],[6,-1,1],{left:.55},'blushLines'),
      score('看看我的成果',{upper:.1,lower:.2},[.6,.35],[2,-1,0],{gazeX:-.7,gazeY:-.3},null,'open')]},
    surprised:{label:'惊讶意外',tone:0,items:[
      score('睁大后缓收',{ry:26},[0,0],[0,-2,-2],{left:.3,right:.3}),
      score('后撤一小步',{ry:24,upper:.04},[0,-.1],[-3,3,-1],{nod:-1.6},'pause'),
      score('慢半拍反应',{ry:22},[.25,0],[5,0,-1],{left:.5,right:.15,at:.18}),
      score('愣住再回神',{ry:25},[0,.15],[0,-1,-2],{nod:1.6,left:.4,right:.4,at:.55})]},
    wary:{label:'警觉戒备',tone:-1,items:[
      score('侧目锁定',{upper:.28,lower:.08},[.75,-.1],[4,1,1],{gazeX:-.12}),
      score('缩身观察',{upper:.15,ry:22},[-.35,-.2],[-3,3,2],{nod:-1},null,'near'),
      score('巡看再定睛',{upper:.22},[-.6,0],[0,1,1],{gazeX:1,second:1}),
      score('低身戒备',{upper:.38,ry:19},[.3,-.2],[-5,3,3],{lean:2},'coolShade')]},
    anxious:{label:'紧张担心',tone:-1,items:[
      score('捧手担心',{ry:24,upper:.08},[0,-.1],[0,-1,-2],{left:.25,right:.25},'sweat', 'near'),
      score('眼睑微颤',{upper:.22,ry:23},[.3,.15],[2,0,-1],{left:.25,right:.2,span:.1,second:1},'fineSweat'),
      score('不敢一直看',{upper:.12},[.5,0],[-3,1,0],{gazeX:-.85,gazeY:.25},'coolShade'),
      score('浅浅屏息',{ry:25},[0,.25],[0,-1,-2],{nod:1.3,at:.5},'pressure', 'near')]},
    hesitant:{label:'犹豫为难',tone:-1,items:[
      score('左右难选',{upper:.2},[-.45,.1],[-3,0,0],{gazeX:.9,second:1},'hesitation'),
      score('欲言又止',{upper:.25,lower:.1},[0,.2],[0,1,1],{nod:-1.5,at:.4},'pause', 'near'),
      score('想进又退',{upper:.15,ry:22},[.2,0],[4,-1,-1],{lean:-5,nod:2}),
      score('试探抬眼',{upper:.32,ry:20},[0,.6],[-2,2,0],{gazeY:-.65,left:-.15})]},
    shy:{label:'害羞腼腆',tone:1,items:[
      score('对视又躲开',{lower:.25,ry:20},[0,0],[2,1,0],{gazeX:-.6,gazeY:.35},'blush'),
      score('合眼侧身',{closed:1,arc:-8},[.2,.2],[7,1,1],{right:-1},'blushLines'),
      score('低头偷看',{upper:.3},[0,.6],[-4,2,0],{gazeY:-.65},'heat'),
      score('缩手慢眨',{lower:.28,ry:19},[-.2,.2],[3,2,1],{left:.65,right:.65,span:.13},'warmth','near')]},
    embarrassed:{label:'尴尬心虚',tone:-1,items:[
      score('僵住溜眼',{ry:23},[0,0],[0,0,-1],{gazeX:.7,at:.4},'sweat'),
      score('悄悄缩起来',{upper:.1,ry:22},[-.2,.4],[4,3,2],{nod:1.5},'heat','near'),
      score('装作没事',{upper:.3,lower:.08},[.5,0],[-2,1,1],{gazeX:-.55},'sweatSlide'),
      score('急眨掩饰',{upper:.08,ry:23},[0,.15],[2,0,0],{left:.95,right:.95,span:.08,second:1},'blushLines')]},
    sad:{label:'委屈失落',tone:-2,items:[
      score('低头失落',{upper:.32,rotate:-5},[0,.65],[0,3,1],{nod:1.2},'waterline'),
      score('含泪垂手',{lower:.15,ry:23,rotate:-4},[0,.35],[-3,2,0],{left:.2,right:.2},'tearBead','down'),
      score('收拢避视',{upper:.38,ry:20},[-.4,.5],[4,3,1],{gazeX:-.2},'coolShade','near'),
      score('努力撑着',{ry:23,upper:.12},[0,.2],[0,2,0],{left:.4,right:.4,at:.5},'waterline')]},
    frustrated:{label:'懊恼挫败',tone:-2,items:[
      score('沉下重心',{upper:.45,ry:19},[0,.45],[0,4,3],{nod:1},'pressure'),
      score('转开再回看',{upper:.3},[-.7,.2],[-5,2,1],{gazeX:.65,at:.5}),
      score('闭眼整理心情',{closed:1,arc:5},[0,.3],[2,2,2],{left:-.7,right:-.7,at:.55},null,'down'),
      score('缓慢振作',{upper:.4,ry:20},[0,.5],[0,4,3],{nod:-2.5,gazeY:-.3},'tired')]},
    sulky:{label:'不满赌气',tone:-1,items:[
      score('转身半眯眼',{upper:.42,ry:19},[-.7,0],[-7,1,1],{gazeX:.25},'annoyed'),
      score('鼓起来偷看',{upper:.3,lower:.08},[.5,.1],[3,2,4],{gazeX:-.45}),
      score('收手不说话',{upper:.4},[-.3,.35],[-4,2,1],{left:.25,right:.25},null,'near'),
      score('别过脸又回瞟',{upper:.3,ry:20},[.75,0],[7,1,0],{gazeX:-.8,at:.55},'pause')]},
    bored:{label:'无聊走神',tone:0,items:[
      score('半眼游神',{upper:.5,ry:19},[-.3,.25],[-3,2,2],{gazeX:.65,second:1}),
      score('盯空处回神',{upper:.22},[.65,-.3],[4,1,0],{gazeX:-.65,gazeY:.3,at:.55},'pause'),
      score('左右慢眨',{upper:.38},[0,.1],[0,2,1],{left:.65,right:.2,second:1}),
      score('重新聚焦',{upper:.48,ry:20},[0,.5],[-2,3,2],{gazeY:-.5,left:-.2,right:-.2},'tired')]},
    sleepy:{label:'困倦疲惫',tone:0,items:[
      score('眼皮渐重',{upper:.35,ry:19},[0,.4],[0,3,2],{left:.55,right:.55},'tired'),
      score('一眼还坚持',{upper:.4},[.2,.25],[4,2,1],{left:.8,right:.15,second:1}),
      score('点头再抬起',{closed:1,arc:5},[0,.5],[-3,4,2],{nod:2.2,left:-.8,right:-.8}),
      score('摊软歇一会',{upper:.55,ry:18},[0,.3],[2,4,4],{nod:-1.2},null,'down')]},
    caring:{label:'关切体贴',tone:1,items:[
      score('柔眼关切',{lower:.24,rotate:-3},[0,.1],[-3,0,0],{gazeY:.15},'softShine'),
      score('轻靠近你',{lower:.2,ry:22},[.25,.15],[5,-1,-1],{nod:1},null,'open'),
      score('耐心点头',{lower:.25},[0,.2],[0,1,1],{nod:2,second:1}),
      score('安静陪着',{upper:.2,lower:.12},[-.25,0],[-5,1,1],{left:.45,right:.45},'warmth')]},
    playful:{label:'顽皮试探',tone:1,items:[
      score('眯眼打主意',{lower:.2},[.6,-.1],[5,-1,0],{left:.6},'glint'),
      score('无辜偷瞄',{ry:24},[0,0],[-2,0,-1],{gazeX:-.65,at:.45}),
      score('假装很认真',{upper:.28,lower:.08},[0,.15],[0,0,1],{left:.35,lean:3}),
      score('探头再试一次',{lower:.15,ry:23},[-.4,-.1],[-7,-1,-1],{lean:5,gazeX:.45,second:1})]}
  };
  // Asymmetry is authored per expression, not a global random eye distortion.
  families.curious.items[0].pose.eyes.left.ry=25;families.curious.items[0].pose.eyes.right.ry=18;
  families.doubt.items[0].pose.eyes.left.upper=.42;
  families.thought.items[2].pose.eyes.right.upper=.08;
  families.proud.items[2].pose.eyes.left.closed=1;
  families.sleepy.items[1].pose.eyes.left.closed=1;
  families.happy.items[2].pose.micro.rightLag=.07;
  families.surprised.items[2].pose.micro.rightLag=.06;
  families.hesitant.items[1].pose.micro.rightHand=-10;
  families.confident.items[2].pose.micro.rightHand=-5;
  families.expectant.items[2].pose.micro.leftHand=-3;
  families.expectant.items[2].pose.micro.rightHand=-3;
  families.trust.items[3].pose.micro.rightHand=3;
  families.bored.items[2].pose.micro.rightLag=.12;
  for(const item of [families.surprised.items[1],families.anxious.items[0]])item.pose.pupils=both({rx:6,ry:8});
  const mixed=[
    ['happy_restrained','开心但克制','happy',score('开心但克制',{lower:.28},[0,.1],[0,-1,0],{left:.4,right:.4},'warmth')],
    ['shy_proud','害羞又得意','proud',score('害羞又得意',{lower:.3},[-.4,-.15],[5,-1,1],{gazeY:.5,left:.45},'blushLines')],
    ['curious_afraid','好奇又害怕','curious',score('好奇又害怕',{ry:24,upper:.12},[.5,-.15],[-5,2,-1],{lean:4,gazeX:-.25},'fineSweat')],
    ['sleepy_determined','困倦但坚持','sleepy',score('困倦但坚持',{upper:.5,ry:20},[0,.2],[0,2,1],{left:-.3,right:-.3,nod:-2},'tired')],
    ['urgent_polite','着急但礼貌','expectant',score('着急但礼貌',{ry:23,lower:.12},[.5,.15],[3,-1,-1],{gazeX:-.45,nod:1.2},'hesitation')],
    ['hurt_helpful','委屈但配合','sad',score('委屈但配合',{upper:.22,lower:.15,rotate:-4},[0,.4],[-3,2,0],{nod:1.6},'waterline','open')],
    ['worry_relief','担心后放心','trust',score('担心后放心',{upper:.18,ry:23},[0,.15],[0,1,-1],{left:.7,right:.7,nod:1.5},'softShine')],
    ['surprise_understood','惊讶后理解','thought',score('惊讶后理解',{ry:25},[.3,-.2],[2,-1,-1],{left:.35,right:.35,nod:1.8},'glint')],
    ['guilty_composed','心虚却装镇定','embarrassed',score('心虚却装镇定',{upper:.3},[0,0],[0,0,1],{gazeX:.55,at:.6},'sweatSlide')],
    ['praise_bashful','想被夸又害羞','proud',score('想被夸又害羞',{lower:.28,ry:21},[.5,.1],[4,-1,0],{gazeX:-.55,gazeY:.3},'heat','near')],
    ['close_considerate','想靠近又怕打扰','caring',score('想靠近又怕打扰',{lower:.2,ry:22},[-.3,.1],[-4,0,-1],{lean:3,nod:1},'warmth')],
    ['sulky_caring','赌气却偷偷关注','sulky',score('赌气却偷偷关注',{upper:.38},[.7,.1],[6,1,1],{gazeX:-.85,at:.6},'pause')]
  ];
  const entries={};
  for(const [family,group] of Object.entries(families))group.items.forEach((item,i)=>{
    const id=`base_${family}_${i+1}`;entries[id]={...item,id,family,tone:group.tone,mixed:false};
  });
  for(const [key,label,family,item] of mixed){const id=`base_${key}`;entries[id]={...item,id,label,family,tone:families[family].tone,mixed:true};}
  const routes={
    idle:['calm','trust','curious','thought','expectant','happy','satisfied','confident','proud','surprised','shy','embarrassed','bored','sleepy','caring','playful'],
    offline:['calm','curious','thought','bored','sleepy'],
    running:['focus','thought','curious','doubt','confident'],
    queued:['calm','expectant','thought','hesitant'],
    paused:['calm','thought','hesitant','bored','sleepy'],
    needs_attention:['expectant','doubt','hesitant','caring'],
    completed:['satisfied','happy','proud','trust','caring','calm'],
    failed:['wary','anxious','hesitant','sad','frustrated','doubt','thought'],
    stopped:['calm','satisfied','thought'],unknown:['calm','doubt','wary']
  };
  const mixedRoutes={curious_afraid:['idle','failed'],sleepy_determined:['idle','paused'],urgent_polite:['needs_attention','queued'],hurt_helpful:['failed'],worry_relief:['completed','idle'],surprise_understood:['idle','running'],guilty_composed:['idle'],praise_bashful:['completed','idle'],close_considerate:['idle','completed'],sulky_caring:['idle','completed'],happy_restrained:['idle','completed'],shy_proud:['idle','completed']};
  function eligible(status,{social='neutral',fatigue=false,sleep=false,feeling='settled'}={}){
    let groups=routes[status]||routes.unknown;
    if(['idle','offline','paused'].includes(status)&&sleep)groups=['sleepy'];
    else if(['idle','offline','paused'].includes(status)&&fatigue)groups=['bored','sleepy','calm','thought'];
    if(['idle','completed'].includes(status)&&social==='wary')groups=['wary','hesitant','sulky','calm'];
    return Object.values(entries).filter(e=>groups.includes(e.family)&&(!e.mixed||mixedRoutes[e.id.slice(5)]?.includes(status))&&
      (e.family!=='sleepy'||fatigue||sleep)&&
      (e.family!=='proud'||status==='completed'||feeling==='satisfied')&&
      (!['embarrassed','shy','playful','surprised'].includes(e.family)||status==='idle'&&social==='pleased'||feeling==='playful')&&
      (e.family!=='sulky'||social==='wary'));
  }
  function createDirector({random=Math.random,now=Date.now}={}){
    let current=null,lastStatus=null,holdUntil=0,lastContext='',lastEntry=null;
    const counts={},familyCounts={},history=[],events=[];
    const draw=list=>list[Math.min(list.length-1,Math.max(0,Math.floor(random()*list.length)))];
    function choose(status,context={}){
      const pool=eligible(status,context),key=[context.social,context.fatigue,context.sleep,context.feeling].join(':');
      const familiesAvailable=[...new Set(pool.map(e=>e.family))];
      const same=lastStatus===status&&lastContext===key;
      if(!current||!familiesAvailable.includes(current)||!same||now()>=holdUntil){
        let groups=familiesAvailable.filter(g=>g!==current);
        if(!groups.length)groups=familiesAvailable;
        // Neighboring emotional tones prevent arbitrary delight/despair jumps.
        const neighbors=groups.filter(g=>!current||Math.abs(families[g].tone-families[current].tone)<=1);
        if(same&&neighbors.length)groups=neighbors;
        const desired=({engaged:['focus','thought'],satisfied:['satisfied','happy','proud'],concerned:['doubt','thought','anxious'],expectant:['expectant','hesitant'],playful:['playful','shy'],impatient:['expectant','hesitant']})[context.feeling]||[];
        const weighted=groups.map(g=>({g,w:(desired.includes(g)?2:1)*(status==='running'&&g==='focus'?3:1)/(1+(familyCounts[g]||0)*.12)}));
        let cursor=random()*weighted.reduce((n,e)=>n+e.w,0);
        current=(weighted.find(e=>(cursor-=e.w)<0)||weighted.at(-1)).g;
        familyCounts[current]=(familyCounts[current]||0)+1;
        holdUntil=now()+18000+random()*18000;
      }
      let choices=pool.filter(e=>e.family===current);
      const ordinary=choices.filter(e=>!e.mixed);
      if(ordinary.length&&random()>.16)choices=ordinary;
      const unseen=choices.filter(e=>!history.slice(-3).includes(e.id));
      if(unseen.length)choices=unseen;else if(choices.length>1)choices=choices.filter(e=>e.id!==lastEntry);
      const min=Math.min(...choices.map(e=>counts[e.id]||0));
      const selected=draw(choices.filter(e=>(counts[e.id]||0)===min));
      counts[selected.id]=(counts[selected.id]||0)+1;lastEntry=selected.id;
      history.push(selected.id);if(history.length>12)history.shift();
      events.push({id:selected.id,family:current,status,at:now(),reason:lastStatus!==status?'status-change':same?'rotation':'context-change'});
      if(events.length>100)events.shift();lastStatus=status;lastContext=key;
      return selected.id;
    }
    return {choose,snapshot:()=>({family:current,current:lastEntry,holdUntil,counts:{...counts},familyCounts:{...familyCounts},recent:[...history],events:events.map(e=>({...e}))})};
  }
  const accentNames=['blush','blushLines','heat','waterline','tearBead','softShine','sweat','sweatSlide','fineSweat','hesitation','pressure','annoyed','coolShade','tired','warmth','glint','question','pause'];
  function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
  return freeze({families,entries,routes,accentNames,eligible,createDirector});
});
