(function(){
  let animation,version=0;
  function settle(visible){const surface=document.querySelector('main');if(!surface)return;animation?.cancel();animation=null;surface.style.opacity=visible?'1':'0';surface.style.transform='none';}
  window.MetaBotPanelMotion={play({phase,duration,side,version:incoming}){
    const surface=document.querySelector('main');if(!surface)return;
    if(incoming!=null&&incoming<version)return;
    version=incoming??version+1;
    if(!['preparing','entering','visible','leaving','hidden'].includes(phase))return;
    document.body.dataset.phase=phase;animation?.cancel();animation=null;
    surface.style.transformOrigin=side==='left'?'100% 50%':'0% 50%';
    if(phase==='preparing'){surface.style.opacity='0';return;}
    surface.style.opacity=phase==='hidden'?'0':'1';
    surface.style.transform='none';
    if(!['entering','leaving'].includes(phase)||!duration||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const folded={opacity:0,transform:'scale(.82,.92) rotate(-2deg)'},open={opacity:1,transform:'none'},token=version;
    animation=surface.animate(phase==='entering'?[folded,open]:[open,folded],{duration,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});
    animation.finished.then(()=>{if(version===token)settle(phase==='entering');}).catch(()=>{});
  }};
  window.metaBot?.onPanelEnsureVisible?.(()=>{if(!animation){settle(true);document.body.dataset.phase='visible';}});
})();
