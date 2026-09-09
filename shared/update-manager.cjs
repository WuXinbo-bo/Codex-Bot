const normalize = value => ({
  autoCheck: value?.autoCheck !== false,
  autoDownload: value?.autoDownload === true,
  notifications: value?.notifications !== false,
  ignoredVersion: typeof value?.ignoredVersion === 'string' ? value.ignoredVersion : '',
  remindAfter: Number.isFinite(value?.remindAfter) ? value.remindAfter : 0
});

function createUpdateManager({invoke,publish,persist,initial={},now=Date.now,random=Math.random,setTimeout:schedule=setTimeout,clearTimeout:cancel=clearTimeout,beforeInstall=async()=>{}}){
  let preferences=normalize(initial),state={phase:'idle',currentVersion:'',configured:false},flight=null,timer=null,stopped=false;
  const emit=patch=>{state={...state,...patch};publish({...state,preferences});return state;};
  const eligible=()=>preferences.notifications&&state.version!==preferences.ignoredVersion&&now()>=preferences.remindAfter;
  async function run(operation){
    if(flight)return flight;
    flight=operation().catch(error=>emit({phase:'error',error:String(error.message||error)})).finally(()=>{flight=null;});
    return flight;
  }
  async function download(){
    return run(async()=>{
      if(!state.version||!['available','error'].includes(state.phase))return state;
      emit({phase:'downloading',error:null,received:0,total:null});
      await invoke('update-download');
      return emit({phase:'ready',notify:eligible()});
    });
  }
  async function check(manual=false){
    if(flight)return flight;
    if(['ready','installing'].includes(state.phase))return emit({notify:manual||eligible()});
    await run(async()=>{
      emit({phase:'checking',error:null,notify:false});
      const info=await invoke('update-info');emit(info);
      if(!info.configured)return emit({phase:'unconfigured'});
      const update=await invoke('update-check');
      if(!update)return emit({phase:'current',version:null,notes:null,checkedAt:now()});
      return emit({...update,phase:'available',checkedAt:now(),notify:manual||eligible()});
    });
    if(state.phase==='available'&&preferences.autoDownload&&state.version!==preferences.ignoredVersion)await download();
    return state;
  }
  function plan(delay=12*3600000+random()*1800000){
    if(timer!==null)cancel(timer);
    if(stopped||!preferences.autoCheck)return;
    timer=schedule(async()=>{timer=null;await check();plan();},delay);
  }
  return {
    async start(){emit(await invoke('update-info'));plan(30000+random()*30000);},
    snapshot:()=>({...state,preferences}),check,download,
    progress:value=>{if(state.phase==='downloading')emit(value);},
    async preferences(value){preferences=normalize({...preferences,...value});await persist(preferences);emit({notify:false});plan();return {ok:true};},
    async dismiss(ignore=false){preferences=normalize({...preferences,...(ignore?{ignoredVersion:state.version}:{remindAfter:now()+24*3600000})});await persist(preferences);emit({notify:false});return {ok:true};},
    async install(){return run(async()=>{if(state.phase!=='ready')throw Error('更新包尚未准备好');await beforeInstall();emit({phase:'installing',notify:false});await invoke('update-install');return state;});},
    stop(){stopped=true;if(timer!==null)cancel(timer);timer=null;}
  };
}
module.exports={normalize,createUpdateManager};
