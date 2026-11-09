// SPDX-License-Identifier: AGPL-3.0-only
import {createLabRunner} from '../src/siqs-lab/runner.js';
export function deadlineDetails(result,setupElapsedMs=0){
 const checks={incomplete:result.kind==='incomplete',postedPhaseDeadline:result.hostStops?.some(x=>x.reason==='host-phase-deadline'&&x.posted)===true,allWorkersDisposed:result.allWorkersDisposed===true,withinWallLimit:Number.isFinite(result.elapsedMs)&&result.elapsedMs>=0&&result.elapsedMs<1300};
 return {passed:Object.values(checks).every(Boolean),phase:'run',checks,setupElapsedMs,kind:result.kind,error:result.error,elapsedMs:result.elapsedMs,hostStops:result.hostStops,disposalErrors:result.disposalErrors,chargedOperations:result.chargedOperations,allWorkersDisposed:result.allWorkersDisposed};
}
export async function runDeadlineProbe({input,createWorker,now=()=>performance.now(),schedule=setTimeout,unschedule=clearTimeout}){
 const started=now(),setupLimitMs=5000,cleanupErrors=[];let worker,runner,setupTimer,diagnostic,handed=false,terminated=false,released=false;
 try{
  worker=createWorker();const terminate=worker.terminate.bind(worker),release=worker.releaseSource?.bind(worker);
  worker.terminate=()=>{if(!terminated){terminate();terminated=true;}};
  worker.releaseSource=()=>{if(!released){release?.();released=true;}};
  const ready=await new Promise((resolve,reject)=>{
   let settled=false;
   const finish=(error,data)=>{if(settled)return;settled=true;unschedule(setupTimer);worker.onmessage=worker.onerror=worker.onmessageerror=null;error?reject(error):resolve(data);};
   worker.onmessage=({data})=>{
    if(now()-started>=setupLimitMs){finish(Error('Synthetic Worker readiness deadline'));return;}
    if(data?.type!=='ready'||data.version!==14||data.wasmBytes!==268435456){finish(Error('Synthetic Worker ready profile'));return;}
    finish(null,data);
   };
   worker.onerror=e=>{e.preventDefault?.();finish(Error(e.message||'Synthetic Worker setup error'));};
   worker.onmessageerror=()=>finish(Error('Synthetic Worker setup message error'));
   setupTimer=schedule(()=>finish(Error('Synthetic Worker readiness deadline')),setupLimitMs);
  });
  const setupElapsedMs=now()-started;
  runner=createLabRunner({now,schedule,unschedule,createWorker:()=>{
   if(handed||terminated)throw Error('Synthetic Worker lease reused');handed=true;
   // The runner installs its handlers before this replay, just as with a fresh Worker.
   queueMicrotask(()=>{if(!terminated)worker.onmessage?.({data:ready});});return worker;
  }});
  diagnostic=deadlineDetails(await runner.run(input,{timeBudgetMs:1000}),setupElapsedMs);
 }catch(error){diagnostic={passed:false,phase:runner?'run':'prepare',setupElapsedMs:now()-started,error:String(error?.message??error),checks:{}};}
 finally{
  unschedule(setupTimer);
  for(const[stage,release]of [['runner',()=>runner?.dispose()],['worker',()=>worker?.terminate()],['source',()=>worker?.releaseSource?.()]]){
   try{release();}catch(error){cleanupErrors.push({stage,error:String(error?.message??error)});}
  }
 }
 diagnostic.fixture={handed,terminated,released,setupLimitMs,cleanupErrors};
 diagnostic.checks.fixtureReleased=(!worker||terminated&&released)&&cleanupErrors.length===0;
 diagnostic.passed=diagnostic.passed&&diagnostic.checks.fixtureReleased;
 return diagnostic;
}
