(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./m1-rig.js'):root.MetaBotM1Rig,typeof module==='object'&&module.exports?require('./m1-accessories.js'):root.MetaBotAccessories);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.MetaBotActivityScores=api;
})(typeof self!=='undefined'?self:globalThis,function(Rig,Accessories){
  const A=Rig.ARMS,quiet={complete:0,input:0,error:0};
  // Blocking vocabulary. A score authors its own ordered operations and emotional turn.
  const moves={
    notice:{gaze:{x:.55,y:.3},arm:'think'},inspect:{gaze:{x:.15,y:.45},y:-5,arm:'think'},
    left:{x:-9,rotate:-12,gaze:{x:-.6,y:.3},arm:'present'},right:{x:9,rotate:12,gaze:{x:.6,y:.3},arm:'present'},
    turn:{rotate:35,turn:.35,arm:'grip'},reverse:{rotate:-25,turn:-.18,arm:'grip'},
    open:{open:1,extend:.65,arm:'open'},close:{open:0,extend:0,arm:'think'},
    pull:{extend:1,arm:'open'},retract:{extend:.2,arm:'grip'},
    write:{x:-5,rotate:24,arm:'think'},underline:{x:8,rotate:42,arm:'point'},
    erase:{x:-9,extend:1,rotate:-14,arm:'think'},correct:{x:5,extend:.25,rotate:8,arm:'present'},
    align:{rotate:0,x:0,arm:'present'},mark:{y:7,extend:.5,arm:'point'},
    lift:{y:-7,arm:'up'},lower:{y:7,arm:'down'},
    reach:{x:7,arm:'present',gaze:{x:.7,y:.1}},withdraw:{x:-3,arm:'think',gaze:{x:-.3,y:.25}},
    tilt:{rotate:-14,arm:'grip',body:{rotate:-4}},level:{rotate:0,arm:'present',body:{rotate:0}},
    slip:{x:8,y:9,rotate:22,arm:'open'},catch:{x:0,y:0,rotate:-6,arm:'grip'},
    shrink:{arm:'think',body:{rx:49,ry:55}},relax:{arm:'rest',body:{rx:53,ry:51}},
    puff:{arm:'open',body:{rx:55,ry:49}},peek:{arm:'think',gaze:{x:-.7,y:0}},
    lookBack:{arm:'present',gaze:{x:.7,y:0}},avoid:{arm:'think',gaze:{x:-.55,y:.5},body:{rotate:5}},
    nod:{arm:'present',body:{cy:67},gaze:{x:.15,y:.4}},proud:{arm:'open',body:{cy:61},gaze:{x:.1,y:-.3}},
    pause:{arm:'grip',gaze:{x:0,y:.1}},listen:{arm:'open',gaze:{x:.65,y:-.1}},
    wave:{arm:'up',rotate:12,body:{rotate:-3}},settle:{arm:'rest',rotate:0,gaze:{x:0,y:.15}},
    hide:{back:1,y:16,scale:.7,arm:'think'},reveal:{back:0,y:0,scale:1,arm:'present'},
    spin:{turn:.8,rotate:18,arm:'present'},slow:{turn:.95,rotate:0,arm:'grip'},
    press:{extend:-.65,y:5,arm:'push'},spring:{extend:.65,y:-3,arm:'open'},
    warm:{open:1,arm:'think'},rest:{open:.3,arm:'rest',body:{cy:67}},
    fan:{open:.1,rotate:-16,arm:'present'},fold:{open:.8,extend:.1,arm:'think'},
    faceAway:{arm:'down',body:{rotate:9},gaze:{x:.75,y:.1}},offer:{arm:'present',extend:.4,gaze:{x:.65,y:.2}}
  };
  function blocking(prop,operation,articulation={}){
    const spec=moves[operation];if(!spec)throw Error('Unknown blocking '+operation);
    const {arm='present',body={},gaze={x:.25,y:.25},...values}=spec;
    const pose={effects:{...quiet},body:{...body},gaze:{...gaze},performance:{bob:0,sway:0,tilt:0,wave:0,squash:0},arms:{left:A.none,right:A[arm]},accessories:{},micro:{leftHand:0,rightHand:0}};
    if(!prop)return pose;
    const d=Accessories.DEFINITIONS[prop];if(!d)throw Error('Unknown prop '+prop);
    pose.accessories[prop]={opacity:1,x:0,y:0,rotate:0,open:0,extend:0,turn:0,back:0,scale:1,...articulation,...values};
    const p=pose.accessories[prop];
    if(d.anchor==='body'&&d.layer!=='back'&&d.slot!=='wear'){
      const b=Rig.merge(Rig.getExpression('neutral').body,body),angle=p.rotate*Math.PI/180;
      const grab=Math.min(21,(d.bounds[2]-d.bounds[0])*.35),localY=Math.min(12,d.bounds[3]*.5);
      for(const [side,sign] of [['left',-1],['right',1]]){
        const px=b.cx+d.offset[0]+p.x+(sign*grab*Math.cos(angle)-localY*Math.sin(angle))*p.scale;
        const py=b.cy+d.offset[1]+p.y+(sign*grab*Math.sin(angle)+localY*Math.cos(angle))*p.scale;
        const x=64+(px-b.cx)*52/b.rx,y=64+(py-b.cy)*52/b.ry;
        pose.arms[side]={x:side==='right'?128-x:x,y,bendX:9,bendY:94,opacity:1};
      }
    }else if(['right','left'].includes(d.anchor)){
      // Hand-anchored objects move with the hand; do not translate them off the grip.
      pose.arms.right={...A[arm],x:A[arm].x-(values.x||0),y:A[arm].y+(values.y||0)};
      p.x=0;p.y=0;
    }else if(d.slot==='wear'){
      pose.arms.right=['inspect','align','catch','reveal'].includes(operation)?A.salute:A[arm];
    }
    return pose;
  }
  const clips={},meta={};
  function register(id,{label,type,route,family,prop=null,expressions,operations,duration=9600,followup=null}){
    const ops=operations.split(' ');if(ops.length!==expressions.length)throw Error('Score length '+id);
    const interior=duration-1950,each=Math.floor(interior/ops.length);
    const frames=[{expression:expressions[0],pose:blocking(prop,prop?'hide':'notice'),duration:600,transition:450,phase:'prepare',operation:'notice'}];
    let articulation={};
    ops.forEach((operation,index)=>{
      for(const key of ['open','extend','turn'])if(Object.hasOwn(moves[operation],key))articulation[key]=moves[operation][key];
      const pose=blocking(prop,operation,articulation);
      // The existing fan channel measures folding rather than opening.
      if(prop==='fan'&&['open','close'].includes(operation))pose.accessories.fan.open=operation==='open'?0:1;
      if(prop==='fan')articulation.open=pose.accessories.fan.open;
      frames.push({expression:expressions[index],pose,duration:each+(index===0?interior-each*ops.length:0),transition:Math.min(600,each*.45),phase:index===2?'turn':'act',operation});
    });
    frames.push({expression:expressions.at(-1),pose:blocking(prop,prop?'hide':'settle'),duration:700,transition:600,phase:'stow',operation:'hide'});
    frames.push({expression:'calm',pose:{effects:{...quiet}},duration:650,transition:550,phase:'exit',operation:'exit'});
    clips[id]=frames;meta[id]={label,type,route,family,prop,followup,duration};
  }
  const emotionScores={
    calm:[['cup_place','转杯找舒服位置','cup','inspect turn level settle'],['plant_straight','扶正盆栽再看看','plant','tilt align inspect relax'],['fan_pause','扇两下便停','fan','open fan close rest'],['stretch_seat','舒展后重新坐稳',null,'shrink lift relax settle']],
    trust:[['pillow_lean','接住枕头靠一靠','pillow','reach catch withdraw rest'],['blanket_corner','压好毯角','blanket','open mark fold rest'],['warmer_relax','暖手后放松肩膀','handwarmer','reveal warm pause relax'],['rest_watch','看你一眼继续休息',null,'rest lookBack nod settle']],
    focus:[['write_review','写完停笔复看','pencil','write underline pause inspect'],['clip_edges','把纸边夹齐','paperclip','left align mark inspect'],['notes_lines','逐行核对笔记','notebook','open left right mark'],['mark_close','标好重点再合页','folder','open inspect mark close']],
    thought:[['spool_stop','理线到一半停住','spool','pull retract pause inspect'],['puzzle_rotate','拼图片换方向','puzzle','pull turn reverse align'],['compass_recall','对照方向回想','compass','inspect turn peek align'],['pencil_reconsider','准备写却改主意','pencil','lift write pause withdraw']],
    curious:[['lens_trace','镜头追着细节','lens','left inspect right pause'],['light_return','扫过后再回照','flashlight','open right left inspect'],['hat_probe','戴帽探看再缩回','detectiveHat','align reach peek withdraw'],['card_reverse','发现纸背还有内容','card','inspect turn reverse nod']],
    doubt:[['measure_origin','换起点重新量','tapeMeasure','pull inspect retract pull'],['folder_evidence','翻前页找依据','folder','open right left inspect'],['glasses_recheck','放低眼镜重新看','glasses','inspect lower pause align'],['card_compare','把资料换边比对','card','left inspect right nod']],
    expectant:[['sand_glance','看流沙又看你','hourglass','inspect lookBack inspect pause'],['bookmark_hint','书签露出一点','bookmark','reveal lift withdraw offer'],['bell_wait','举铃又轻轻放下','bell','lift pause lower listen'],['card_ready','准备好却先不递','card','align reach pause withdraw']],
    happy:[['wind_again','风车停下再轻摆','pinwheel','spin slow turn settle'],['spring_surprise','回弹吓自己一跳','springToy','press spring catch relax'],['spark_catch','接住小闪光','spark','lift slip catch proud'],['half_step','迈半步又克制站好',null,'reach proud shrink settle']],
    satisfied:[['tray_relief','端稳后松口气','tray','tilt catch level relax'],['stamp_inspect','检查刚用过的印章','stamp','mark lift inspect align'],['drawing_admire','摆正画作慢慢欣赏','drawing','left align inspect proud'],['pencil_last','收好最后一件文具','pencil','inspect align lower settle']],
    confident:[['cape_ready','整理披风再出发','cape','align proud reach nod'],['card_point','指向卡片重点','card','reveal mark offer proud'],['flag_steady','稳稳举旗','flag','lift tilt level proud'],['folder_once','一遍归整好资料','folder','open align mark close']],
    proud:[['shades_peek','墨镜滑下露出眼神','shades','reveal lower peek align'],['brooch_casual','亮出胸针装随意','brooch','inspect reveal proud avoid'],['hat_notice','扶正帽子等你看','topHat','tilt align lookBack proud'],['drawing_peek','展示画作偷偷回望','drawing','offer proud avoid lookBack']],
    surprised:[['balloon_tug','气球牵高手臂','balloon','reveal pull lift retract'],['yoyo_early','悠悠球提前回弹','yoyo','pull retract catch inspect'],['gift_pause','打开礼物愣一下','gift','inspect open pause proud'],['plane_return','纸飞机回来赶紧接','plane','reach turn slip catch']],
    wary:[['umbrella_peek','从伞沿试探外面','umbrella','reveal tilt peek withdraw'],['light_stop','灯光停在可疑处','flashlight','open left pause inspect'],['folder_guard','护住资料再侧看','folder','open close withdraw peek'],['lens_retreat','伸出镜头又缩手','lens','reach pause withdraw inspect']],
    anxious:[['clip_retry','夹纸前反复对齐','paperclip','left align right align'],['tray_balance','端盘小幅找平','tray','tilt right catch level'],['bookmark_grip','捏住书签等待','bookmark','lift pause withdraw listen'],['measure_care','小心收回卷尺','tapeMeasure','pull pause retract close']],
    hesitant:[['card_half','递到一半收回来','card','reach pause withdraw offer'],['bookmark_choice','换两个标记位置','bookmark','left mark right pause'],['compass_check','转正方向再确认','compass','turn align inspect nod'],['eraser_spare','拿起却不舍得擦','eraser','lift reach pause withdraw']],
    shy:[['drawing_hide','画作遮住一点脸','drawing','lift avoid lower peek'],['brooch_flash','胸针展示一瞬就收','brooch','reveal proud hide peek'],['beret_avoid','扶帽避开目光','beret','align avoid inspect settle'],['wave_to_nod','招手变成点头',null,'lift pause withdraw nod']],
    embarrassed:[['erase_crooked','发现写歪赶紧擦','eraser','inspect erase correct avoid'],['pencil_wrong','拿反笔偷偷调头','pencil','reverse pause turn align'],['hat_excuse','帽子歪了假装整理','topHat','tilt pause align lookBack'],['card_slip','纸张滑落装作有准备','card','slip catch align proud']],
    sad:[['pillow_hug','把枕头抱近一点','pillow','reveal inspect withdraw rest'],['blanket_fold','低头叠好毯子','blanket','open lower fold rest'],['blank_page','翻到空白页停住','notebook','open turn pause lower'],['drawing_corner','收画又留一角','drawing','inspect hide reveal withdraw']],
    frustrated:[['puzzle_flat','拼不进去先放平','puzzle','pull press reverse level'],['spool_tangle','线越理越乱先停下','spool','pull turn reverse pause'],['erase_again','擦过后重新落笔','eraser','erase inspect correct mark'],['stamp_straight','印章没摆正再扶正','stamp','tilt mark inspect align']],
    sulky:[['fan_turnaway','合扇后轻轻扭头','fan','fan close faceAway peek'],['umbrella_self','把伞稍稍偏向自己','umbrella','reach withdraw tilt lookBack'],['card_pushback','推远卡片又拉回','card','reach pause withdraw align'],['turn_peek','转开一点却偷偷看',null,'faceAway pause peek settle']],
    bored:[['cube_edge','方块沿手边慢慢转','cube','left turn right reverse'],['sand_forgot','盯流沙忘记翻面','hourglass','inspect pause peek turn'],['bookmark_conduct','书签当指挥棒','bookmark','lift left right lower'],['measure_body','量圆肚子发现自己作弊','tapeMeasure','pull shrink inspect relax']],
    sleepy:[['hat_twice','睡帽滑下扶两次','sleepHat','lower align lower catch'],['pillow_nod','枕头刚放好就点头','pillow','reveal level nod rest'],['cup_wake','捧杯回神再放下','cup','lift pause nod lower'],['notes_pen','合页前回看夹笔的位置','notebook','close pause open inspect']],
    caring:[['plant_light','把盆栽转向亮处','plant','inspect left turn settle'],['warmer_offer','把暖手包递近','handwarmer','warm reach pause offer'],['cup_near','把杯子挪到好拿的位置','cup','left inspect right offer'],['umbrella_space','撑伞给旁边留位置','umbrella','lift right reach listen']],
    playful:[['wand_wrong','魔杖藏错边又调整','wand','hide peek reveal reverse'],['plane_fake','纸飞机假投后真投','plane','reach withdraw lift slip'],['brush_conduct','画笔假装指挥','brush','lift underline reverse nod'],['hat_spark','展示礼帽里的小秘密','topHat','inspect tilt reveal proud']]
  };
  const routes={calm:'idle',trust:'idle',focus:'running',thought:'running',curious:'running',doubt:'running',expectant:'queued',happy:'idle',satisfied:'idle',confident:'running',proud:'idle',surprised:'idle',wary:'queued',anxious:'queued',hesitant:'queued',shy:'idle',embarrassed:'idle',sad:'paused',frustrated:'paused',sulky:'paused',bored:'idle',sleepy:'paused',caring:'idle',playful:'idle'};
  for(const [family,scores] of Object.entries(emotionScores))scores.forEach(([key,label,prop,operations],i)=>{
    const primary=`base_${family}_${i+1}`,turn=family==='frustrated'?'base_hesitant_3':family==='happy'?'base_surprised_2':family==='embarrassed'?'base_embarrassed_4':primary;
    register('activity_'+key,{label,type:'emotion',route:routes[family],family,prop,operations,expressions:[`base_${family}_${(i+1)%4+1}`,primary,turn,primary],duration:8800+(i%3)*700});
  });
  const taskScores={
    started:[['catch_card','接住新任务卡','card','reach catch inspect mark'],['spread_folder','展开资料夹接单','folder','reveal open inspect nod'],['start_sticky','抽出开工便签','stickyRoll','reveal pull mark align'],['bookmark_begin','书签移到起点','bookmark','lift left mark nod'],['pencil_ready','摆好铅笔准备','pencil','reveal align inspect write'],['toy_to_work','收起玩具转身接单','cube','inspect hide lookBack nod']],
    running:[['compare_pages','对照资料两面','notebook','open left right inspect'],['trace_evidence','沿线查找依据','flashlight','open left right pause'],['mark_question','圈出待查位置','pencil','write pause underline inspect'],['clip_read','夹住已经看过的部分','paperclip','reveal align mark inspect'],['unwind_clue','理顺一段线索','spool','pull turn retract align'],['recall_continue','停笔回想后继续','pencil','write pause peek write']],
    completed:[['tray_deliver','把成果稳稳托给你','tray','catch level offer proud'],['folder_deliver','合上资料夹递交','folder','inspect close reach offer'],['stamp_deliver','盖好章再展示','stamp','align mark lift proud'],['bookmark_done','夹好完成位置','bookmark','inspect mark align offer'],['flag_view','小旗引导查看结果','flag','lift wave offer nod'],['sticky_done','便签移到完成条旁','stickyRoll','pull mark reach offer']],
    attention:[['blocked_place','指出卡住的位置','bookmark','inspect lift mark listen'],['choice_card','举起待选卡片','card','reveal left right offer'],['pending_page','翻开待确认页','folder','open inspect mark listen'],['question_mark','留好问题书签','bookmark','left mark withdraw pause'],['put_pen','放下笔看向你','pencil','write pause lower listen'],['make_room','挪开道具给提示让位','tray','inspect left lower listen']],
    failed:[['check_stop','检查后停手','notebook','open inspect reverse pause'],['error_page','把问题页单独夹好','paperclip','inspect left mark lower'],['tools_wait','收起工具等待介入','flashlight','open inspect close lower'],['tidy_failure','扶正散乱资料','folder','open tilt align close'],['help_place','指出需要介入处','pencil','inspect underline pause listen'],['protect_work','护住已有成果再示意','card','inspect withdraw align listen']],
    stopped:[['keep_page','夹住当前页再停下','bookmark','inspect mark align lower'],['put_pencil','收笔但不盖完成章','pencil','write pause align lower'],['keep_thread','卷好线头留待以后','spool','pull retract turn close'],['keep_folder','合夹保留当前位置','folder','open mark close lower'],['stop_sort','整理到一半停住','paperclip','left align pause lower'],['tools_rest','把工具放稳后休息','tray','catch level lower rest']]
  };
  const taskExpressions={started:['base_expectant_1','base_focus_2','base_thought_3','base_confident_4'],running:['base_focus_1','base_thought_2','base_doubt_3','base_focus_4'],completed:['base_satisfied_1','base_confident_2','base_proud_3','base_happy_restrained'],attention:['base_hesitant_1','base_doubt_2','base_urgent_polite','base_caring_4'],failed:['base_frustrated_1','base_doubt_2','base_hurt_helpful','base_hesitant_4'],stopped:['base_focus_1','base_thought_2','base_calm_3','base_calm_4']};
  for(const [route,scores] of Object.entries(taskScores))for(const [key,label,prop,operations] of scores){
    register('performance_activity_'+key,{label,type:'task',route,family:route,prop,operations,expressions:taskExpressions[route],duration:5950});
  }
  const panels={
    enter:[['side_draw','侧身抽出','peek withdraw reach offer'],['two_hands','双手托开','shrink reach lift level'],['push_side','推到身旁','withdraw reach right align'],['flip_show','翻转展示','inspect turn level offer']],
    switch:[['replace','抽换卡片','withdraw left reach offer'],['handoff','前后交接','offer withdraw catch level'],['support_flip','扶住再翻','catch turn inspect level'],['make_way','移开让位','withdraw lower right listen']],
    confirm:[['receive','接回收好','reach catch withdraw settle'],['archive','合页归档','inspect close lower settle'],['unmark','取下书签','mark lift withdraw nod'],['thanks','接住后致意','catch withdraw nod relax']],
    move:[['steady','移动时扶稳','reach catch level settle'],['change_side','换侧重新接手','left withdraw right catch'],['edge_grip','靠边调整握位','shrink withdraw catch level'],['main_only','多面板照看主面板','left right inspect offer']]
  };
  for(const [route,scores] of Object.entries(panels))for(const [key,label,operations] of scores){
    register('panel_activity_'+key,{label,type:'panel',route,family:'panel',operations,expressions:['base_curious_1','base_focus_2','base_caring_3','base_trust_4'],duration:2350});
    const list=clips['panel_activity_'+key];list.forEach(f=>{f.duration=180;f.transition=140;});list.at(-1).duration=220;meta['panel_activity_'+key].duration=list.reduce((n,f)=>n+f.duration,0);
  }
  const social={
    hover:[['eyes_first','先眼后头','notice pause peek listen'],['hands_aside','收手让位','withdraw lower reach listen'],['recognize','探头辨认','peek shrink reach nod'],['listen_pause','停笔听你','pause lower listen nod']],
    click:[['tap_reply','轻点回应','notice nod relax settle'],['caught_hiding','藏物被发现','hide pause reveal avoid'],['show_you','把物件给你看','inspect reach offer lookBack'],['smile_spill','笑意收不住','shrink pause proud relax']],
    hold:[['support_body','撑住身体','shrink press puff level'],['guard_object','护住手中物','catch withdraw pause level'],['wait_release','侧看等松手','peek pause listen settle'],['gradual_relax','按住时慢慢放松','shrink pause relax rest']],
    release:[['straighten','扶正后再看你','tilt catch align lookBack'],['back_to_it','回望再继续','lookBack nod withdraw settle'],['take_hand','收回伸出的手','reach pause withdraw settle'],['return_place','回到刚才的位置','left inspect align settle']]
  };
  for(const [route,scores] of Object.entries(social))scores.forEach(([key,label,operations],i)=>{
    register('social_activity_'+key,{label,type:'social',route,family:'social',prop:key==='show_you'?'brooch':key==='caught_hiding'?'cube':null,operations,expressions:[`base_curious_${i+1}`,`base_trust_${i+1}`,route==='hold'?`base_hesitant_${i+1}`:`base_playful_${i+1}`,`base_caring_${i+1}`],duration:3950});
  });
  const stories=[
    ['restrained','收住快要露出的开心','idle','pinwheel','happy_restrained','notice spin proud pause slow settle'],
    ['bashful_pride','展示后害羞藏起来','idle','drawing','shy_proud','inspect offer proud avoid hide peek'],
    ['brave_peek','害怕却想看清楚','idle','lens','curious_afraid','withdraw peek reach pause inspect relax'],
    ['determined','困倦时把最后一页夹好','paused','notebook','sleepy_determined','open rest pause inspect mark close'],
    ['polite_wait','想提醒又耐心收住','queued','bell','urgent_polite','lift pause lower listen lift settle'],
    ['help_anyway','低落时仍把资料理好','paused','folder','hurt_helpful','lower pause open align close offer'],
    ['safe_now','担心滑落终于端稳','idle','tray','worry_relief','tilt slip catch pause level relax'],
    ['understand','愣了一下终于理顺','running','puzzle','surprise_understood','pull reverse pause inspect turn align'],
    ['caught','被看见后装作在整理','idle','cube','guilty_composed','turn spin pause align hide lookBack'],
    ['praise','想被夸又不敢直视','idle','brooch','praise_bashful','inspect reveal proud lookBack avoid peek'],
    ['considerate','想靠近又怕打扰','idle','cup','close_considerate','lift reach pause withdraw lower listen'],
    ['sulky_watch','转过身却偷偷关注','paused','fan','sulky_caring','fan close faceAway pause peek settle'],
    ['resume_sort','接着整理刚才的资料','running','paperclip','surprise_understood','inspect left align mark right settle'],
    ['practice_again','刚才没接好再练一次','idle','yoyo','worry_relief','pull slip catch pause pull retract'],
    ['take_delivery','接回交付时的那件道具','confirmation','tray','shy_proud','reach catch withdraw inspect lower settle'],
    ['finish_private','你走开后完成小事情','idle','plane','guilty_composed','peek reveal inspect turn reach settle']
  ];
  stories.forEach(([key,label,route,prop,mixed,operations],i)=>register('theater_activity_'+key,{label,type:i<12?'theater':'continuation',route,family:Rig.BaseEmotions.entries['base_'+mixed].family,prop,operations,expressions:['base_curious_1','base_thought_2','base_'+mixed,'base_'+mixed,'base_'+mixed,'base_calm_4'],duration:15000}));
  const followups={activity_clip_edges:'theater_activity_resume_sort',activity_yoyo_early:'theater_activity_practice_again',activity_plane_fake:'theater_activity_finish_private'};
  for(const [id,followup] of Object.entries(followups))meta[id].followup=followup;
  function frames(name,variant=0){
    const result=structuredClone(clips[name]);if(!variant)return result;
    const m=meta[name],index=Math.min(3,result.length-3),frame=result[index];
    // Distinct authored turning point: a minor correction, or noticing the observer.
    frame.expression=variant===1?'base_hesitant_2':['running','failed','attention','stopped'].includes(m.route)?'base_thought_3':'base_curious_3';
    const previous=frame.pose.accessories[m.prop]||{};
    frame.pose=blocking(m.prop,variant===1?'correct':'lookBack',Object.fromEntries(['open','extend','turn'].map(key=>[key,previous[key]||0])));
    frame.operation=variant===1?'correct':'lookBack';
    result[index+1].pose=Rig.merge(result[index+1].pose,{gaze:{x:variant===1?.15:-.35,y:.3}});
    return result;
  }
  function panelFrames(name,side='right',prop=null){
    return frames(name).map(f=>{
      const pose=prop&&f.phase!=='exit'?blocking(prop,f.operation==='exit'?'settle':f.operation):f.pose;
      const result={...f,pose:structuredClone(pose)};
      if(side==='left'){
        result.pose.arms={left:result.pose.arms?.right||A.present,right:result.pose.arms?.left||A.none};
        result.pose.gaze={x:-(result.pose.gaze?.x||.6),y:.2};
        for(const p of Object.values(result.pose.accessories||{}))p.hand=-1;
      }
      return result;
    });
  }
  return {clips,meta,frames,blocking,panelFrames,followups};
});
