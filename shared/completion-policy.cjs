const normalize = (v={}) => ({
 autoCloseCompletions:v.autoCloseCompletions===true,
 completionCloseMinutes:[1,5,15,30].includes(Number(v.completionCloseMinutes))?Number(v.completionCloseMinutes):15,
 completionEscalation:['off','gentle','standard','angry'].includes(v.completionEscalation)?v.completionEscalation:'standard',
 boardAnimation:v.boardAnimation!==false
});
function evaluate(item,preferences,now=Date.now()) {
 const p=normalize(preferences),age=Math.max(0,now-(Number(item.receivedAt)||now));
 const hidden=p.autoCloseCompletions&&age>=p.completionCloseMinutes*60000;
 const thresholds=[120000,300000,600000,1200000];
 const max={off:0,gentle:1,standard:3,angry:4}[p.completionEscalation];
 const stage=Math.min(max,thresholds.filter(t=>age>=t).length);
 return {hidden,stage,age};
}
module.exports={normalize,evaluate};
