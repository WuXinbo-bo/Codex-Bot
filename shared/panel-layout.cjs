const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const clamp=(v,min,max)=>Math.min(Math.max(v,min),Math.max(min,max));
function panelLayout(anchor, area, panels, gap=8){
  if(!panels.length)return [];
  const placed=[];
  const preferred=anchor.x+anchor.width+gap+panels[0].width<=area.x+area.width?'right':anchor.x-panels[0].width-gap>=area.x?'left':'bottom';
  let side=preferred;
  for(const spec of panels){
    let x=anchor.x+anchor.width+gap,y=anchor.y;
    if(side==='left')x=anchor.x-spec.width-gap;
    if(side==='bottom'){x=anchor.x+(anchor.width-spec.width)/2;y=anchor.y+anchor.height+gap;}
    y=(side==='bottom'?anchor.y+anchor.height+gap:anchor.y)+placed.reduce((n,p)=>n+p.height+gap,0);
    if(side==='bottom')x=anchor.x+(anchor.width-spec.width)/2;
    let candidate={x:clamp(Math.round(x),area.x,area.x+area.width-spec.width),y:clamp(Math.round(y),area.y,area.y+area.height-spec.height),width:spec.width,height:spec.height,side,type:spec.type};
    const xs=[candidate.x,anchor.x+anchor.width+gap,anchor.x-spec.width-gap,area.x,area.x+area.width-spec.width,...placed.flatMap(p=>[p.x+p.width+gap,p.x-spec.width-gap])];
    const ys=[candidate.y,anchor.y-spec.height-gap,anchor.y+anchor.height+gap,area.y,area.y+area.height-spec.height,...placed.flatMap(p=>[p.y+p.height+gap,p.y-spec.height-gap])];
    const choices=xs.flatMap(x=>ys.map(y=>({...candidate,x:Math.round(x),y:Math.round(y)}))).filter(p=>p.x>=area.x&&p.y>=area.y&&p.x+p.width<=area.x+area.width&&p.y+p.height<=area.y+area.height&&!overlap(p,anchor)&&!placed.some(q=>!q.suppressed&&overlap(p,q)));
    choices.sort((a,b)=>(Math.abs(a.x-candidate.x)+Math.abs(a.y-candidate.y))-(Math.abs(b.x-candidate.x)+Math.abs(b.y-candidate.y)));
    if(!choices.length){
      // Dock the visible group instead of treating lack of space as dismissal.
      const total=panels.reduce((sum,p)=>sum+p.height,0);
      const spacing=Math.min(gap,Math.max(0,(area.height-total)/Math.max(1,panels.length-1)));
      const scale=Math.min(1,(area.height-spacing*(panels.length-1))/total);
      const width=Math.min(area.width,Math.max(...panels.map(p=>p.width)));
      const x=anchor.x+anchor.width/2<area.x+area.width/2?area.x+area.width-width:area.x;
      let y=clamp(anchor.y,area.y,area.y+area.height-total*scale-spacing*(panels.length-1));
      return panels.map(p=>{const result={...p,x,y:Math.round(y),width:Math.min(p.width,area.width),height:Math.floor(p.height*scale),side:x<anchor.x?'left':'right',docked:true};y+=result.height+spacing;return result;});
    }
    candidate=choices[0];
    placed.push(candidate);
  }
  return placed;
}
module.exports={panelLayout,overlap};
