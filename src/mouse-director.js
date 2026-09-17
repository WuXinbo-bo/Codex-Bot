(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./mouse-performances.js'):root.MetaBotMousePerformances);if(typeof module==='object'&&module.exports)module.exports=api;else root.MetaBotMouseDirector=api;})(typeof self!=='undefined'?self:globalThis,function(Performances){
  const busyStates=new Set(['running','queued']);
  const urgentStates=new Set(['failed','needs_attention','unknown']);
  class Director {
    constructor({now=Date.now,random=Math.random,play=()=>false,context=()=>({})}={}){
      Object.assign(this,{now,random,play,context});this.samples=[];this.history={};this.cooldowns={};this.events=[];
      this.lastAccepted=-Infinity;this.leftAt=-Infinity;this.enteredAt=0;this.near=false;this.pressed=null;this.dragging=false;
      this.pointer=null;this.chain=null;this.lastSample=-Infinity;this.lastMove=0;this.dwellUsed=false;this.lastGesture=null;this.taps=0;this.tapAt=0;this.accepted=0;this.rejected=0;
    }
    eligible(explicit=false){const c=this.context();return c.enabled!==false&&!c.quiet&&!c.hidden&&(!c.menu||explicit)&&!urgentStates.has(c.status);}
    reset(){this.samples=[];this.chain=null;this.near=false;this.pointer=null;this.pressed=null;this.dragging=false;}
    interrupt(){this.samples=[];this.chain=null;this.pressed=null;this.dwellUsed=true;this.enteredAt=this.now();}
    emit(group,{variant,side,gesture=group,continuation=false,explicit=false}={}){
      const now=this.now(),c=this.context(),busy=busyStates.has(c.status);
      if(!this.eligible(explicit)||this.dragging||this.pressed)return false;
      if(busy&&['catch','mirror','orbit','tickle','social'].includes(group))return false;
      const chained=continuation&&this.chain?.group===group&&this.chain.until>now&&this.chain.count<3;
      if(now-this.lastAccepted<(group==='landing'||variant==='bump'?0:chained?2100:1200)||(!chained&&now<(this.cooldowns[group]||0)))return false;
      const names=Performances.groups[group]||[],recent=this.history[group]||[];
      const available=names.filter(name=>!recent.includes(name));const pool=available.length?available:names.filter(name=>name!==recent.at(-1));
      const name=variant?names.find(n=>n==='performance_mouse_'+variant):pool[Math.floor(Math.min(.999999,this.random())*pool.length)];
      if(!name)return false;
      const detail={name,group,side:side||((this.pointer?.x??64)<64?'left':'right'),busy,gesture,explicit};
      if(!this.play(detail)){this.rejected++;return false;}
      this.accepted++;this.lastAccepted=now;this.lastGesture=gesture;this.cooldowns[group]=now+(group==='social'?9000:busy?12000:6500);
      this.history[group]=recent.concat(name).slice(-2);this.events.push({...detail,at:now});this.events=this.events.slice(-24);
      if(['pet','catch','mirror'].includes(group))this.chain=chained?{...this.chain,count:this.chain.count+1}:{group,count:1,until:now+9000};
      else if(variant==='five')this.chain={group:'five',count:1,until:now+6500};
      return true;
    }
    command(type){
      if(type==='five')return this.emit('social',{variant:'five',explicit:true,gesture:'invite-five'});
      if(type==='greet')return this.emit('approach',{explicit:true,gesture:'greeting'});
      if(type==='tease')return this.emit('cheek',{explicit:true,gesture:'tease'});
      if(type==='surprise'){
        const groups=busyStates.has(this.context().status)?['approach','pet','cheek']:['approach','pet','cheek','catch','mirror'];
        const available=groups.filter(g=>this.now()>=(this.cooldowns[g]||0));
        return available.length?this.emit(available[Math.min(available.length-1,Math.floor(this.random()*available.length))],{explicit:true}):false;
      }
      return false;
    }
    response(){
      if(!this.eligible()||!this.pointer||!this.near||this.pressed)return null;
      const now=this.now(),p=this.pointer,still=now-this.lastMove,last=this.events.at(-1),busy=busyStates.has(this.context().status);
      if(this.dragging)return null;
      const recent=last&&now-last.at<4000,kind=this.chain?.group==='five'&&this.chain.until>now?'hand':recent&&['pet','tickle','orbit','mirror'].includes(last.group)?last.group:p.y<43&&still>650?'nest':'follow';
      return {kind,x:Math.max(-1,Math.min(1,(p.x-64)/64)),y:Math.max(-1,Math.min(1,(p.y-64)/64)),side:last?.side||'left',intensity:(busy?.35:1)*(still<900?1:Math.max(0,1-(still-900)/1800))};
    }
    input(detail){
      const type=detail.type,now=this.now();
      if(type==='task-lifecycle'){this.interrupt();return;}
      if(!this.eligible()){this.reset();return;}
      const oldPointer=this.pointer,p=detail.mousePoint||detail.ballPoint;if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))this.pointer={...p};
      if(type==='drag-start'){this.dragging=true;this.chain=null;this.samples=[];return;}
      if(type==='drag-end'){this.dragging=false;this.pressed=null;this.samples=[];this.emit('landing',{variant:detail.edgeHit?'edge':Number(detail.releaseSpeed)>450?'brisk':'soft',side:String(detail.edgeDirection).includes('right')?'right':'left'});return;}
      if(type==='press'){this.pressed={at:now,point:this.pointer};return;}
      if(type==='ball-click'||type==='hold-release'){
        const hit=this.pressed?.point||this.pointer;this.pressed=null;if(!hit)return;
        this.taps=now-this.tapAt<1600?this.taps+1:1;this.tapAt=now;
        if(this.chain?.group==='five'&&this.chain.until>now&&hit.hand){this.cooldowns.social=0;this.chain=null;this.emit('social',{variant:'bump',side:hit.hand,gesture:'high-five'});}
        else if(type==='ball-click'&&hit.inBody!==false){this.emit(this.taps>=3?'tickle':'cheek',{side:hit.x<64?'left':'right',gesture:this.taps>=3?'repeat-tap':'cheek-tap'});}
        return;
      }
      if(type==='pointer-leave'||type==='bubble-hover'){
        if(this.near){this.near=false;this.leftAt=now;this.samples=[];
          if(type==='pointer-leave'&&now-this.lastAccepted<30000)this.emit('social',{variant:'bye',gesture:'goodbye'});
        }return;
      }
      if(!['hover-enter','proximity-enter','hover-move','proximity-move','hover-dwell'].includes(type)||!p||this.pressed||this.dragging)return;
      if(!this.near){this.near=true;this.enteredAt=now;this.lastMove=now;this.dwellUsed=false;}
      if(type==='hover-dwell'){this.tick();return;}
      if(now-this.lastSample<45)return;this.lastSample=now;
      const prev=this.samples.at(-1),origin=prev||oldPointer,distance=origin?Math.hypot(p.x-origin.x,p.y-origin.y):0;
      if(distance>3)this.lastMove=now;if(distance>8)this.dwellUsed=false;
      this.samples.push({x:p.x,y:p.y,at:now});this.samples=this.samples.filter(s=>now-s.at<1700).slice(-36);
      if(!prev||this.samples.length<3)return;
      const speed=distance/Math.max(1,now-prev.at)*1000;
      if(speed>800&&Math.hypot(p.x-64,p.y-64)<105){this.emit('cheek',{variant:'rebound',gesture:'fast-pass'});return;}
      const points=this.samples,first=points[0],span=now-first.at;
      let travel=0,turn=0,revX=0,revY=0,dxSign=0,dySign=0;
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y;travel+=Math.hypot(dx,dy);
        if(Math.abs(dx)>3){if(dxSign&&dxSign!==Math.sign(dx))revX++;dxSign=Math.sign(dx);}
        if(Math.abs(dy)>3){if(dySign&&dySign!==Math.sign(dy))revY++;dySign=Math.sign(dy);}
        if(Math.hypot(a.x-64,a.y-64)>32&&Math.hypot(b.x-64,b.y-64)>32){let angle=Math.atan2(b.y-64,b.x-64)-Math.atan2(a.y-64,a.x-64);if(angle>Math.PI)angle-=2*Math.PI;if(angle< -Math.PI)angle+=2*Math.PI;turn+=angle;}
      }
      const average=travel/Math.max(1,span)*1000,head=points.filter(s=>s.y<47&&s.y>2&&Math.abs(s.x-64)<38).length/points.length>.75;
      const flank=points.filter(s=>s.y>46&&s.y<95&&Math.abs(s.x-64)>27&&Math.abs(s.x-64)<65).length/points.length>.75;
      const radii=points.map(s=>Math.hypot(s.x-64,s.y-64)),arc=Math.min(...radii)>36&&Math.max(...radii)-Math.min(...radii)<28&&Math.abs(turn)>1.2;
      let accepted=false;
      if(span>=650&&Math.abs(turn)>Math.PI*1.7)accepted=this.emit('orbit');
      else if(!arc&&head&&span>=420&&travel>28&&revX>=1&&average<260)accepted=this.emit('pet',{continuation:true});
      else if(!arc&&flank&&span>=350&&travel>55&&revY+revX>=2&&average>100)accepted=this.emit('tickle');
      else if(!arc&&span>=550&&travel>55&&revX+revY>=2)accepted=this.emit('mirror',{continuation:true});
      if(accepted)this.samples=this.samples.slice(-1);
      this.tick();
    }
    tick(){
      const now=this.now();if(this.chain&&now>this.chain.until)this.chain=null;
      if(!this.eligible()||!this.near||this.dragging||this.pressed||!this.pointer)return;
      if(now-this.enteredAt<500)return;
      if(this.enteredAt-this.leftAt>800&&this.enteredAt-this.leftAt<20000&&now-this.enteredAt<2000){if(this.emit('return',{variant:this.chain?.group==='catch'?'pretend':undefined}))return;}
      const p=this.pointer,still=now-this.lastMove;
      if(this.chain?.group==='pet'&&this.chain.count===1&&still>1000&&now-this.lastAccepted>2600){this.emit('pet',{variant:'other_side',continuation:true});return;}
      if(!this.dwellUsed&&still>1000&&Math.abs(p.x-64)>40&&Math.abs(p.x-64)<83&&p.y<74&&p.y>9){if(this.emit('social',{variant:'five',gesture:'invite-five'}))this.dwellUsed=true;return;}
      if(!this.dwellUsed&&still>1300&&p.y>36&&p.y<96&&Math.abs(p.x-64)<90){if(this.emit('catch',{continuation:true}))this.dwellUsed=true;return;}
      if(now-this.enteredAt<1700&&now-this.lastAccepted>7000&&still>350)this.emit('approach');
    }
    snapshot(){return {accepted:this.accepted,rejected:this.rejected,lastGesture:this.lastGesture,response:this.response(),samples:this.samples.length,chain:this.chain?{...this.chain}:null,events:this.events.map(e=>({...e}))};}
  }
  return {Director};
});
