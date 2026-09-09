let currentNotice=null,noticeBusy=false;
window.metaBot?.onInteraction(detail => {
  currentNotice=detail;
  document.getElementById('noticeActions').hidden=!detail.persistent;
  document.getElementById('noticeNext').hidden=!(detail.persistent&&detail.count>1);
  document.getElementById('noticeError').textContent='';
  document.getElementById('updateToastActions').hidden=!detail.update;
  document.getElementById("label").textContent = `${detail.label || ""}${detail.count > 1 ? ` · ${detail.count} 项` : ""}${detail.stale?' · 状态待核实':''}`;
  document.getElementById("title").textContent = detail.title || "";
});
for(const [id,action] of [['noticeOpen','open'],['noticeAck','ack'],['noticeNext','next']])document.getElementById(id).onclick=async()=>{
  if(noticeBusy||!currentNotice?.persistent)return;noticeBusy=true;
  const buttons=[...document.querySelectorAll('#noticeActions button')];buttons.forEach(b=>b.disabled=true);
  try{const result=await window.metaBot?.noticeAction?.(currentNotice.id,action);if(!result?.ok)throw Error(result?.error||'操作失败');}catch(error){document.getElementById('noticeError').textContent=error.message;}finally{noticeBusy=false;buttons.forEach(b=>b.disabled=false);}
};
document.querySelector('main').onpointerenter=()=>window.metaBot?.noticeHover?.(true).catch(()=>{});
document.querySelector('main').onpointerleave=()=>window.metaBot?.noticeHover?.(false).catch(()=>{});
document.getElementById('updateToastOpen').onclick=()=>window.metaBot?.openUpdates?.();
document.getElementById('updateToastLater').onclick=()=>window.metaBot?.dismissUpdate?.(false);
window.metaBot?.onPanelPhase?.(detail=>window.MetaBotPanelMotion?.play(detail));
