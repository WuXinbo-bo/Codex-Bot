(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.MetaBotCompanionMemory=factory();
})(typeof self!=='undefined'?self:globalThis,function(){
  function create(now=Date.now){
    let rehearsed=false,stored=null,storedUntil=0,afterglow=0,completed=0,lastStory=-Infinity,cursor=0;
    function observe(event,name){
      if(event==='finished'){
        lastStory=now();
        if(name==='story_practice')rehearsed=true;
        if(name==='story_delivery')rehearsed=false;
        if(name==='story_cleanup')completed=0;
        if(['story_return_letter','story_resume_cube'].includes(name))stored=null;
      }
      if(event==='interrupted'&&name==='story_letter'){stored='letter';storedUntil=now()+600000;}
      if(event==='noticed'&&name==='story_fidget'){stored='cube';storedUntil=now()+120000;lastStory=now();return 'story_hide_cube';}
      if(event==='completed'){completed=Math.min(3,completed+1);afterglow=now()+16000;return rehearsed?'story_delivery':null;}
      if(event==='confirmed'){afterglow=0;return 'story_acknowledge';}
      return null;
    }
    function next(status,near){
      if(stored&&now()>storedUntil)stored=null;
      if(!['idle','offline','completed'].includes(status)||near||now()-lastStory<45000)return null;
      if(completed>=3)return 'story_cleanup';
      if(stored)return stored==='letter'?'story_return_letter':'story_resume_cube';
      return ['story_practice','story_fidget','story_letter'][cursor%3];
    }
    function started(name){lastStory=now();if(['story_practice','story_fidget','story_letter'].includes(name))cursor++;}
    return {observe,next,started,reset(){rehearsed=false;stored=null;completed=0;afterglow=0;lastStory=now();},snapshot:()=>({rehearsed,stored:now()<storedUntil?stored:null,completed,afterglow:now()<afterglow})};
  }
  return {create};
});
