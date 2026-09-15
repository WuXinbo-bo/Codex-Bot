(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MetaBotCompanion=api;})(typeof self!=='undefined'?self:globalThis,function(){
  const GAMES=[
    ['catch','你抛我接','点中亮起的小球，机器人会接住它',20,'toss'],
    ['hands','星星藏哪边','记住亮星的一侧，等藏好后再选',20,'magic'],
    ['mirror','镜像模仿','移动到与目标左右对称的位置',20,'mimic'],
    ['balance','头顶平衡','让指针保持在中间，稳住软方块',20,'balance'],
    ['stretch','一起伸展','跟随提示按住、松开，一起伸懒腰',24,'stretch'],
    ['trace','描一条小路','按顺序触碰四个编号点',25,'trace'],
    ['five','给我五','等手掌亮起再击掌',18,'greet'],
    ['rhythm','桌边节拍','节拍亮起时轻点圆点',24,'drums'],
    ['sort','卡片归位','把卡片送进相同颜色的盒子',25,'organize'],
    ['stack','软块叠高','方块经过中央时点一下，把它放稳',20,'balance'],
    ['water','一起浇花','按住水壶，在水位到达绿线时松开',20,'cup'],
    ['plane','纸飞机投递','从左边拖向邮筒，松手送出纸飞机',25,'fold']
  ].map(([id,label,hint,seconds,clip])=>({id,label,hint,seconds,clip}));
  const SPACES={stool:'折叠小凳',mat:'工作垫',lamp:'小台灯',box:'收纳箱',plant:'小盆栽',tray:'道具托盘'};
  const copy=value=>JSON.parse(JSON.stringify(value));
  const turnKey=t=>JSON.stringify([t.source,t.id,t.turnId||'']);
  const finite=(n,min,max)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Number(n))):min;
  class Companion {
    constructor(saved={},options={}){
      this.now=options.now||Date.now;this.random=options.random||Math.random;
      this.state={enabled:true,mouse:true,space:'mat',sleeping:false,focusUntil:0,timer:null,notes:[],alerts:[],history:[],records:[],day:'',pinned:null,wateredAt:0,...copy(saved)};
      for(const key of ['notes','alerts','history','records'])this.state[key]=Array.isArray(this.state[key])?this.state[key].slice(-50):[];
      if(!Object.hasOwn(SPACES,this.state.space))this.state.space='mat';
      this.tasks=[];this.game=null;this.effects=[];this.lastCue=0;this.lastGame=null;this.seen=new Set();this.lastWork=0;
    }
    export(){return copy(this.state);}
    cue(name,priority=35){if(this.state.enabled&&!this.state.sleeping){this.effects.push({name,priority});this.effects=this.effects.slice(-12);}}
    emit(name,priority=35){this.cue(name,priority);this.lastCue=this.now();}
    quiet(){return this.state.sleeping||this.state.focusUntil>this.now();}
    snapshot(){return {...this.export(),tasks:this.tasks.filter(e=>e.active).map(e=>({key:e.key,turn:turnKey(e.task),title:e.task.title,status:e.task.status,active:e.active})),game:this.gameView(),lastResult:this.lastResult||'',focused:this.state.focusUntil>this.now()};}
    update(view){this.tasks=view.tasks||[];}
    record(task){const key=turnKey(task);let r=this.state.records.find(r=>r.key===key);if(!r){r={key,started:this.now(),failed:false,type:/测试|test|debug|bug|修复/i.test(task.title||'')?'inspect':/文档|readme|写作|整理/i.test(task.title||'')?'document':/分析|研究|检索|research/i.test(task.title||'')?'research':'code'};this.state.records.push(r);this.state.records=this.state.records.slice(-50);}return r;}
    lifecycle(events,entries){
      for(const event of events){
        if(this.seen.has(event.id))continue;this.seen.add(event.id);if(this.seen.size>256)this.seen.delete(this.seen.values().next().value);
        const task=entries.get(event.taskId)?.task;if(!task)continue;
        if(this.game)this.endGame('任务有新进展，先照看任务');
        const r=this.record(task),key=turnKey(task);
        if(['started','joined','resumed'].includes(event.kind)){
          this.state.sleeping=false;
          const day=new Date(this.now()).toLocaleDateString('en-CA');
          event.companionCue=this.state.day!==day?'work_open':event.kind==='joined'?'work_join':event.kind==='resumed'?'work_resume':'work_'+r.type;
          this.state.day=day;this.lastWork=this.now();
        }
        if(event.kind==='failed'){r.failed=true;event.companionCue='work_retry';}
        if(event.kind==='completed'){
          event.companionCue=r.failed?'work_recovered':this.now()-r.started>300000?'work_relief':'work_review';
          if(!this.state.history.some(h=>h.key===key))this.state.history.unshift({key,task:{source:task.source,id:task.id,turnId:task.turnId},title:String(task.title||task.id).slice(0,300),at:this.now()});
          this.state.history=this.state.history.slice(0,20);
          for(const note of this.state.notes.filter(n=>n.turn===key))this.alert('note:'+note.id,'便签：'+note.text);
          this.state.notes=this.state.notes.filter(n=>n.turn!==key);
        }
        if(!this.state.enabled)delete event.companionCue;
      }
    }
    alert(id,title){if(!this.state.alerts.some(a=>a.id===id))this.state.alerts.push({id,title,at:this.now()});this.state.alerts=this.state.alerts.slice(-30);}
    tick({ambient=true}={}){
      let dirty=false;const now=this.now();
      if(this.state.timer&&now>=this.state.timer.until){this.alert('timer:'+this.state.timer.id,'沙漏计时结束');this.state.timer=null;this.emit('timer_done',45);dirty=true;}
      if(this.state.focusUntil&&now>=this.state.focusUntil){this.alert('focus:'+this.state.focusUntil,'专注时段结束，可以伸展一下');this.state.focusUntil=0;this.emit('stretch',35);dirty=true;}
      if(this.game&&now>=this.game.ends)this.endGame('小互动结束');
      if(ambient&&this.state.enabled&&!this.quiet()&&!this.game&&now-this.lastWork>45000&&now-this.lastCue>15000){
        const active=this.tasks.find(t=>t.key===this.state.pinned&&t.active)||this.tasks.find(t=>t.active&&t.fresh);
        if(active){const r=this.record(active.task);this.emit(now-r.started>180000?'work_rest':now-r.started>60000?'work_wait':'work_'+r.type,15);}
        else this.emit('space_'+this.state.space,10);
        this.lastWork=now;
      }
      return dirty;
    }
    command(action,value={}){
      const now=this.now();
      if(action==='preferences'){
        for(const k of ['enabled','mouse'])if(typeof value[k]==='boolean')this.state[k]=value[k];
        if(value.space){if(!Object.hasOwn(SPACES,value.space))throw Error('未知生活物件');this.state.space=value.space;this.emit('space_'+value.space);}
        if(!this.state.enabled)this.endGame('陪伴已关闭');
      }else if(action==='focus'){
        const minutes=finite(value.minutes,0,120);this.state.focusUntil=minutes?now+minutes*60000:0;if(minutes)this.endGame('专注时段开始');this.emit(minutes?'focus_on':'pack',40);
      }else if(action==='timer'){
        const minutes=finite(value.minutes,0,120);this.state.timer=minutes?{id:String(now),until:now+minutes*60000}:null;this.emit('timer_set');
      }else if(action==='note'){
        const entry=this.tasks.find(e=>e.key===value.key&&e.active);const text=String(value.text||'').trim().slice(0,160);
        if(!entry||!text)throw Error('请选择进行中的任务并填写便签');
        const turn=turnKey(entry.task);this.state.notes=this.state.notes.filter(n=>n.turn!==turn);this.state.notes.push({id:turn+':'+now,turn,text});this.state.notes=this.state.notes.slice(-30);this.emit('note');
      }else if(action==='remove-note'){this.state.notes=this.state.notes.filter(n=>n.id!==value.id);
      }else if(action==='pin'){
        if(value.key&&!this.tasks.some(e=>e.key===value.key&&e.active))throw Error('任务已不在进行中');this.state.pinned=value.key||null;this.emit('flag');
      }else if(action==='water'){this.state.wateredAt=now;this.emit('water');
      }else if(action==='sleep'){this.endGame('收拾好了，下次再玩');this.emit('pack',45);this.state.sleeping=true;
      }else if(action==='wake'){this.state.sleeping=false;this.emit('work_open',40);
      }else if(action==='ack'){this.state.alerts=this.state.alerts.filter(a=>a.id!==value.id);this.emit('file',40);
      }else if(action==='game'){this.startGame(value.id);
      }else if(action==='game-input'){this.input(value);
      }else if(action==='game-stop'){this.endGame('小物件已收好');
      }else throw Error('未知陪伴操作');
      return this.snapshot();
    }
    startGame(id){
      if(!this.state.enabled||this.quiet())throw Error('先结束专注或唤醒机器人，再开始小互动');
      if(this.tasks.some(e=>e.fresh&&['needs_attention','failed'].includes(e.task.status)&&e.unread))throw Error('先处理任务提醒，再来玩');
      if(id==='random'){const choices=GAMES.filter(g=>g.id!==this.lastGame);id=choices[Math.floor(this.random()*choices.length)].id;}
      const spec=GAMES.find(g=>g.id===id);if(!spec)throw Error('未知小游戏');
      this.game={id,started:this.now(),ends:this.now()+spec.seconds*1000,score:0,round:0,seed:this.random(),lastHit:-10000,holding:null,trace:0,message:spec.hint};this.lastGame=id;this.emit(spec.clip,40);
    }
    gameView(){
      if(!this.game)return null;const g=this.game,t=(this.now()-g.started)/1000;
      return {...g,remaining:Math.max(0,Math.ceil((g.ends-this.now())/1000)),phase:Math.floor(t/2)%2,target:20+((g.round*37+Math.floor(g.seed*40))%60),moving:50+35*Math.sin(t*1.5),beat:t%2,level:g.holding?Math.min(100,(this.now()-g.holding)/20):0};
    }
    input(value){
      if(!this.game)return false;
      if(this.now()>=this.game.ends){this.endGame('小互动结束');return false;}
      const g=this.game,v=this.gameView(),now=this.now(),x=finite(value.x,0,100),y=finite(value.y,0,100),kind=value.kind;
      if(kind==='cancel'){g.holding=null;g.origin=null;return false;}
      if(!['click','move','down','up'].includes(kind))return false;
      let hit=false,attempt=false;
      if(['water','stretch'].includes(g.id)){
        if(kind==='down'&&g.holding===null)g.holding=now;
        if(kind==='up'&&g.holding!==null){const duration=now-g.holding;g.holding=null;attempt=true;hit=g.id==='water'?duration>=1200&&duration<=1800:duration>=1800&&duration<=3500;}
      }else if(g.id==='plane'){
        if(kind==='down')g.origin={x,y};
        if(kind==='up'&&g.origin){attempt=true;hit=g.origin.x<35&&x>70&&Math.abs(y-50)<25;g.origin=null;}
      }else if(g.id==='mirror'||g.id==='balance'){
        if(kind==='move'||kind==='click'){const target=g.id==='mirror'?100-v.target:50;attempt=true;hit=Math.abs(x-target)<12&&now-g.lastHit>650;}
      }else if(kind==='click'){
        attempt=true;
        if(g.id==='catch')hit=Math.abs(x-v.target)<16&&Math.abs(y-50)<30;
        if(g.id==='hands'){hit=v.beat>.8&&((x<50?0:1)===(g.round+Math.floor(g.seed*10))%2);if(v.beat<=.8)attempt=false;}
        if(g.id==='trace'){const point=[[20,25],[80,25],[80,75],[20,75]][g.trace%4];hit=Math.hypot(x-point[0],y-point[1])<23;if(hit)g.trace++;}
        if(g.id==='five')hit=v.beat>.9&&v.beat<1.7;
        if(g.id==='rhythm')hit=v.beat<.45||v.beat>1.8;
        if(g.id==='sort')hit=(x<50?0:1)===g.round%2;
        if(g.id==='stack')hit=Math.abs(v.moving-50)<14;
      }
      if(hit&&now-g.lastHit>=250){g.score++;g.round++;g.lastHit=now;g.message=['接住了！','配合得很好','再来一次'][g.score%3];this.emit(g.score%3?'game_hit':'game_proud',40);}
      else if(attempt&&!['move'].includes(kind))g.message='差一点，慢慢来';
      return hit;
    }
    endGame(reason){if(this.game){this.lastResult=reason+' · 配合 '+this.game.score+' 次';this.game=null;this.effects.push({name:'pack',priority:30});}}
  }
  return {Companion,GAMES,SPACES,turnKey};
});
