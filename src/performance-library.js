(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./m1-activities.js'));
  else root.MetaBotPerformanceLibrary=factory(root.MetaBotActivities);
})(typeof self!=='undefined'?self:globalThis,function(Activities){
  const valid=name=>typeof name==='string'&&Object.hasOwn(Activities.CLIPS,name);
  function normalize(value={}){
    const result={};
    for(const [name,item] of Object.entries(value||{}))if(valid(name)&&item&&typeof item==='object')result[name]={seen:item.seen===true,completed:Math.max(0,Math.min(9999,Math.floor(Number(item.completed)||0))),favorite:item.favorite===true,frequency:item.frequency==='less'?'less':'normal'};
    return result;
  }
  function record(value,name,complete){
    const next=normalize(value);if(!valid(name))return next;
    const item=next[name]||{seen:false,completed:0,favorite:false,frequency:'normal'};
    next[name]={...item,seen:true,completed:Math.min(9999,item.completed+(complete?1:0))};return next;
  }
  function preference(value,name,change){
    if(!valid(name))throw Error('未知表演');
    const next=normalize(value),item=next[name]||{seen:false,completed:0,favorite:false,frequency:'normal'};
    next[name]={...item,...(typeof change?.favorite==='boolean'?{favorite:change.favorite}:{}),...(['normal','less'].includes(change?.frequency)?{frequency:change.frequency}:{})};return next;
  }
  function catalog(value){const records=normalize(value);return Object.keys(Activities.CLIPS).map(name=>({name,label:Activities.LABELS[name]||name,...(records[name]||{seen:false,completed:0,favorite:false,frequency:'normal'})}));}
  return {normalize,record,preference,catalog,valid};
});
