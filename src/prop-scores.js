(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./m1-rig.js'));
  else root.MetaBotPropScores=factory(root.MetaBotM1Rig);
})(typeof self!=='undefined'?self:globalThis,function(Rig){
  const A=Rig.ARMS;
  // Each tuple authors expression, object articulation, hand intent and gaze.
  const short={
    stickyRoll:['抽出一张便签','running','work',[
      ['focus',{extend:.2},'grip',-.3],['double_check',{extend:1},'present',.4],['micro_confirm',{extend:.6},'point',.2]]],
    paperclip:['夹好零散纸张','running','work',[
      ['curious',{rotate:-25,x:-8},'grip',-.3],['deep_focus',{rotate:0,y:6},'present',.3],['micro_confirm',{rotate:15},'point',.1]]],
    tapeMeasure:['仔细量一量','running','work',[
      ['focus',{extend:0},'grip',-.4],['scan_right',{extend:1},'open',.7],['double_check',{extend:.45},'present',-.1]]],
    eraser:['轻轻擦掉重来','running','work',[
      ['thinking',{x:-12,rotate:20},'present',-.4],['focus',{x:8,extend:1,rotate:-15},'think',.3],['micro_confirm',{x:-3,extend:.4},'present',.1]]],
    flashlight:['照一照线索','running','inspect',[
      ['curious',{open:.3,rotate:-20},'grip',-.6],['scan_right',{open:1,rotate:18},'present',.6],['double_check',{open:.5,rotate:0},'think',0]]],
    compass:['看看哪个方向','queued','inspect',[
      ['thinking',{turn:.1},'present',-.3],['curious',{turn:.7},'point',.5],['cautious',{turn:.5},'present',.1]]],
    puzzle:['试拼一小块','running','inspect',[
      ['thinking',{extend:1},'present',-.4],['confused',{extend:.5,rotate:5},'think',.3],['focus',{extend:.15},'present',0]]],
    spool:['把思路理顺','running','inspect',[
      ['thinking',{extend:1,turn:0},'open',.5],['deep_focus',{extend:.6,turn:.5},'think',-.4],['micro_confirm',{extend:0,turn:1},'present',0]]],
    folder:['翻开文件夹','running','work',[
      ['attentive',{open:0},'present',.2],['scan_left',{open:1},'think',-.5],['focus',{open:.4},'point',.3]]],
    tray:['练习端稳托盘','idle','work',[
      ['cautious',{rotate:-8,extend:.2},'present',-.4],['tense',{rotate:6,extend:.5},'open',.3],['relief',{rotate:0,extend:0},'present',0]]],
    bookmark:['标记想到的地方','queued','work',[
      ['thinking',{rotate:-15},'grip',-.3],['curious',{extend:1,y:-6},'point',.5],['waiting',{extend:.2,rotate:0},'present',.2]]],
    bell:['试试无声铃铛','idle','signal',[
      ['curious',{turn:.02},'grip',.4],['amused',{turn:-.03,rotate:10},'present',.5],['calm',{turn:0,rotate:0},'grip',0]]],
    brooch:['擦亮小胸针','idle','costume',[
      ['curious',{turn:.12},'think',.4],['focus',{turn:-.08},'grip',.3],['shy_squint',{turn:0},'present',-.3]]],
    pinwheel:['看风车转起来','idle','play',[
      ['curious',{turn:0},'present',.4],['surprise',{turn:1},'open',.6],['amused',{turn:1.35},'present',.2]]],
    yoyo:['接住悠悠球','idle','play',[
      ['curious',{extend:0},'grip',.3],['attentive',{extend:1,turn:.5},'present',.5],['relief',{extend:.1,turn:1},'grip',.1]]],
    balloon:['拉回飘走的气球','idle','play',[
      ['curious',{extend:.1},'grip',.3],['surprise',{extend:1,x:8},'up',.7],['relief',{extend:.2,x:0},'present',.2]]],
    springToy:['压一压弹簧','idle','play',[
      ['curious',{extend:-.7},'present',0],['surprise',{extend:.8},'open',.2],['amused',{extend:0},'present',0]]],
    blanket:['把毯子盖好','paused','rest',[
      ['calm',{open:.9},'open',0],['fatigue',{open:.1},'think',-.2],['relief',{open:0},'rest',0]]],
    fan:['慢慢扇扇风','idle','rest',[
      ['calm',{open:1},'grip',.2],['relief',{open:0,rotate:-15},'present',-.2],['calm',{open:.15,rotate:15},'think',.2]]],
    handwarmer:['捧住暖手包','paused','rest',[
      ['calm',{open:.2},'present',0],['relief',{open:1},'think',-.2],['calm',{open:.5},'rest',0]]],
    plant:['照看小盆栽','idle','rest',[
      ['curious',{open:-.6},'present',-.3],['attentive',{open:.6},'point',.4],['calm',{open:0},'present',0]]]
  };
  const heldBody=new Set(['stickyRoll','tapeMeasure','compass','puzzle','spool','folder','tray','springToy','handwarmer','plant']);
  const pose=(prop,values={},arm='present',gaze=0)=>({accessories:{[prop]:{opacity:1,...values}},arms:heldBody.has(prop)?{right:{x:40,y:arm==='think'?86:98,bendX:12,bendY:98,opacity:1},left:{x:40,y:98,bendX:12,bendY:98,opacity:1}}:{right:A[arm],left:A.none},gaze:{x:gaze,y:.25},effects:{complete:0,input:0,error:0},performance:{bob:0,sway:0,tilt:0,wave:0,squash:0}});
  const frame=(prop,beat,duration,phase='act')=>({expression:beat[0],pose:pose(prop,beat[1],beat[2],beat[3]),duration,transition:Math.min(650,duration*.75),phase});
  const enter=prop=>frame(prop,['curious',{back:1,scale:.65,y:16},'grip',.35],550,'prepare');
  const stow=prop=>frame(prop,['calm',{back:1,scale:.65,y:18},'think',.2],700,'stow');
  const exit=()=>({expression:'calm',pose:{effects:{complete:0,input:0,error:0}},duration:650,transition:550,phase:'exit'});
  const clips={},meta={};
  for(const [prop,[label,route,family,beats]] of Object.entries(short)){
    const id='prop_'+prop;meta[id]={label,route,family,prop,type:'short'};
    clips[id]=[enter(prop),...beats.map((b,i)=>frame(prop,b,[1050,1250,1050][i])),stow(prop),exit()];
  }
  // Independent story beats, not rescaled copies of the short routines.
  const stories={
    note_roll:['反复推敲便签','running','stickyRoll',[
      ['thinking',{extend:.2},'grip',-.3],['focus',{extend:.8},'present',.2],['double_check',{extend:.8,rotate:-5},'point',-.3],['thinking',{extend:.5},'think',-.5],['micro_confirm',{extend:1},'present',.4],['focus',{extend:.3},'grip',0]]],
    measure_twice:['量完再核对','running','tapeMeasure',[
      ['focus',{extend:.2},'grip',-.3],['scan_right',{extend:1},'open',.6],['double_check',{extend:1},'point',.2],['thinking',{extend:.4},'think',-.4],['scan_right',{extend:.85},'present',.4],['focus',{extend:0},'grip',0]]],
    puzzle_retry:['那块拼图再试一次','running','puzzle',[
      ['thinking',{extend:1},'present',-.4],['confused',{extend:.5,rotate:-8},'think',.1],['curious',{extend:1,rotate:0},'point',.4],['deep_focus',{extend:.25},'present',-.2],['micro_confirm',{extend:0},'present',0],['focus',{extend:0},'rest',0]]],
    unwind:['一点点理顺线团','running','spool',[
      ['thinking',{extend:1,turn:0},'open',.5],['cautious',{extend:.9,turn:.2},'grip',.2],['deep_focus',{extend:.6,turn:.7},'think',-.3],['curious',{extend:.4,turn:1},'present',.4],['micro_confirm',{extend:.1,turn:1.5},'grip',0],['focus',{extend:0,turn:1.5},'rest',0]]],
    filing:['慢慢归好文件','running','folder',[
      ['attentive',{open:.3},'present',.2],['scan_left',{open:1},'think',-.5],['double_check',{open:1,rotate:5},'point',.3],['thinking',{open:.5},'think',-.2],['micro_confirm',{open:0},'present',0],['focus',{open:0,y:4},'rest',0]]],
    bearings:['耐心找准方向','queued','compass',[
      ['thinking',{turn:0},'present',0],['curious',{turn:.65},'point',.4],['waiting',{turn:.35},'present',-.3],['cautious',{turn:.55},'think',.2],['attentive',{turn:.5},'present',0],['waiting',{turn:.5},'rest',0]]],
    wind_play:['风车慢慢停下','idle','pinwheel',[
      ['curious',{turn:0},'grip',.2],['attentive',{turn:.5},'present',.5],['surprise',{turn:1.5},'open',.6],['amused',{turn:2.4},'present',.3],['curious',{turn:2.8},'think',.2],['calm',{turn:2.9},'present',0]]],
    yoyo_practice:['悠悠球的第二次尝试','idle','yoyo',[
      ['curious',{extend:0},'grip',.2],['attentive',{extend:1},'present',.4],['surprise',{extend:.75,x:6},'open',.5],['cautious',{extend:.2,x:0},'grip',.2],['amused',{extend:.9},'present',.4],['relief',{extend:0},'grip',0]]],
    balloon_return:['别让气球飘走','idle','balloon',[
      ['curious',{extend:0},'grip',.2],['attentive',{extend:.7,x:5},'present',.5],['surprise',{extend:1,x:10},'up',.7],['cautious',{extend:.5,x:5},'grip',.4],['relief',{extend:.1,x:0},'present',0],['calm',{extend:.2},'grip',.2]]],
    garden:['给小盆栽一点陪伴','idle','plant',[
      ['curious',{open:-.4},'present',-.2],['attentive',{open:.2},'point',.3],['thinking',{open:.7},'think',.4],['calm',{open:.3},'present',.2],['relief',{open:0},'rest',0],['calm',{open:-.15},'present',-.1]]],
    warm_rest:['暖手包的小憩','paused','handwarmer',[
      ['calm',{open:.1},'present',0],['fatigue',{open:.5},'think',-.2],['relief',{open:1},'rest',0],['calm',{open:.6},'present',.1],['relief',{open:.8},'think',-.1],['calm',{open:.3},'rest',0]]],
    blanket_fold:['休息后把毯子叠好','paused','blanket',[
      ['calm',{open:.9},'open',0],['fatigue',{open:0},'think',-.2],['calm',{open:0},'rest',0],['attentive',{open:.4},'present',.2],['focus',{open:.8},'think',-.2],['relief',{open:1},'present',0]]]
  };
  for(const [key,[label,route,prop,beats]] of Object.entries(stories)){
    const id='theater_prop_'+key;meta[id]={label,route,prop,family:short[prop][2],type:'theater'};
    clips[id]=[enter(prop),...beats.map(b=>frame(prop,b,2100)),stow(prop),exit()];
    clips[id][1].duration+=15000-clips[id].reduce((n,f)=>n+f.duration,0);
  }
  const tasks={
    start_folder:['展开任务文件夹','started','folder',[['attentive',{open:0},'grip',.3],['focus',{open:1},'present',.6],['micro_confirm',{open:.4},'point',.6]]],
    start_note:['贴好开工便签','started','stickyRoll',[['attentive',{extend:0},'grip',.2],['focus',{extend:1},'present',.5],['micro_confirm',{extend:.7},'point',.6]]],
    work_clip:['把资料夹整齐','running','paperclip',[['focus',{rotate:-20},'grip',-.3],['double_check',{rotate:0,y:8},'present',.3],['focus',{rotate:5,y:0},'point',0]]],
    work_light:['顺着线索查看','running','flashlight',[['thinking',{open:.1,rotate:-15},'grip',-.4],['scan_right',{open:1,rotate:15},'present',.6],['focus',{open:.4,rotate:0},'think',0]]],
    work_spool:['整理当前思路','running','spool',[['thinking',{extend:1,turn:0},'open',.5],['deep_focus',{extend:.5,turn:.5},'think',-.3],['focus',{extend:0,turn:1},'present',0]]],
    done_tray:['用托盘递出结果','completed','tray',[['attentive',{extend:0,y:5},'grip',.3],['relief',{extend:1,y:0},'present',.6],['proud_soft',{extend:1},'open',.6]]],
    done_folder:['合上文件夹交付','completed','folder',[['double_check',{open:1},'think',.2],['micro_confirm',{open:0},'present',.5],['relief',{open:0,rotate:6},'open',.6]]],
    done_bookmark:['把完成的位置标好','completed','bookmark',[['attentive',{extend:0,y:8},'grip',.3],['micro_confirm',{extend:1,y:0},'point',.6],['relief',{extend:.5},'present',.5]]],
    done_bell:['轻摇铃铛等你查看','completed','bell',[['attentive',{turn:0},'grip',.3],['relief',{turn:.04,rotate:8},'present',.6],['calm',{turn:-.03,rotate:-5},'present',.5]]],
    help_bookmark:['留在这里等指示','attention','bookmark',[['cautious',{extend:.1},'grip',.2],['waiting',{extend:1,y:-5},'point',.6],['attentive',{extend:.6},'present',.5]]],
    help_eraser:['整理后等你处理','failed','eraser',[['confused',{rotate:-15},'grip',.1],['cautious',{extend:.4,x:-5},'think',.3],['waiting',{extend:0,x:0},'present',.5]]]
  };
  for(const [key,[label,route,prop,beats]] of Object.entries(tasks)){
    const id='performance_'+key;meta[id]={label,route,prop,family:short[prop][2],type:'task'};
    clips[id]=[enter(prop),...beats.map(b=>frame(prop,b,1050)),stow(prop),exit()];
  }
  function frames(name,variant=0){
    const result=structuredClone(clips[name]);if(!result||!variant)return result;
    result.slice(1,-2).forEach((f,i)=>{
      f.pose.gaze.x=Math.max(-.8,Math.min(.8,f.pose.gaze.x+(variant===1?-.15:.15)));
      f.pose.body={rotate:variant===1?-3:3};
      if(i===1){f.pose.arms.right=variant===1?A.think:A.present;}
    });
    // Move a small pause between beats, preserving the complete duration.
    result[1].duration+=variant===1?180:-120;result[2].duration-=variant===1?180:-120;
    return result;
  }
  const followups={prop_puzzle:'theater_prop_puzzle_retry',prop_yoyo:'theater_prop_yoyo_practice',prop_stickyRoll:'theater_prop_note_roll'};
  const confirmationFrames=prop=>[frame(prop,['relief',{open:0,extend:0},'present',.4],550,'hold'),stow(prop),exit()];
  return {clips,meta,frames,followups,confirmationFrames};
});
