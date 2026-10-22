import {RSA_PROFILE,selectRsaPlan} from './profile.js';
import {verifyRsaSnapshot,verifyRsaWorkerResult,classifyRsaResult,RsaProofDeadlineError} from './result.js';
import {makeRsaWorker} from './factory.js';
const snapshotOf=r=>({input:r.input,factors:r.factors,remaining:r.remaining,operations:r.operations,elapsedMs:r.elapsedMs});
export function createRsaEvaluator({
 createWorker=makeRsaWorker,now=()=>performance.now(),schedule=setTimeout,unschedule=clearTimeout,
 verifyResult=verifyRsaWorkerResult,onProgress=()=>{}
}={}){
 let active=false,permanentlyClosed=false,cancelJob=null;
 const evaluator={
  async run(text,options={}){
   if(permanentlyClosed)throw Error('RSA evaluator closed');if(active)throw Error('RSA evaluator busy');
   const began=now(),plan=selectRsaPlan(text,options),deadline=began+plan.options.timeBudgetMs;
   const base={profile:RSA_PROFILE.id,input:plan.input,backend:plan.backend,bits:plan.bits,wasmBytes:0,limits:{...RSA_PROFILE,timeBudgetMs:plan.options.timeBudgetMs}};
   const initial={input:plan.input,factors:[],remaining:plan.input,operations:0,elapsedMs:0};
   if(!plan.supported)return{...base,kind:'unsupported',reason:plan.reason,result:null,snapshot:null,workers:0,allWorkersDisposed:true,requestWallMs:Math.max(0,now()-began),initializationMs:null,computeWallMs:null,proofTicks:0};
   if(plan.workers===0)return{...base,kind:'neither',reason:null,result:null,snapshot:initial,workers:0,allWorkersDisposed:true,requestWallMs:Math.max(0,now()-began),initializationMs:null,computeWallMs:null,proofTicks:0};
   active=true;
   try{return await new Promise(resolve=>{
    let worker=null,done=false,ready=false,timer=null,loadTimer=null,snapshot=initial,disposed=true,initializationMs=null,computeStarted=null,proofTicks=0;const checkedPrimes=new Set();
    const finish=(kind,reason,result=null)=>{
     if(done)return;done=true;
     if(timer!==null)unschedule(timer);if(loadTimer!==null)unschedule(loadTimer);
     let cleanupFailed=false;
     if(worker){
      worker.onmessage=worker.onerror=worker.onmessageerror=null;
      try{worker.releaseSource?.();}catch{cleanupFailed=true;}
      try{worker.terminate();disposed=true;}catch{cleanupFailed=true;}
     }
     if(cleanupFailed){permanentlyClosed=true;kind='fatal';reason='worker-disposal-failed';result=null;}
     const finishedAt=now();
     if(!cleanupFailed&&['factorized','prime','probable'].includes(kind)&&finishedAt>=deadline){kind='timeout';reason='host-timeout';result=null;}
     resolve({...base,kind,reason,result,snapshot:result?snapshotOf(result):snapshot,workers:worker?1:0,allWorkersDisposed:disposed,
      requestWallMs:Math.max(0,finishedAt-began),initializationMs,computeWallMs:computeStarted===null?null:Math.max(0,finishedAt-computeStarted),proofTicks});
    };
    const fail=reason=>finish('fatal',reason),timeout=()=>finish('timeout','host-timeout');
    cancelJob=reason=>finish('cancelled',reason);
    const proofTick=()=>{if(now()>=deadline)throw new RsaProofDeadlineError();if(++proofTicks>100000)throw Error('RSA proof operation limit');};
    try{
     if(now()>=deadline){timeout();return;}
     timer=schedule(timeout,Math.max(0,deadline-now()));
     loadTimer=schedule(()=>fail('initialization-timeout'),Math.max(0,began+RSA_PROFILE.initializationDeadlineMs-now()));
     worker=createWorker(plan);disposed=false;
     worker.onerror=event=>{event.preventDefault?.();fail('worker-error');};
     worker.onmessageerror=()=>fail('message-error');
     worker.onmessage=({data})=>{
      if(done)return;
      try{
       if(now()>=deadline){timeout();return;}
       if(new TextEncoder().encode(JSON.stringify(data)).length>RSA_PROFILE.packetBytes||data?.protocolVersion!==3||data.profile!==RSA_PROFILE.id)throw Error('worker-protocol');
       if(data.type==='audit-csp')throw Error('worker-csp-violation');
       if(data.type==='ready'){
        if(ready)return;
        if(data.backend!=='brent'||data.maxBits!==2048||data.wasmBytes!==0)throw Error('worker-ready-profile');
        if(now()>=began+RSA_PROFILE.initializationDeadlineMs){fail('initialization-timeout');return;}
        ready=true;unschedule(loadTimer);loadTimer=null;worker.releaseSource?.();initializationMs=now()-began;
        if(now()>=deadline){timeout();return;}
        if(now()>=began+RSA_PROFILE.initializationDeadlineMs){fail('initialization-timeout');return;}
        const remaining=Math.max(0,Math.floor(deadline-now()-RSA_PROFILE.deliveryGraceMs));computeStarted=now();
        worker.postMessage({protocolVersion:3,profile:RSA_PROFILE.id,type:'run',jobId:1,input:plan.input,options:{...plan.options,timeBudgetMs:remaining}});
        return;
       }
       if(!ready||data.jobId!==1)return;
       if(data.type==='error')throw Error('computation-error');
       if(data.type==='progress'){
        const next=verifyRsaSnapshot(data.snapshot,plan.input,proofTick,checkedPrimes);
        if(next.operations<snapshot.operations||next.operations>plan.options.operationBudget)throw Error('worker-progress-operations');
        if(now()>=deadline){timeout();return;}snapshot=next;onProgress(structuredClone(next));return;
       }
       if(data.type!=='result')throw Error('worker-result-type');
       const result=verifyResult(data.result,plan.input,proofTick,checkedPrimes);
       if(now()>=deadline){timeout();return;}
       if(result.seed!==plan.options.seed||result.operations<snapshot.operations||result.operations>plan.options.operationBudget)throw Error('worker-result-identity');
       finish(classifyRsaResult(result),result.reason,result);
      }catch(error){if(error instanceof RsaProofDeadlineError||now()>=deadline)timeout();else fail(error.message??'invalid-worker-result');}
     };
    }catch(error){fail(error.message??'worker-create-error');}
   });}finally{active=false;cancelJob=null;}
  },
  cancel(){if(!active||!cancelJob)return false;cancelJob('cancelled');return true;},
  dispose(){permanentlyClosed=true;cancelJob?.('disposed');}
 };
 return evaluator;
}
