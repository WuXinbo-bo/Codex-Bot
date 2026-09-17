(function(){
  window.MetaBotCompanionAvatar={create({expressions,ball}){
    let state={mouse:true},lastProjection=0,menuOpen=false,tucked=false;
    const director=new window.MetaBotMouseDirector.Director({
      now:()=>performance.now(),
      context:()=>({enabled:state.mouse,quiet:state.quietUntil>Date.now(),menu:menuOpen,hidden:document.hidden||tucked,status:expressions.getState().status}),
      play:detail=>expressions.playMouse(detail)
    });
    const off=window.metaBot?.onCompanion?.(value=>{
      state=value;expressions.interact('companion-mode',{quiet:state.quietUntil>Date.now(),active:state.mouse,enabled:state.mouse});
      ball?.setPerformanceContext({quiet:state.quietUntil>Date.now()});
      if(!state.mouse||state.quietUntil>Date.now()){director.reset();expressions.cancelMouse();ball?.setMouseResponse(null);}
    });
    const offMenu=window.metaBot?.onContextMenu?.(value=>{if(menuOpen===value.visible)return;menuOpen=value.visible;ball?.setPerformanceContext({menu:menuOpen});if(menuOpen){director.reset();expressions.cancelMouse();ball?.setMouseResponse(null,true);}expressions.interact('mouse-menu',{visible:menuOpen,side:value.side});});
    const offVisibility=window.metaBot?.onCompanionVisibility?.(visible=>{tucked=!visible;if(tucked){director.reset();expressions.cancelMouse();ball?.setMouseResponse(null);}});
    function interact(detail){
      if(detail.type==='task-lifecycle'){director.interrupt();expressions.cancelMouse();ball?.setMouseResponse(null,true);return;}
      const moving=['hover-move','proximity-move'].includes(detail.type),time=performance.now();
      if(moving&&time-lastProjection<45)return;
      lastProjection=time;
      const point=detail.ballPoint?ball?.projectPointer(detail.ballPoint):null;
      director.input({...detail,mousePoint:point||detail.ballPoint});
    }
    const timer=setInterval(()=>{director.tick();const s=expressions.getState(),priority=s.transient?.priority||0;ball?.setMouseResponse(priority>=50||s.motionLevel==='reduced'?null:director.response());},80);
    const visibility=()=>{if(document.hidden){director.reset();expressions.cancelMouse();}};
    document.addEventListener('visibilitychange',visibility);
    return {interact,command:type=>director.command(type),snapshot:()=>director.snapshot(),destroy(){off?.();offMenu?.();offVisibility?.();clearInterval(timer);director.reset();ball?.setMouseResponse(null);document.removeEventListener('visibilitychange',visibility);}};
  }};
})();
