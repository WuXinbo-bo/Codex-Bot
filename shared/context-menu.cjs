const clamp=(n,min,max)=>Math.max(min,Math.min(n,Math.max(min,max)));
const intersection=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
function menuPosition(ball,area,obstacles=[],scale=1){
  const width=Math.min(Math.round(204*scale),area.width),height=Math.min(Math.round(292*scale),area.height),gap=8*scale;
  const xs=[ball.x+ball.width+gap,ball.x-width-gap,area.x,area.x+area.width-width];
  const ys=[ball.y,ball.y+ball.height+gap,ball.y-height-gap,area.y,area.y+area.height-height];
  const candidates=xs.flatMap(x=>ys.map(y=>({x:Math.round(clamp(x,area.x,area.x+area.width-width)),y:Math.round(clamp(y,area.y,area.y+area.height-height)),width,height})));
  const score=p=>intersection(p,ball)*4+obstacles.reduce((s,o)=>s+intersection(p,o),0)*2+Math.hypot(p.x-ball.x,p.y-ball.y)*.01;
  return candidates.sort((a,b)=>score(a)-score(b))[0];
}
const contains=(rect,p)=>!!rect&&p.x>=rect.x&&p.x<rect.x+rect.width&&p.y>=rect.y&&p.y<rect.y+rect.height;
module.exports={menuPosition,contains};
