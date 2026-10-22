import {FactorWorkerController} from '../src/worker/controller.js';
import {makeCountedWorker} from '../src/worker/counted-factory.js';
import {parseIntegerInput} from '../src/core/integer-input.js';
import {verifySnapshot} from '../src/engine/result.js';
class EvaluationController extends FactorWorkerController {
  interrupt(reason) {return super.interrupt(reason,false);}
}
// Measurement-only shared request deadline. Never boots a replacement after stop.
export async function runCounted(text,{variant='legacy',capture=false,profile=false,fault=false,kind='siqs',workers=1,base=2,seed=1,totalMs=1000,computeMs=null,signal}={},{createWorker}={}) {
  if(!['legacy','clock-gated','dense','lanczos'].includes(variant)||[capture,profile,fault].some(x=>typeof x!=='boolean')||kind!=='siqs'||workers!==1||
    kind!=='ecm'&&workers!==1||![2,3].includes(base)||!Number.isSafeInteger(seed)||seed<1||seed>4294967295||
    !Number.isSafeInteger(totalMs)||totalMs<0||totalMs>65000||
    computeMs!==null&&(!Number.isSafeInteger(computeMs)||computeMs<0||computeMs>60000))throw RangeError('Evaluation bounds');
  const began=performance.now(),input=parseIntegerInput(text).canonical;
  const controllers=[],snapshots=[],audits=[],results=[],laneTrace=Array.from({length:workers},()=>[]);
  let closed=false,timer,initializeMs=null,computeStarted=null,accept,reject;
  const terminal=new Promise((yes,no)=>{accept=yes;reject=no;});terminal.catch(()=>{});
  const stop=()=>{closed=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);for(const c of controllers)c.dispose();};
  const partial=(reason,status='incomplete')=>{
    const best=snapshots.filter(Boolean).sort((a,b)=>BigInt(a.remaining)<BigInt(b.remaining)?-1:BigInt(a.remaining)>BigInt(b.remaining)?1:0)[0]??
      {input,factors:[],remaining:input,operations:0,elapsedMs:0};
    return {...best,algorithm:kind==='siqs'||kind==='profile'?'siqs':'gmp-ecm',seed,status,reason,primality:best.factors.length?'composite':'unknown'};
  };
  const cancel=()=>{if(!closed){const r=partial('cancelled','cancelled');stop();accept(r);}};
  const timeout=()=>{if(!closed){const r=partial('host-timeout');stop();accept(r);}};
  timer=setTimeout(timeout,totalMs);signal?.addEventListener('abort',cancel,{once:true});
  if(signal?.aborted)cancel();
  try {
    for(let lane=0;lane<workers&&!closed;lane++){
      const configuration={variant,capture,profile,fault};
      const controller=new EvaluationController({createWorker:()=>{
        const worker=createWorker?createWorker(configuration):makeCountedWorker(configuration);
        worker.addEventListener('message',event=>{
          if(event.data.audit)audits[lane]=event.data.audit;
          if(event.data.type==='curve-trace'){laneTrace[lane].push(event.data.trace);event.stopImmediatePropagation();}
        });
        return worker;
      },onEvent:event=>{
        if(closed)return;
        try {
          if(event.type==='error')throw Error('Evaluation '+event.code);
          if(event.type==='progress')snapshots[lane]=verifySnapshot(event.snapshot,input);
          if(event.type!=='terminal')return;
          const result=event.result;
          if(result.seed!==seed||result.algorithm!==partial('').algorithm)throw Error('Lane identity');
          verifySnapshot(result,input);snapshots[lane]=result;results[lane]=result;
          if(['complete','probable','neither'].includes(result.status)||results.filter(Boolean).length===workers){
            const winner={...result,winningLane:lane};stop();accept(winner);
          }
        }catch(error){stop();reject(error);}
      }});
      controllers.push(controller);
      // Constructor failure may emit before it is pushed.
      if(closed)controller.dispose();
    }
    while(!closed&&controllers.some(c=>c.phase!=='ready'))await new Promise(r=>setTimeout(r,2));
    if(!closed){
      initializeMs=performance.now()-began;
      const remaining=computeMs===null?Math.min(60000,Math.max(0,Math.floor(totalMs-initializeMs-100))):computeMs;
      computeStarted=performance.now();
      for(const c of controllers){if(closed)break;c.start(input,{algorithm:partial('').algorithm,seed,timeBudgetMs:remaining,operationBudget:Math.floor(50000000/workers)});}
    }
    const result=await terminal;
    return {...result,requestWallMs:performance.now()-began,initializationMs:initializeMs,
      computeWallMs:computeStarted===null?null:performance.now()-computeStarted,
      workers,kind,variant,capture,profile,base,totalMs,computeMs,allocatedOperations:Math.floor(50000000/workers)*workers,
      linearMemoryBytes:kind==='siqs'||kind==='profile'?67108864:workers*67108864,
      audits,laneTrace,allLanesDisposed:controllers.every(c=>c.phase==='disposed')};
  }finally{stop();}
}
