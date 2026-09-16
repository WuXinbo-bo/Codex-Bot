(function(){
  window.MetaBotCompanionAvatar={create({expressions}){
    let state={},last=-Infinity,taps=0,tapAt=0,turn=0,lastAngle=null,petAt=-Infinity;
    const cue=(name,priority=40)=>{if(performance.now()-last<1700)return false;last=performance.now();expressions.interact('companion-cue',{name,priority});return true;};
    const off=window.metaBot?.onCompanion?.(value=>{
      state=value;
      expressions.interact('companion-mode',{quiet:!!state.game,active:state.mouse,enabled:state.mouse});
    });
    function interact(detail){
      if(!state.mouse||state.game)return false;
      const p=detail.ballPoint,now=performance.now();
      if(detail.type==='press'){taps=now-tapAt<1500?taps+1:1;tapAt=now;if(taps>=3)return cue('tap_guard');}
      if(detail.type==='hover-dwell'&&p&&p.y<48&&now-petAt>8000){petAt=now;return cue('pet');}
      if(['hover-move','proximity-move'].includes(detail.type)&&p){
        const angle=Math.atan2(p.y-64,p.x-64);if(lastAngle!==null){let d=angle-lastAngle;while(d>Math.PI)d-=2*Math.PI;while(d< -Math.PI)d+=2*Math.PI;turn+=d;}
        lastAngle=angle;if(Math.abs(turn)>Math.PI*1.8){turn=0;return cue('orbit');}
        if(detail.speedBand==='fast')return cue('dodge');
      }
      if(detail.type==='pointer-leave'){lastAngle=null;turn=0;}
      return false;
    }
    return {interact,destroy(){off?.();}};
  }};
})();
