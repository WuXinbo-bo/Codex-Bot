(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MetaBotAppearance = api;
})(typeof self !== 'undefined' ? self : globalThis, function() {
  const SKINS = {green:['#02AD45','#87F8AD'],ocean:['#249AD9','#A0EDFF'],sunset:['#F58C40','#FFE0A2'],pink:['#ED83B6','#FFD9EA'],violet:['#9872DE','#E0CAFF'],lemon:['#EDCB42','#FFF5AE'],night:['#536178','#AEBFD8'],neon:['#54DAB9','#CB98FF']};
  const SHAPES = ['circle','square','triangle','pentagon','hexagon','star','drop','capsule','cloud','diamond','flower','blob','pancake','bean','bell','kite','cushion','spring'];
  function normalize(value = {}) {
    return {skin: Object.hasOwn(SKINS,value.skin) ? value.skin : 'lemon', shape: ['morph','random',...SHAPES].includes(value.shape) ? value.shape : 'morph', motion:['full','soft','reduced'].includes(value.motion) ? value.motion : 'full', emoji:value.emoji !== false, masks:value.masks !== false, maskAuto:value.maskAuto !== false, maskStyle:['sticker','paper','holo'].includes(value.maskStyle)?value.maskStyle:'sticker', maskFrequency:['rare','normal','lively'].includes(value.maskFrequency)?value.maskFrequency:'normal', particles:value.particles !== false, random:value.random !== false};
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
  return {SKINS,SHAPES,normalize,points,path,pool};
});
