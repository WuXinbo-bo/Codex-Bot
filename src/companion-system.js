(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MetaBotCompanion=api;})(typeof self!=='undefined'?self:globalThis,function(){
  // Ignore retired game state while preserving the independent mouse preference.
  class Companion {
    constructor(saved={},options={}){this.now=options.now||Date.now;this.state={mouse:saved.mouse!==false};this.quietUntil=0;}
    export(){return {...this.state};}
    snapshot(){return {...this.export(),quietUntil:this.quietUntil>this.now()?this.quietUntil:0};}
    command(action,value={}){
      if(action==='preferences'){if(typeof value.mouse==='boolean')this.state.mouse=value.mouse;}
      else if(action==='quiet'){
        if(![0,15,30,60].includes(value.minutes))throw Error('请选择有效的安静时长');
        this.quietUntil=value.minutes?this.now()+value.minutes*60000:0;
      }else throw Error('未知陪伴操作');
      return this.snapshot();
    }
  }
  return {Companion};
});
