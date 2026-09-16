(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./m1-rig.js'):root.MetaBotM1Rig);if(typeof module==='object'&&module.exports)module.exports=api;else root.MetaBotMousePerformances=api;})(typeof self!=='undefined'?self:globalThis,function(Rig){
  const A=Rig.ARMS,clips={},labels={},groups={};
  const frame=(face,ms,body={},left='rest',right='rest',extra={})=>({expression:face,duration:ms,transition:Math.min(420,ms*.65),pose:{body,arms:{left:A[left],right:A[right]},effects:{complete:0,input:0,error:0},performance:{bob:0,sway:0,tilt:0,wave:0,squash:0},...extra}});
  const f=frame;
  function add(group,id,label,frames){const name='performance_mouse_'+id;clips[name]=frames.concat(f('calm',450));labels[name]=label;(groups[group]||=[]).push(name);}
  add('approach','peek','先侧眼，再探头',[f('scan_left',450,{rotate:-5}),f('curious',750,{cx:59,rotate:-9},'question'),f('attentive',650,{cx:63})]);
  add('approach','welcome','转过身，轻轻招手',[f('attentive',420,{},'open'),f('delight',700,{rotate:6},'open','up'),f('calm',650,{},'rest','open')]);
  add('approach','tiptoe','悄悄向你凑近',[f('curious',500,{cy:66,ry:49}),f('attentive',800,{cy:60,ry:54},'down','down'),f('curious',600,{rotate:7})]);
  add('pet','lean','顺着手心歪头',[f('curious',400,{rotate:-4}),f('calm',900,{rotate:-12,cy:61},'rest','think',{accents:{warmth:.7}}),f('delight',850,{cy:59,rx:54,ry:49})]);
  add('pet','melt','慢慢放松成软团',[f('attentive',450),f('calm',950,{cy:72,rx:57,ry:43},'rest','rest',{accents:{blush:.7}}),f('delight',800,{cy:70,rx:55,ry:46})]);
  add('pet','other_side','换一边，继续摸嘛',[f('calm',600,{rotate:-9}),f('curious',700,{rotate:10,cy:59},'think'),f('delight',900,{rotate:13},'open','rest',{accents:{warmth:.6}})]);
  add('cheek','dent','脸颊轻凹，悄悄回弹',[f('surprise',350,{leftInset:8,cx:66},'rest','question'),f('cautious',700,{leftInset:5,rotate:6}),f('curious',650,{leftInset:0,cx:63})]);
  add('cheek','shield','捂住脸，偷偷看你',[f('curious',400),f('cautious',850,{rotate:8},'think','brace',{accents:{blushLines:.65}}),f('curious',750,{rotate:-5},'question')]);
  add('cheek','rebound','躲开后，探回来',[f('surprise',350,{cx:70,rotate:8},'brace'),f('curious',850,{cx:58,rotate:-10},'open'),f('confident',650,{cx:64})]);
  add('tickle','curl','缩起来护住两侧',[f('surprise',350,{cy:68},'brace','brace'),f('delight',600,{rx:56,ry:43,rotate:-7},'grip','grip'),f('delight',650,{rx:55,ry:45,rotate:7},'grip','grip')]);
  add('tickle','wiggle','左右躲，还是忍不住',[f('cautious',400,{cx:59,rotate:-10},'brace'),f('delight',550,{cx:69,rotate:11},'rest','brace'),f('delight',650,{cx:60,rotate:-7},'brace','brace')]);
  add('tickle','guard','护住自己，再偷看',[f('surprise',350,{},'brace','brace'),f('cautious',900,{cy:70,ry:46},'think','think'),f('curious',700,{rotate:-8},'question','rest')]);
  add('catch','sneak','悄悄伸手，差一点',[f('curious',500,{rotate:-5}),f('focus',850,{},'grip','open'),f('surprise',450,{cy:61},'open','open'),f('confused',650,{},'think','question')]);
  add('catch','clap','合拢双手，摊开检查',[f('attentive',500,{},'open','open'),f('focus',650,{cy:66},'grip','grip'),f('curious',900,{},'present','present')]);
  add('catch','feint','装作不在意，突然试一下',[f('scan_right',700,{rotate:7}),f('calm',700),f('surprise',450,{cx:59,rotate:-9},'open','present'),f('confused',650,{},'question')]);
  add('return','search','向你离开的方向找一找',[f('scan_left',650,{rotate:-7},'question'),f('scan_right',700,{rotate:8}),f('attentive',600,{},'open')]);
  add('return','pretend','假装没看见，忍不住回头',[f('scan_right',750,{rotate:9}),f('calm',600),f('curious',800,{rotate:-11},'think')]);
  add('return','surprise','你回来啦，探头迎接',[f('attentive',400),f('delight',650,{cy:59,rotate:-5},'open','up'),f('curious',800,{cy:62},'open')]);
  add('mirror','sway','跟着你，左右歪头',[f('attentive',450),f('curious',650,{rotate:-12},'open'),f('curious',650,{rotate:12},'rest','open')]);
  add('mirror','late','慢半拍才跟上',[f('thinking',750),f('attentive',550,{rotate:-10}),f('surprise',500,{rotate:12}),f('calm',650,{rotate:3})]);
  add('mirror','oops','做反了，赶紧纠正',[f('confident',550,{rotate:10},'open','open'),f('confused',650,{rotate:14},'question'),f('micro_confirm',700,{rotate:-10},'open')]);
  add('orbit','track','眼睛跟着指针转',[f('scan_left',450,{rotate:-5}),f('attentive',500,{rotate:2}),f('scan_right',500,{rotate:8}),f('curious',650,{rotate:-3})]);
  add('orbit','turn','跟着绕半圈，再站稳',[f('curious',500,{rotate:-13},'open'),f('surprise',550,{rotate:14},'rest','open'),f('steady',850,{},'down','down')]);
  add('orbit','steady','扶住自己，重新找你',[f('surprise',450,{rotate:-9},'brace','brace'),f('cautious',800,{cy:69,ry:48},'grip','grip'),f('curious',650,{rotate:6},'question')]);
  add('landing','soft','轻轻落下，舒展开',[f('steady',450,{cy:72,rx:56,ry:43},'down','down'),f('curious',650,{cy:61,rx:49,ry:55},'open','open'),f('calm',750)]);
  add('landing','brisk','落地后理一理姿势',[f('surprise',450,{cy:73,rx:57,ry:43},'brace','brace'),f('steady',650,{rotate:-6},'down','down'),f('confident',750,{rotate:3},'open')]);
  add('landing','edge','扶住边缘，慢慢站稳',[f('surprise',500,{rotate:-9},'brace','brace'),f('steady',850,{rotate:-5},'grip'),f('calm',800,{cy:68},'down')]);
  add('social','five','抬起手，等你击掌',[f('attentive',450),f('curious',1100,{},'up','rest'),f('confident',900,{},'up','open')]);
  add('social','bump','碰一下，轻轻后仰',[f('delight',450,{cy:66,rotate:6},'up','open'),f('surprise',600,{cy:69,ry:47},'open','open'),f('confident',650,{},'salute')]);
  add('social','bye','挥挥手，目送你离开',[f('attentive',500,{},'open'),f('calm',750,{rotate:-5},'up'),f('calm',700,{},'salute')]);
  // The same hand-authored frames can face either side without switching eye styles.
  function frames(name,{side='left',busy=false}={}){
    return (clips[name]||[]).map(frame=>{const pose=Rig.merge({},frame.pose);if(side==='right'){
      pose.body.cx=128-(pose.body.cx??64);pose.body.rotate=-(pose.body.rotate||0);
      [pose.body.leftInset,pose.body.rightInset]=[pose.body.rightInset||0,pose.body.leftInset||0];
      [pose.arms.left,pose.arms.right]=[pose.arms.right,pose.arms.left];
    }if(busy){for(const key of ['cx','cy'])if(pose.body[key]!=null)pose.body[key]=64+(pose.body[key]-64)*.4;pose.body.rotate=(pose.body.rotate||0)*.4;}
      return {...frame,pose};});
  }
  return {clips,labels,groups,frames};
});
