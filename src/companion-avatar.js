(function(){
  window.MetaBotCompanionAvatar={create({expressions,ball}){
    let state={mouse:true},lastProjection=0;
    const director=new window.MetaBotMouseDirector.Director({
      now:()=>performance.now(),
      context:()=>({enabled:state.mouse,game:state.game,hidden:document.hidden,status:expressions.getState().status}),
      play:detail=>expressions.playMouse(detail)
    });
    const off=window.metaBot?.onCompanion?.(value=>{
      state=value;expressions.interact('companion-mode',{quiet:!!state.game,active:state.mouse,enabled:state.mouse});
      if(!state.mouse||state.game){director.reset();expressions.cancelMouse();}
    });
    function interact(detail){
      if(detail.type==='task-lifecycle'){director.interrupt();expressions.cancelMouse();return;}
      const moving=['hover-move','proximity-move'].includes(detail.type),time=performance.now();
      if(moving&&time-lastProjection<45)return;
      lastProjection=time;
      const point=detail.ballPoint?ball?.projectPointer(detail.ballPoint):null;
      director.input({...detail,mousePoint:point||detail.ballPoint});
    }
    const timer=setInterval(()=>director.tick(),125);
    const visibility=()=>{if(document.hidden){director.reset();expressions.cancelMouse();}};
    document.addEventListener('visibilitychange',visibility);
    return {interact,snapshot:()=>director.snapshot(),destroy(){off?.();clearInterval(timer);director.reset();document.removeEventListener('visibilitychange',visibility);}};
  }};
})();
