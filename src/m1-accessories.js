(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MetaBotAccessories = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  const ink = "#181B20", white = "#F3F6F2", gold = "#F4BE4F", pink = "#EF6684", blue = "#67C9EA";
  const path = (d, fill = ink, extra = {}) => ["path", { d, fill, ...extra }];
  const line = (d, stroke = ink, width = 2.5) => path(d, "none", { stroke, "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round" });
  const ellipse = (cx, cy, rx, ry, fill, extra = {}) => ["ellipse", { cx, cy, rx, ry, fill, ...extra }];
  const rect = (x, y, width, height, fill, rx = 2, extra = {}) => ["rect", { x, y, width, height, rx, fill, ...extra }];
  const asset = (anchor, bounds, elements, layer = "front", offset = [0, 0]) => ({ anchor, bounds, elements, layer, offset });
  const joint = (channel, elements, motion) => ['g', {'data-joint':channel}, elements, motion];
  const turn = (elements, x=0, y=0) => joint('turn',elements,{rotate:360,x,y});
  const extend = (elements, x=0, y=20) => joint('extend',elements,{dx:x,dy:y});
  const open = elements => joint('open',elements,{sy:-.75});
  const DEFINITIONS = {
    notebook: asset('body',[-23,-18,23,18],[rect(-22,-17,44,34,blue,3),rect(-16,-14,35,28,white,1),line('M -10 -7 H 12 M -10 0 H 8 M -10 7 H 12',ink,1.5),joint('open',[rect(-15,-14,34,28,'#D7ECF3',2),line('M -8 -6 H 11 M -8 1 H 6',blue,1.5)],{sx:-.94,x:-15}),line('M -19 -11 H -14 M -19 0 H -14 M -19 11 H -14',ink,2)],'front',[0,28]),
    pencil: asset('right',[-4,-28,4,8],[rect(-3,-23,6,27,gold,1),path('M -3 -23 L 0 -28 L 3 -23 Z',ink),rect(-3,3,6,5,pink,1),line('M 0 -20 V 0',white,1)]),
    hourglass: asset('right',[-12,-23,12,10],[path('M -10 -20 Q -10 -8 -2 -6 Q -10 -3 -10 7 H 10 Q 10 -3 2 -6 Q 10 -8 10 -20 Z','#DCF5F8',{stroke:ink,'stroke-width':2}),path('M -7 -17 H 7 L 0 -8 Z M -7 5 L 0 -2 L 7 5 Z',gold),line('M -12 -22 H 12 M -12 9 H 12',ink,3)]),
    stamp: asset('right',[-14,-20,14,9],[rect(-6,-19,12,18,pink,4),rect(-13,-2,26,8,ink,2),rect(-12,6,24,3,gold,0)]),
    flag: asset('right',[-2,-36,27,10],[line('M 0 9 V -35',ink,3),path('M 2 -34 L 26 -30 L 19 -21 L 26 -13 L 2 -17 Z',pink),line('M 7 -28 L 17 -26',white,2)]),
    glasses: asset("face", [-42, -23, 42, 22], [
      ellipse(-21, 0, 19, 20, "#DFF9FF", { "fill-opacity": 0.12, stroke: ink, "stroke-width": 3 }),
      ellipse(21, 0, 19, 20, "#DFF9FF", { "fill-opacity": 0.12, stroke: ink, "stroke-width": 3 }),
      line("M -2 -1 Q 0 -5 2 -1 M -40 -4 L -43 -7 M 40 -4 L 43 -7"), line("M -30 -10 L -25 -15 M 12 -10 L 17 -15", white, 2)
    ]),
    shades: asset("face", [-43, -17, 43, 17], [
      path("M -41 -13 Q -22 -19 -4 -12 L -5 5 Q -8 17 -24 15 Q -40 15 -41 -13 Z M 4 -12 Q 22 -19 41 -13 Q 40 15 24 15 Q 8 17 5 5 Z"),
      line("M -5 -7 Q 0 -11 5 -7 M -42 -11 H 42", ink, 3), line("M -31 -7 L -20 -11 M 13 -6 L 24 -10", white, 2)
    ]),
    topHat: asset("head", [-31, -23, 31, 6], [path("M -22 -23 L 22 -23 L 19 0 L -19 0 Z"), rect(-21, -8, 42, 6, pink, 0), ellipse(0, 1, 30, 5, ink), line("M -14 -18 H 11", "#545966", 2)]),
    wand: asset("right", [-3, -32, 3, 5], [rect(-2, -30, 4, 35, ink, 1), rect(-2, -30, 4, 8, white, 1)]),
    cape: asset("body", [-53, -7, 53, 53], [path("M -25 -6 Q -40 12 -51 43 Q -28 39 -15 52 Q 0 42 15 52 Q 30 39 51 43 Q 38 10 25 -6 Z", pink), line("M -24 -3 Q 0 16 24 -3", "#C74361", 3)], "back"),
    sleepHat: asset("head", [-29, -23, 36, 9], [path("M -27 2 Q -6 -34 18 -17 Q 29 -12 28 4 Q 17 -9 8 -9 L 24 2 Z", blue), line("M -12 -16 L 1 -6 M -2 -21 L 11 -10", "#B8EDFA", 3), rect(-28, 0, 53, 8, white, 4), ellipse(29, 3, 6, 6, white)]),
    pillow: asset("body", [-30, -15, 30, 15], [path("M -29 -14 Q 0 -10 29 -14 Q 25 0 29 14 Q 0 10 -29 14 Q -25 0 -29 -14", "#F2CEE6"), line("M -22 -7 Q 0 -4 22 -7", "#D6A7C7", 1.5)], "front", [0, 28]),
    beret: asset("head", [-30, -15, 30, 8], [ellipse(0, -4, 29, 12, pink), rect(-19, 3, 39, 5, "#BE3D61", 2), line("M 2 -15 Q 3 -22 8 -18", ink, 3)]),
    brush: asset("right", [-4, -27, 4, 8], [line("M 0 7 V -17", gold, 4), path("M -4 -17 L -3 -23 L 1 -29 L 4 -23 L 4 -17 Z", ink), rect(-3, -19, 6, 5, white, 1)]),
    card: asset("body", [-23, -17, 23, 17], [rect(-22, -16, 44, 32, white, 3, { stroke: "#BCD7C7", "stroke-width": 1.5 }), line("M -13 -6 H 13 M -13 1 H 7 M -13 8 H 11", "#789589", 2)], "front", [0, 27]),
    cube: asset("right", [-11, -11, 11, 11], [rect(-10, -10, 20, 20, gold, 4), line("M -5 -5 H 4 M -5 -4 V 4", "#FFF0C4", 2)]),
    spark: asset("right", [-13, -15, 13, 15], [path("M 0 -14 L 4 -4 L 12 0 L 4 4 L 0 14 L -4 4 L -12 0 L -4 -4 Z", gold), ellipse(-1, -1, 2, 3, white)]),
    plane: asset("right", [-22, -12, 22, 13], [path("M -21 -11 L 21 0 L -18 12 L -10 1 Z", white), line("M -21 -11 L -10 1 L 21 0 M -10 1 L -18 12", "#93BACC", 1.5)]),
    cup: asset("body", [-19, -16, 26, 18], [path("M -18 -12 H 15 V 10 Q 14 17 6 17 H -9 Q -18 17 -18 10 Z", "#EDBD68"), line("M 16 -6 Q 31 -7 23 6 L 16 8", "#EDBD68", 5), ellipse(-1, -12, 17, 4, "#FFF0CF"), line("M -7 -20 Q -12 -24 -6 -28 M 4 -20 Q 9 -25 4 -29", "#DDEDE5", 2)], "front", [0, 24]),
    detectiveHat: asset("head", [-34, -19, 34, 7], [path("M -24 1 L -19 -18 L -1 -13 L 15 -18 L 23 1 Z", gold), rect(-23, -5, 46, 6, ink, 1), ellipse(0, 2, 33, 4, gold)]),
    lens: asset("right", [-16, -34, 16, 10], [line("M 0 8 V -6", ink, 5), ellipse(0, -19, 13, 13, "#DBF8FF", { "fill-opacity": 0.7, stroke: ink, "stroke-width": 3 }), line("M -6 -22 L -1 -27", white, 2)]),
    umbrella: asset("right", [-29, -47, 29, 7], [line("M 0 -45 V 2 Q 0 9 6 5", ink, 2.5), path("M -28 -23 Q -22 -47 0 -46 Q 22 -47 28 -23 Q 14 -30 0 -23 Q -14 -30 -28 -23 Z", blue), line("M 0 -45 Q -10 -34 -10 -26 M 0 -45 Q 10 -34 10 -26", "#319CC4", 1.5)]),
    gift: asset("body", [-23, -35, 23, 18], [rect(-20, -9, 40, 26, pink, 3),rect(-3,-9,6,26,gold,0),joint('open',[rect(-22, -13, 44, 8, "#F7859D", 2),rect(-3,-13,6,8,gold,0),line("M 0 -13 C -22 -30 -18 -8 0 -13 C 22 -30 18 -8 0 -13", gold, 3)],{dy:-12})], "front", [0, 28]),
    drawing: asset("body", [-22, -20, 22, 20], [rect(-21, -19, 42, 38, white, 2), path("M 0 -12 L 3 -3 L 12 0 L 3 3 L 0 12 L -3 3 L -12 0 L -3 -3 Z", gold)], "front", [-5, 27])
  };
  const NEW = {
    stickyRoll:['便签卷','work','body',[ellipse(0,-8,19,7,gold),extend([rect(-16,-8,32,20,'#FFF3A1',3),line('M -9 0 H 8 M -9 6 H 4',ink,1.5)],0,12)], [0,27]],
    paperclip:['回形针','work','right',[line('M -5 10 V -16 Q -5 -28 5 -28 Q 14 -28 14 -18 V 5 Q 14 17 3 17 Q -10 17 -10 5 V -14',blue,4)],[-8,0]],
    tapeMeasure:['软尺','work','body',[extend([rect(0,-6,30,13,'#FFF0A8',2),line('M 5 -5 V 0 M 12 -5 V 3 M 19 -5 V 0 M 26 -5 V 3',ink,1.5)],12,0),rect(-19,-15,27,28,blue,7),ellipse(-5,-1,7,7,white)],[-8,29]],
    eraser:['橡皮','work','right',[rect(-14,-10,28,18,pink,5),rect(-3,-10,17,18,white,3),extend([line('M -14 14 H -9 M 0 15 H 4 M 12 13 H 15',pink,2)],0,4)]],
    flashlight:['手电筒','inspect','right',[joint('open',[path('M -8 -17 Q -23 -33 -19 -39 H 19 Q 23 -33 8 -17 Z','#FFF3A1',{'fill-opacity':.55})],{opacity:1}),rect(-7,-15,14,27,blue,4),rect(-11,-20,22,9,ink,3),rect(-7,-20,14,3,white,1)]],
    compass:['指南针','inspect','body',[ellipse(0,0,20,20,gold),ellipse(0,0,16,16,white),turn([path('M 0 -13 Q 4 -3 3 0 L 0 12 Q -4 3 -3 0 Z',pink)]),ellipse(0,0,3,3,ink)],[0,28]],
    puzzle:['拼图块','inspect','body',[path('M -23 -13 H -9 Q -14 -23 -5 -23 Q 4 -23 0 -13 H 11 V -2 Q 1 -7 1 1 Q 1 9 11 5 V 17 H -23 Z',blue),extend([path('M 14 -13 H 30 V 17 H 14 V 5 Q 4 9 4 1 Q 4 -7 14 -2 Z',gold)],12,0)],[-4,28]],
    spool:['线轴','inspect','body',[extend([line('M 0 0 Q 17 10 26 0 Q 35 -7 34 12',pink,2)],9,5),rect(-10,-18,20,36,gold,4),turn([line('M -7 -12 H 7 M -7 -6 H 7 M -7 0 H 7 M -7 6 H 7 M -7 12 H 7',pink,3)])],[-7,29]],
    folder:['文件夹','work','body',[rect(-25,-15,50,33,blue,4),rect(-23,-21,21,9,blue,3),open([rect(-25,-10,50,28,'#A2DEED',4),line('M -15 -2 H 4',white,2)])],[0,28]],
    tray:['小托盘','work','body',[ellipse(0,8,29,7,blue),line('M -27 5 Q 0 15 27 5',white,2),extend([rect(-19,-12,38,23,white,3),line('M -12 -4 H 12 M -12 2 H 5',blue,2)],0,-8)],[0,27]],
    bookmark:['书签','work','right',[path('M -8 -22 Q 0 -26 8 -22 V 12 Q 4 11 0 7 Q -4 11 -8 12 Z',pink),ellipse(0,-15,2,2,gold),extend([line('M 0 -23 Q 9 -32 12 -23',gold,2)],0,4)]],
    bell:['小铃铛','signal','right',[path('M -14 4 Q -9 -3 -9 -14 Q 0 -27 9 -14 Q 9 -3 14 4 Q 0 10 -14 4',gold),turn([ellipse(0,8,4,4,ink)],0,-10),ellipse(0,-22,3,3,pink)]],
    brooch:['胸针','costume','body',[turn([path('M 0 -10 Q 6 -4 10 0 Q 5 4 0 10 Q -5 4 -10 0 Q -6 -4 0 -10',blue),ellipse(0,0,3,3,white)])],[28,21]],
    pinwheel:['风车','play','right',[line('M 0 12 V -23',ink,3),turn([path('M 0 -23 Q -23 -43 -17 -23 Q -7 -19 0 -23 Q 20 -46 0 -40 Q -4 -30 0 -23 Q 23 -3 17 -23 Q 7 -27 0 -23 Q -20 0 0 -6 Q 4 -16 0 -23',blue),ellipse(0,-23,3,3,gold)],0,-23)]],
    yoyo:['悠悠球','play','right',[joint('extend',[line('M 0 -14 V 0',ink,1.5)],{sy:30/14,x:0,y:-14}),extend([ellipse(0,0,12,12,pink),ellipse(0,0,5,5,gold),turn([ellipse(6,0,2,2,white)])],0,30)],[-4,-16]],
    balloon:['小气球','play','right',[joint('extend',[line('M 0 10 Q -6 -3 0 -13',ink,1.5)],{sy:12/23,x:0,y:10}),extend([ellipse(0,-31,14,18,pink),line('M -6 -38 Q -9 -35 -8 -31',white,2)],0,-12)],[-8,0]],
    springToy:['弹簧玩具','play','body',[joint('extend',[line('M -15 -12 C -28 -19 28 -19 15 -12 C 28 -5 -28 -5 -15 2 C -28 9 28 9 15 16 C 28 23 -28 23 -15 16',blue,3)],{sy:.6})],[0,27]],
    blanket:['小毯子','rest','body',[open([path('M -34 5 Q 0 13 34 5 L 32 40 Q 0 47 -32 40 Z','#ABCBD7'),line('M -24 19 Q 0 25 24 19 M -24 32 Q 0 38 24 32',white,2)])],[0,0]],
    fan:['折扇','rest','right',[joint('open',[path('M 0 10 Q -7 0 -24 -14 Q 0 -39 24 -14 Q 7 0 0 10',pink),line('M 0 10 L -16 -19 M 0 10 V -27 M 0 10 L 16 -19',white,1.5)],{sx:-.8,x:0,y:10})]],
    handwarmer:['暖手包','rest','body',[rect(-22,-17,44,34,pink,12),rect(-8,-20,16,7,ink,3),joint('open',[line('M -7 -24 Q -13 -30 -7 -35 M 6 -24 Q 12 -30 6 -35',gold,2)],{opacity:1})],[0,28]],
    plant:['小盆栽','rest','body',[rect(-15,0,30,21,gold,5),line('M 0 1 V -25','#399767',3),joint('open',[path('M 0 -10 Q -26 -30 -19 -11 Q -12 -4 0 -10 M 0 -20 Q 22 -37 19 -19 Q 12 -11 0 -20','#399767')],{rotate:15})],[0,26]]
  };
  for(const [id,[label,family,anchor,elements,offset]] of Object.entries(NEW)){
    const bounds={stickyRoll:[-20,-16,20,26],paperclip:[-13,-31,17,20],tapeMeasure:[-21,-17,45,15],eraser:[-17,-13,18,21],flashlight:[-24,-42,24,15],compass:[-22,-22,22,22],puzzle:[-26,-26,46,20],spool:[-13,-21,48,23],folder:[-28,-24,28,21],tray:[-32,-23,32,18],bookmark:[-11,-33,15,15],bell:[-18,-28,18,17],brooch:[-14,-14,14,14],pinwheel:[-28,-51,28,16],yoyo:[-16,-17,16,49],balloon:[-18,-64,18,14],springToy:[-29,-35,29,42],blanket:[-35,0,35,46],fan:[-27,-33,27,13],handwarmer:[-25,-39,25,20],plant:[-28,-42,28,25]}[id];
    DEFINITIONS[id]={...asset(anchor,bounds,elements,'front',offset||[0,0]),label,family,slot:family==='costume'?'wear':'main'};
  }
  for(const [id,definition] of Object.entries(DEFINITIONS)){
    definition.label||=id;
    definition.slot||=['head','face'].includes(definition.anchor)||id==='cape'?'wear':'main';
  }
  function articulate(group,value){
    for(const node of group._joints||[]){
      const spec=node._motion,t=Number(value[node.dataset.joint])||0;
      node.setAttribute('transform',`translate(${(spec.dx||0)*t} ${(spec.dy||0)*t}) translate(${spec.x||0} ${spec.y||0}) rotate(${(spec.rotate||0)*t}) scale(${1+(spec.sx||0)*t} ${1+(spec.sy||0)*t}) translate(${-(spec.x||0)} ${-(spec.y||0)})`);
      if(spec.opacity)node.setAttribute('opacity',String(Math.max(0,Math.min(1,t))));
    }
  }
  function create(element, back, front) {
    const nodes={};
    function ensure(name){
      if(nodes[name])return nodes[name];
      const definition=DEFINITIONS[name];if(!definition)return null;
      const group = element("g", { "data-accessory": name, opacity: 0 });
      group._joints=[];
      function append(parent,entries){for(const [type,attrs,children,motion] of entries){
        const node=element(type,attrs);parent.append(node);
        if(motion){node._motion=motion;group._joints.push(node);}if(children)append(node,children);
      }}
      append(group,definition.elements);
      (definition.layer === "back" ? back : front).append(group);
      return nodes[name]=group;
    }
    return {nodes,ensure,prune(visible){for(const name of Object.keys(nodes))if(!visible.has(name)){nodes[name].remove();delete nodes[name];}}};
  }
  return { DEFINITIONS, NEW, create, articulate };
});
