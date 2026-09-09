class NoticeLane {
  constructor(now=Date.now){this.now=now;this.queue=[];this.urgent=[];this.index=0;this.started=null;this.key=null;}
  push(notice){if(this.queue.some(n=>n.id===notice.id))return;this.queue.push({...notice,created:this.now()});this.queue=this.queue.slice(-8);}
  reconcile(view){
    const next=[];
    for(const e of view.tasks||[])if(['needs_attention','failed'].includes(e.task.status)&&e.unread&&!e.snoozedUntil){
      next.push({id:e.eventId,key:e.key,title:e.task.title,task:e.task,persistent:true,label:e.task.status==='failed'?'任务失败':'需要你处理',stale:!e.fresh});
    }
    this.urgent=next;this.index=Math.min(this.index,Math.max(0,next.length-1));
    const terminal=new Set((view.tasks||[]).filter(e=>['completed','failed','stopped'].includes(e.task.status)).map(e=>e.key));
    this.queue=this.queue.filter(n=>!n.taskIds?.every(id=>terminal.has(id)));
  }
  peek(){
    this.queue=this.queue.filter(n=>this.now()-n.created<30000);
    const notice=this.urgent[this.index]||this.queue[0]||null;
    if(notice?.id!==this.key){this.key=notice?.id||null;this.started=null;}
    return notice?{...notice,count:notice.persistent?this.urgent.length:notice.count,index:this.index}:null;
  }
  presented(visible){if(!visible){this.started=null;return;}if(this.started===null)this.started=this.now();}
  remaining(){const n=this.peek();return !n||n.persistent?null:Math.max(0,(n.duration||4000)-(this.started===null?0:this.now()-this.started));}
  expire(id){if(this.peek()?.id===id&&!this.peek().persistent)this.queue=this.queue.filter(n=>n.id!==id);}
  removeUpdates(){this.queue=this.queue.filter(n=>!n.update);}
  next(){if(this.urgent.length)this.index=(this.index+1)%this.urgent.length;this.started=null;}
}
module.exports={NoticeLane};
