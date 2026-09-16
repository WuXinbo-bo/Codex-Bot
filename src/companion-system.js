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
  const finite=(n,min,max)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Number(n))):min;
  class Companion {
    constructor(saved={},options={}){
      this.now=options.now||Date.now;this.random=options.random||Math.random;
      this.state={enabled:saved.enabled!==false,mouse:saved.mouse!==false};
      this.tasks=[];this.game=null;this.effects=[];this.lastGame=null;
    }
    export(){return {...this.state};}
    emit(name,priority=35){if(this.state.enabled){this.effects.push({name,priority});this.effects=this.effects.slice(-12);}}
    snapshot(){return {...this.export(),game:this.gameView(),lastResult:this.lastResult||''};}
    update(view){this.tasks=view.tasks||[];}
    lifecycle(events){if(events.length&&this.game)this.endGame('任务有新进展，先照看任务');}
    tick(){if(this.game&&this.now()>=this.game.ends)this.endGame('小互动结束');}
    command(action,value={}){
      if(action==='preferences'){
        for(const k of ['enabled','mouse'])if(typeof value[k]==='boolean')this.state[k]=value[k];
        if(!this.state.enabled)this.endGame('陪伴已关闭');
      }else if(action==='game'){this.startGame(value.id);
      }else if(action==='game-input'){this.input(value);
      }else if(action==='game-stop'){this.endGame('小物件已收好');
      }else throw Error('未知陪伴操作');
      return this.snapshot();
    }
    startGame(id){
      if(!this.state.enabled)throw Error('先开启小互动');
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
    endGame(reason){if(this.game){this.lastResult=reason+' · 配合 '+this.game.score+' 次';this.game=null;}}
  }
  return {Companion,GAMES};
});
