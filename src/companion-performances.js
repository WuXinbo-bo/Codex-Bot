(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./m1-rig.js'):root.MetaBotM1Rig);if(typeof module==='object'&&module.exports)module.exports=api;else root.MetaBotCompanionPerformances=api;})(typeof self!=='undefined'?self:globalThis,function(Rig){
  const A=Rig.ARMS,clips={},labels={};
  const f=(expression,prop,hand,body={},duration=900)=>({expression,duration,pose:{body,arms:{left:A.rest,right:A[hand]||A.rest},accessories:prop?{[prop]:{opacity:1}}:{}}});
  const add=(id,label,frames)=>{clips['performance_companion_'+id]=frames;labels['performance_companion_'+id]=label;};
  add('panel_receive','伸手接过任务卡',[f('curious','card','open',{rotate:-6},650),f('attentive','card','grip',{cy:68},850),f('focus','card','present',{},850)]);
  add('panel_resume','拿起原来的卡片继续',[f('attentive','card','down',{rotate:3},450),f('context_sort','card','grip',{},650),f('focus','card','present',{rotate:-3},650)]);
  add('panel_stamp','确认并盖上完成章',[f('double_check','card','grip',{},900),f('focus','stamp','up',{},650),f('micro_confirm','stamp','push',{cy:68},600),f('complete','card','present',{},1050)]);
  add('panel_file','把确认的任务卡收好',[f('attentive','card','open',{},650),f('context_sort','folder','grip',{},800),f('micro_confirm','folder','down',{},850)]);
  add('pet','向你的手心靠近',[f('curious',null,'rest',{cy:60,rotate:-5}),f('delight',null,'think',{cy:57,ry:54},1200),f('calm',null,'rest',{},1100)]);
  add('tap_guard','先疑惑，再轻轻挡一下',[f('curious',null,'question'),f('cautious',null,'brace',{rotate:-8}),f('calm',null,'open')]);
  add('orbit','追着指针转，慢半拍停下',[f('scan_left',null,'open',{rotate:-12}),f('scan_right',null,'open',{rotate:12}),f('orbit',null,'think',{},700),f('recover',null,'rest')]);
  add('dodge','轻轻躲开，再探头看看',[f('surprise',null,'brace',{cx:59,rotate:-8},500),f('curious',null,'question',{cx:66,rotate:8},1000),f('calm',null,'rest')]);
  add('land','落地缓冲，重新站稳',[f('steady',null,'down',{cy:72,rx:56,ry:43},500),f('curious',null,'open',{cy:63,rx:50,ry:53},800),f('calm',null,'rest',{},1100)]);
  add('edge','扶住屏幕边缘',[f('surprise',null,'brace',{rotate:-6},650),f('steady',null,'grip',{},1100),f('calm',null,'rest',{cy:69},1400)]);
  add('menu_offer','侧身递出小菜单',[f('curious',null,'open',{rotate:-5},350),f('attentive',null,'present',{},550),f('calm',null,'rest',{},350)]);
  add('menu_stow','轻轻收回小菜单',[f('attentive',null,'grip',{},300),f('calm',null,'down',{rotate:3},500),f('calm',null,'rest',{},300)]);
  return {clips,labels};
});
