const fs=require('node:fs'),path=require('node:path');
const A=require('../src/m1-activities'),R=require('../src/m1-rig'),P=require('../src/appearance'),B=require('../src/base-emotions'),M=require('../src/mask-system');
const root=path.resolve(__dirname,'..');
const legacy={receive:'接住任务',prepare:'开工准备',keyboard:'交替敲键',deliver:'递交成果',finish_check:'检查完成',pack_up:'收工整理',research:'戴镜研究',caught:'走神被发现',ponder:'认真思考',dizzy:'转晕扶正',lifted:'举起后回应',stretch:'舒展身体',shades:'戴上墨镜',magic:'小魔术',dance:'轻快舞步',nap:'困到点头',hero:'交付时刻',attention:'等待指示',affection:'亲近回应',toss:'抛接方块',fold:'折纸飞机',balance:'平衡练习',cup:'捧杯休息',tidy:'整理自己',mimic:'模仿指针',compare:'左右对照',trace:'沿线推演',organize:'归整资料',inspect:'放大检查',detective:'小侦探',drums:'无声鼓点',cards:'整理卡片',paint:'小画家',rain:'撑伞时刻',gift:'拆开礼物',failed:'停下检查',wake:'醒来看看',greet:'再次见面'};
const label=id=>A.LABELS[id]||legacy[id]||id;
const chunks=(list,n)=>Array.from({length:Math.ceil(list.length/n)},(_,i)=>list.slice(i*n,(i+1)*n));
function activity(id,index){
  const frames=A.CLIPS[id];if(!frames)throw Error('Missing activity '+id);
  if(index==null){
    const candidates=frames.map((f,i)=>({f,i})).filter(({f,i})=>i>0&&i<frames.length-1&&!['prepare','stow','exit','enter'].includes(f.phase));
    const weight=({f,i})=>Object.values(f.pose.accessories||{}).filter(p=>p.opacity>0&&!p.back).length*3+(f.phase==='turn'?2:0)-Math.abs(i-frames.length*.5)*.3;
    candidates.sort((a,b)=>weight(b)-weight(a));index=candidates[0]?.i||1;
  }
  return {kind:'activity',id,index,label:label(id),duration:A.duration(id)};
}
function buildCatalog(){
  const sheets=[];
  const add=(id,title,entries,subtitle='')=>sheets.push({id,title,subtitle,entries});
  const expression=(id,label)=>({kind:'expression',id,label:label||B.entries[id]?.label||id});
  chunks(Object.entries(B.families),12).forEach((list,i)=>add('emotions-'+(i+1),i?'不止开心，也会有小情绪':'每一种情绪，都有自己的眼神',list.map(([id,f])=>expression('base_'+id+'_3',f.label))));
  add('thoughts','没有说出口的小心思',Object.entries(B.entries).filter(([,e])=>e.mixed).map(([id,e])=>expression(id,e.label)));
  const tasks=['started','running','completed','attention','failed','stopped'].flatMap(route=>A.PERFORMANCES[route].filter(id=>id.startsWith('activity_')).slice(0,4).map(id=>activity('performance_'+id)));
  chunks(tasks,8).forEach((entries,i)=>add('work-'+(i+1),['接到任务，就进入状态','把成果交给你，等你回应','遇到问题，也认真对待'][i],entries));
  add('mouse','你靠近的时候，它也会注意到',Object.keys(A.Scores.meta).filter(id=>A.Scores.meta[id].type==='social').filter((_,i)=>i%2===0).map(id=>activity(id)));
  add('panels','面板也是它手里的工作',Object.keys(A.Scores.meta).filter(id=>A.Scores.meta[id].type==='panel').filter((_,i)=>i%2===0).map(id=>activity(id)));
  const props=['pencil','notebook','folder','paperclip','tapeMeasure','eraser','flashlight','compass','puzzle','spool','tray','bookmark','bell','pinwheel','yoyo','balloon','springToy','blanket','fan','handwarmer','plant','drawing','umbrella','topHat'];
  chunks(props,12).forEach((list,i)=>add('props-'+(i+1),i?'工作之外，也有自己的小活动':'道具不是摆设，是小活动的主角',list.map(prop=>activity(Object.keys(A.Scores.meta).find(id=>A.Scores.meta[id].type==='emotion'&&A.Scores.meta[id].prop===prop)))));
  chunks(M.names,12).forEach((list,i)=>add('masks-'+(i+1),i?'另一种心情，另一张面具':'掏出来，戴上去',list.map(id=>({kind:'mask',id,label:M.MASKS[id].label}))));
  const skins={lemon:'柠檬黄',green:'清新绿',ocean:'海洋蓝',sunset:'日落橙',pink:'柔粉',violet:'浅紫',night:'夜色',neon:'薄荷青'};
  add('skins','从柠檬黄开始，选一种喜欢的颜色',Object.entries(skins).map(([skin,label])=>({kind:'expression',id:'neutral',label,appearance:{skin}})));
  const shapes=['圆团','软方块','圆角三角','圆角五边','圆角六边','圆润星星','水滴','胶囊','云朵','软菱形','花朵','软团','扁饼','豆形','铃铛','风筝','软垫','弹力团'];
  chunks(P.SHAPES,12).forEach((list,i)=>add('shapes-'+(i+1),'圆润的身体，也能换个样子',list.map(shape=>({kind:'expression',id:'neutral',label:shapes[P.SHAPES.indexOf(shape)],appearance:{shape}}))));
  add('styles','四种保留画风',Object.entries(P.ART_STYLES).map(([artStyle,style])=>({kind:'expression',id:'confident',label:style.label,appearance:{artStyle,shape:artStyle==='clay'?'blob':'circle',eyeStyle:'auto'}})));
  chunks(Object.entries(P.EYE_PRESETS),8).forEach((list,i)=>add('eyes-'+(i+1),'同一张脸，也有不同的眼神',list.map(([eyeStyle,e])=>({kind:'expression',id:'neutral',label:e.label,appearance:{eyeStyle}}))));
  const symbols=['星星眼','爱心眼','螺旋眼','挤挤眼','横线眼','叉叉眼','点点眼','泪滴眼'];
  add('symbols','偶尔出现的特殊眼睛',R.SYMBOLS.map((id,i)=>({kind:'symbol',id,label:symbols[i]})));
  const accents=['淡红晕','斜线红晕','渐热红晕','眼底水光','含住泪珠','柔亮高光','紧张汗滴','滑落汗滴','细小紧张汗','迟疑线','压力线','圆钝不满','淡蓝额色','眼下疲态','面颊暖色','灵光','问号','停顿点'];
  chunks(B.accentNames,12).forEach((list,i)=>add('accents-'+(i+1),'不需要嘴巴，也能看出情绪',list.map(id=>({kind:'accent',id,label:accents[B.accentNames.indexOf(id)]}))));
  for(const [i,id] of ['theater_activity_safe_now','theater_activity_bashful_pride'].entries())add('story-'+(i+1),label(id),[1,2,3,4,5,6].map((index,i)=>({...activity(id,index),label:['起意','尝试','转折','停一停','回应','收住'][i]})),'约 15 秒连续编排 · 六个片段');
  const reactions=new Set(Object.values(A.REACTIONS).flat());
  const groups={emotion:{title:'情绪活动',entries:[]},task:{title:'任务表演',entries:[]},panel:{title:'面板交互',entries:[]},social:{title:'鼠标互动',entries:[]},story:{title:'连续剧场与接续',entries:[]},everyday:{title:'日常与其他活动',entries:[]}};
  for(const id of Object.keys(A.CLIPS)){
    const meta=A.Scores.meta[id];
    const type=meta?.type==='emotion'?'emotion':id.startsWith('performance_')?'task':meta?.type==='panel'?'panel':A.THEATERS[id]||meta?.type==='continuation'?'story':reactions.has(id)?'social':'everyday';
    groups[type].entries.push(activity(id));
  }
  const pages=[];
  for(const [group,{title,entries}] of Object.entries(groups))chunks(entries,12).forEach((entries,i)=>pages.push({id:group+'-'+String(i+1).padStart(2,'0'),group,title:title+' / '+(i+1),subtitle:'代表性关键帧 · 活动编号见下方索引',entries}));
  return {schema:1,counts:{activities:Object.keys(A.CLIPS).length,poses:Object.keys(R.EXPRESSIONS).length,theaters:Object.keys(A.THEATERS).length,continuations:4,props:R.ACCESSORIES.length,featured:sheets.reduce((n,s)=>n+s.entries.length,0)},sheets,pages};
}
function writeCatalog(){
  const catalog=buildCatalog(),dir=path.join(root,'docs/gallery');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
  const index=['# 完整活动图鉴','','[返回 README](../../README.md)','','435 套活动，按类别分页展示。每张图是当前渲染器生成的代表性关键帧，不是独立的新增表情素材。','','约 15 秒编排包含 44 套自主剧场和 4 套情境接续；任务、面板和鼠标活动按真实事件触发。静态图不能代表完整时序。','','| 分类 | 活动数 | 分页 |','| --- | ---: | --- |'];
  for(const group of [...new Set(catalog.pages.map(p=>p.group))]){
    const pages=catalog.pages.filter(p=>p.group===group),count=pages.reduce((n,p)=>n+p.entries.length,0);
    index.push(`| ${pages[0].title.split(' / ')[0]} | ${count} | ${pages.map((p,i)=>`[${i+1}](${p.id}.md)`).join(' · ')} |`);
    pages.forEach((p,i)=>{
      const nav=`[图鉴目录](README.md) · [项目首页](../../README.md)${pages[i-1]?` · [上一页](${pages[i-1].id}.md)`:''}${pages[i+1]?` · [下一页](${pages[i+1].id}.md)`:''}`;
      fs.writeFileSync(path.join(dir,p.id+'.md'),[`# ${p.title}`,'',nav,'',`![${p.title}，${p.entries.length} 套活动](../assets/atlas/${p.id}.webp)`,'','| 活动 | 编号 | 基准时长 |','| --- | --- | ---: |',...p.entries.map(e=>`| ${e.label} | \`${e.id}\` | ${(e.duration/1000).toFixed(2)} 秒 |`),'',nav,''].join('\n'));
    });
  }
  index.push('','本地播放：启动项目静态服务器后，在 `test/fixtures/m1-visual.html` 搜索上表中的活动编号。GitHub 上的图鉴无需启动程序即可浏览。','');
  fs.writeFileSync(path.join(dir,'README.md'),index.join('\n'));return catalog;
}
module.exports={buildCatalog,writeCatalog};
if(require.main===module){const c=writeCatalog();console.log(JSON.stringify({featured:c.counts.featured,sheets:c.sheets.length,activities:c.counts.activities,pages:c.pages.length}));}
