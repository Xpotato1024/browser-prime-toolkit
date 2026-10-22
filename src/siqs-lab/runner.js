import {planLanes} from './contracts.js';
export const LAB_VARIANTS=Object.freeze({
 base:{stride:1024,clockEvery:1,probes:0,audit:1,parameter:0},
 'audit-off':{stride:1024,clockEvery:1,probes:0,audit:0,parameter:0},
 probes:{stride:1024,clockEvery:1,probes:1,audit:1,parameter:0},
 clock16:{stride:1024,clockEvery:16,probes:0,audit:1,parameter:0},
 stride16k:{stride:16384,clockEvery:1,probes:0,audit:1,parameter:0},
 fb80:{stride:1024,clockEvery:1,probes:0,audit:1,parameter:1},
 interval50:{stride:1024,clockEvery:1,probes:0,audit:1,parameter:2},
 lp75:{stride:1024,clockEvery:1,probes:0,audit:1,parameter:3}
});
export function createLabRunner({createWorker,now=()=>performance.now(),schedule=setTimeout,unschedule=clearTimeout}={}){
 if(typeof createWorker!=='function')throw TypeError('Lab worker factory');
 let active=null,disposed=false,sequence=0;
 const cancel=()=>active?.finish('cancelled');
 async function run(input,options={}){
  if(disposed||active)throw Error('Lab runner unavailable');
  if(typeof input!=='string'||!/^[1-9][0-9]{0,99}$/.test(input)||BigInt(input)<(1n<<63n)||BigInt(input)>=(1n<<332n)||(BigInt(input)&1n)===0n)return {kind:'unsupported',workers:0,allWorkersDisposed:true};
  const {workers=1,streams=1,seed=1,variant='base',operationBudget=10000000000,timeBudgetMs=3000}=options;
  if(Object.keys(options).some(k=>!['workers','streams','seed','variant','operationBudget','timeBudgetMs','blockQuota'].includes(k)))throw TypeError('Lab option');
  const plan=planLanes({workers,operationBudget,timeBudgetMs}),settings=LAB_VARIANTS[variant];
  if(!Object.hasOwn(LAB_VARIANTS,variant)||![1,2].includes(streams)||(workers===2&&streams!==2)||![1,11].includes(seed))throw RangeError('Lab plan');
  const blockQuota=options.blockQuota??0;
  if(!Number.isInteger(blockQuota)||blockQuota<0||blockQuota>4096)throw RangeError('Lab block quota');
  const collectionBudget=Math.floor(operationBudget*4/5);
  if(collectionBudget<2)throw RangeError('Lab collection budget');
  const lanes=streams===2?planLanes({workers,operationBudget:collectionBudget,timeBudgetMs}).lanes:[{seed,operationBudget:collectionBudget}];
  const started=now(),deadline=started+timeBudgetMs-50,collectionDeadline=deadline-Math.min(1000,timeBudgetMs/3);
  return new Promise(resolve=>{
   let finished=false,peak=0,charged=0,mainTimer,merged=null;const disposalErrors=[],hostStops=[];
   const live=new Set(),pending=new Set(),records=[];
   const finish=(kind,error=null)=>{
    if(finished)return;finished=true;unschedule(mainTimer);
    for(const stop of [...pending])stop(kind==='cancelled'?'cancelled':kind==='fatal'?'fatal-retirement':'global-deadline');
    for(const w of [...live]){try{w.terminate();live.delete(w);}catch(e){disposalErrors.push(String(e.message));}}
    if(disposalErrors.length){disposed=true;kind='fatal';error=[error,...disposalErrors].filter(Boolean).join('; ');}
    else if(!['cancelled','fatal'].includes(kind)&&now()>=deadline)kind='timeout';
    active=null;
    resolve({kind,error,input,variant,settings,plan:{...plan,streams,lanes,collectionBudget},records,merged,hostStops,disposalErrors,
     chargedOperations:charged,elapsedMs:now()-started,peakWorkers:peak,peakWasmBytes:peak*268435456,
     serializedBufferCap:67108864,allWorkersDisposed:live.size===0});
   };
   active={finish};mainTimer=schedule(()=>finish('timeout'),Math.max(0,deadline-now()));
   const job=(phase,lane,allowance,extra={})=>new Promise((yes,no)=>{
    const stopAt=phase==='collect'?collectionDeadline:deadline;
    if(finished||stopAt<=now()){yes(null);return;}
    let worker,ended=false,posted=false,initTimer,phaseTimer,jobStarted=now(),postStarted=null;
    const id=++sequence;
    const retire=()=>{
     let failure=null;
     if(worker){
      const target=worker;worker=null;
      try{target.terminate();live.delete(target);}catch(e){failure=e;disposalErrors.push(String(e.message));}
      try{target.releaseSource?.();}catch(e){failure??=e;disposalErrors.push(String(e.message));}
     }
     unschedule(initTimer);unschedule(phaseTimer);return failure;
    };
    const stop=(reason='host-phase-deadline')=>{if(ended)return;ended=true;pending.delete(stop);retire();if(posted)charged+=allowance;hostStops.push({phase,seed:lane.seed,reason,posted,charged:posted?allowance:0});yes(null);};
    const bad=error=>{if(ended)return;ended=true;pending.delete(stop);retire();if(posted)charged+=allowance;hostStops.push({phase,seed:lane.seed,reason:'fatal-work-unobserved',posted,charged:posted?allowance:0});no(error);};
    const done=data=>{
     if(ended)return;
     if(now()>=stopAt){stop('late-result');return;}
     try{
      if(!data||data.version!==14||data.id!==id)throw Error('Lab response identity');
      if(data.type==='error')throw Error(data.code+': '+data.message);
      if(data.type!=='done'||data.phase!==phase||!['collected','operation-budget','time-budget'].includes(data.stop))throw Error('Lab response shape');
      if(!Number.isSafeInteger(data.operations)||data.operations<0||data.operations>allowance||!data.stats||!Number.isSafeInteger(data.stats.work)||data.stats.work<0||data.stats.work>data.operations)throw Error('Lab response work');
      if(data.meta?.input!==input||data.meta?.parameters!==String(settings.parameter))throw Error('Lab response input');
      if(data.headerPrefix!=null&&(!(data.headerPrefix instanceof ArrayBuffer)||data.headerPrefix.byteLength>85))throw Error('Lab header prefix bound');
      if(data.buffer!==null&&(!(data.buffer instanceof ArrayBuffer)||data.buffer.byteLength>16777216))throw Error('Lab response byte bound');
      if(data.divisor!==null&&(typeof data.divisor!=='string'||!/^[1-9][0-9]{0,99}$/.test(data.divisor)||BigInt(data.divisor)<=1n||BigInt(data.divisor)>=BigInt(input)||BigInt(input)%BigInt(data.divisor)))throw Error('Lab response divisor');
      ended=true;pending.delete(stop);const retirementError=retire();
      if(retirementError){charged+=allowance;hostStops.push({phase,seed:lane.seed,reason:'retirement-error',posted:true,charged:allowance});no(retirementError);return;}
      if(now()>=stopAt){charged+=allowance;hostStops.push({phase,seed:lane.seed,reason:'late-retirement',posted:true,charged:allowance});yes(null);return;}
      charged+=data.operations;
      records.push({phase,seed:lane.seed,allowance,jobWallMs:now()-jobStarted,initializationMs:postStarted-jobStarted,computeWallMs:now()-postStarted,packet:data});
      yes(data);
     }catch(error){bad(error);}
    };
    pending.add(stop);
    try{
     if(live.size>=workers)throw Error('Lab WASM ownership bound');
     worker=createWorker();live.add(worker);peak=Math.max(peak,live.size);
     worker.onerror=e=>{e.preventDefault?.();bad(Error(e.message||'Lab Worker error'));};
     worker.onmessageerror=()=>bad(Error('Lab message clone failure'));
     worker.onmessage=({data})=>{
      if(ended||finished)return;
      if(!posted){
       if(now()>=Math.min(stopAt,jobStarted+5000)){stop('late-ready');return;}
       if(data?.type!=='ready'||data.version!==14||data.wasmBytes!==268435456){bad(Error('Lab ready profile'));return;}
       unschedule(initTimer);
       const remainingMs=stopAt-now()-30;
       if(remainingMs<=0){stop();return;}
       posted=true;postStarted=now();
       try{worker.postMessage({type:'run',version:14,id,input,phase,seed:lane.seed,operationBudget:allowance,
        remainingMs,...settings,blockQuota,...extra},extra.streams?.map(s=>s.buffer)??[]);}catch(e){bad(e);}
      }else done(data);
     };
     initTimer=schedule(()=>stop('initialization-deadline'),Math.min(5000,Math.max(0,stopAt-now())));
     phaseTimer=schedule(()=>stop('host-phase-deadline'),Math.max(0,stopAt-now()));
    }catch(error){bad(error);}
   });
   (async()=>{
    const packets=[];
    if(workers===2){for(const p of await Promise.all(lanes.map(l=>job('collect',l,l.operationBudget))))if(p)packets.push(p);}
    else for(const lane of lanes){const p=await job('collect',lane,lane.operationBudget);if(p)packets.push(p);if(finished) return;}
    if(finished)return;
    if(disposalErrors.length||live.size){finish('fatal','Collector retirement failed');return;}
    const sources=packets.filter(p=>p.buffer?.byteLength);
    if(!sources.length){finish('incomplete');return;}
    if(sources.reduce((s,p)=>s+p.buffer.byteLength,0)>16777216)throw Error('Lab total relation byte bound');
    if(charged>=operationBudget){finish('incomplete');return;}
    const importStreams=sources.map(p=>({meta:p.meta,buffer:p.buffer.slice(0)}));
    merged=await job('merge',{seed:1},operationBudget-charged,{streams:importStreams});
    if(finished)return;
    finish(merged?.graph?.verified?'verified':'incomplete');
   })().catch(error=>finish('fatal',String(error?.message).slice(0,512)));
  });
 }
 return {run,cancel,dispose(){disposed=true;cancel();}};
}
