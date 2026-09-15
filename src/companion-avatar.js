(function(){
  const scenes={
    stool:'<path d="M10 22h28v6H10zM14 28v13m20-13v13"/>',
    mat:'<rect x="4" y="27" width="43" height="14" rx="7"/><path d="M12 30v8m5-8v8m24-8v8"/>',
    lamp:'<path d="M15 40h27M29 39V25L18 17m-7 6 8-12 12 8z"/><path class="lamp-rays" d="m9 26-4 5m11-5-1 7m7-8 3 5"/>',
    box:'<rect x="8" y="22" width="34" height="20" rx="5"/><path d="m8 23 6-9 13 8 10-8 5 9M22 30h8"/>',
    plant:'<path d="m15 28 3 14h17l3-14zM26 28V14"/><path d="M26 22C11 21 12 9 25 17M27 17C26 3 41 6 34 15z"/>',
    tray:'<rect x="4" y="30" width="43" height="12" rx="5"/><path d="M12 30V17h15v13m5 0V12h7v18M17 21h5"/>'
  };
  window.MetaBotCompanionAvatar={create({app,expressions}){
    const layer=document.createElement('div');layer.className='companion-space';layer.hidden=true;app.prepend(layer);
    let state={},scene='',last=-Infinity,taps=0,tapAt=0,turn=0,lastAngle=null,petAt=-Infinity;
    const cue=(name,priority=40)=>{if(performance.now()-last<1700)return false;last=performance.now();expressions.interact('companion-cue',{name,priority});return true;};
    const off=window.metaBot?.onCompanion?.(value=>{
      state=value;layer.hidden=!state.enabled;
      expressions.interact('companion-mode',{quiet:state.focused||state.sleeping||!!state.game,active:state.enabled&&state.mouse,enabled:state.enabled});
      const key=state.focused?'lamp':state.space;
      if(scene!==key){scene=key;layer.innerHTML='<svg viewBox="0 0 50 46" aria-hidden="true">'+(scenes[key]||scenes.mat)+'</svg>';layer.dataset.space=key;}
      layer.classList.toggle('is-lit',!!state.focused);layer.classList.toggle('is-sleeping',!!state.sleeping);
      layer.title='生活角：点击打开陪伴工具';
    });
    function interact(detail){
      if(!state.enabled||!state.mouse||state.sleeping||state.focused)return false;
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
    return {interact,destroy(){off?.();layer.remove();}};
  }};
})();
