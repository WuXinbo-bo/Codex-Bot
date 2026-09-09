(function(){
  let animation;
  window.MetaBotPanelMotion={play({phase,duration,side}){
    const surface=document.querySelector('main');if(!surface)return;
    document.body.dataset.phase=phase;animation?.cancel();surface.style.animation='none';
    surface.style.transformOrigin=side==='left'?'100% 50%':'0% 50%';
    if(phase==='preparing'){surface.style.opacity='0';return;}
    surface.style.opacity=phase==='hidden'?'0':'1';
    if(!duration||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const folded={opacity:0,transform:'scale(.35,.65) rotate(-3deg)'},open={opacity:1,transform:'scale(1) rotate(0deg)'};
    animation=surface.animate(phase==='entering'?[folded,open]:[open,folded],{duration,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});
  }};
})();
