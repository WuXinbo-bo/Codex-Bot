(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MetaBotTaskRelay=api;})(typeof self!=='undefined'?self:globalThis,function(){
  // Navigation never acknowledges an item. The persisted inbox remains authoritative.
  function create(){let items=[],selected=null;return{
    update(next){const oldIndex=items.findIndex(item=>item.id===selected);items=[...new Map(next.filter(item=>item?.id).map(item=>[item.id,item])).values()];if(!items.some(item=>item.id===selected))selected=items[Math.min(Math.max(oldIndex,0),items.length-1)]?.id||null;return this.view();},
    move(delta){if(items.length){const i=items.findIndex(item=>item.id===selected);selected=items[(i+delta+items.length)%items.length].id;}return this.view();},
    view(){return{item:items.find(item=>item.id===selected)||null,index:items.findIndex(item=>item.id===selected),total:items.length};}
  };}return{create};
});
