window.metaBot?.onInteraction(detail => {
  document.getElementById('updateToastActions').hidden=!detail.update;
  document.getElementById("label").textContent = `${detail.label || ""}${detail.count > 1 ? ` · ${detail.count} 项` : ""}`;
  document.getElementById("title").textContent = detail.title || "";
});
document.getElementById('updateToastOpen').onclick=()=>window.metaBot?.openUpdates?.();
document.getElementById('updateToastLater').onclick=()=>window.metaBot?.dismissUpdate?.(false);
window.metaBot?.onPanelPhase?.(detail=>window.MetaBotPanelMotion?.play(detail));
