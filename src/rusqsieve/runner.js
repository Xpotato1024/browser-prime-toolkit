// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import {LIMITS,validateInput,validatePacket,validateMemory} from './contracts.js';
import {RUS_WORKER_SOURCE} from './worker-source.js';
import {makeWorkerFromSource} from '../worker/source-factory.js';
import {assessPrime} from '../engine/arithmetic.js';
import {SMALL_PRIMES} from '../engine/options.js';
let nextGeneration=0;
export function runRusqsieve(input,options={}){
 const {workers=1,timeBudgetMs=600000,retainLocal=false,shareContext=true,signal,createWorker=()=>makeWorkerFromSource(RUS_WORKER_SOURCE),onProgress=()=>{},now=()=>performance.now()}=options;
 const inputInfo=validateInput(input);
 if(![1,2].includes(workers)||!Number.isSafeInteger(timeBudgetMs)||timeBudgetMs<1||timeBudgetMs>LIMITS.maxMs||typeof retainLocal!=='boolean')throw Error('Invalid evaluation limits');
 const started=now(),generation=++nextGeneration,deadline=started+timeBudgetMs,initDeadline=started+Math.min(timeBudgetMs,LIMITS.initMs);
 return new Promise(resolve=>{
  const owners=[],pending=new Map(),events=[],phaseMemory=[],retirementErrors=[];let done=false,phase='initializing',issued=0,submitted=0,relations=0,target=0,factorBaseSize=0,familyBudget=0,drain=false,transport=0,peakTransport=0,submitJob=null,initializedMs=null,peakOwners=0,polynomialsSubmitted=0,rawRelationsSubmitted=0,bytesSubmitted=0;
  const record=(type,data)=>{if(['ready','released','extracted','fatal'].includes(type))phaseMemory.push({type,...data});events.push({type,elapsedMs:now()-started,...data});if(events.length>256)events.shift();};
  const post=(owner,type,data={},transfer=[])=>{owner.command=type;owner.worker.postMessage({version:17,generation,type,...data},transfer);};
  const cleanupError=(owner,operation,error)=>retirementErrors.push({owner:owner.index,operation,error:String(error?.message??error).slice(0,120)});
  const releaseSource=owner=>{if(owner.sourceReleased)return true;if(owner.sourceReleaseFailed)return false;try{owner.worker.releaseSource?.();owner.sourceReleased=true;return true;}catch(error){owner.sourceReleaseFailed=true;cleanupError(owner,'releaseSource',error);return false;}};
  const retire=owner=>{
   if(!owner.retirementAttempted){owner.retirementAttempted=true;
    try{owner.worker.onmessage=null;owner.worker.onerror=null;owner.worker.onmessageerror=null;}catch(error){cleanupError(owner,'detach',error);}
    try{owner.worker.terminate();owner.retired=true;}catch(error){cleanupError(owner,'terminate',error);}
   }
   const source=releaseSource(owner);return owner.retired&&source;
  };
  const finish=(kind,reason=null,extra={})=>{
   if(done)return;done=true;clearTimeout(timer);clearTimeout(initTimer);signal?.removeEventListener('abort',cancel);for(const owner of owners)retire(owner);
   let factors=[],remaining=input,certainty=null;
   if(!retirementErrors.length&&extra.divisor){try{
    const n=BigInt(input),d=BigInt(extra.divisor);if(d<=1n||d>=n||n%d)throw Error('Divisor verification');
    let ticks=0;const budget={tick(){if(++ticks>100000||now()>deadline)throw Error('Verification budget');}};
    const assess=n=>{for(const p of SMALL_PRIMES){budget.tick();if(n===p)return'proven';if(n%p===0n)return'composite';}return assessPrime(n,budget);};
    factors=[d,n/d].sort((a,b)=>a<b?-1:1).map(n=>({value:n.toString(),certainty:assess(n),method:'independent-mr-fixed7'}));
    if(factors.some(f=>f.certainty==='composite')){kind='partial';reason='composite-divisor';factors=[];}
    else{remaining='1';kind=factors.every(f=>f.certainty==='proven')?'factorized':'probable';certainty=kind;}
   }catch(error){kind='incomplete';reason='verification-failed';factors=[];}}
   const finishedAt=now();
   if(finishedAt>=deadline&&kind!=='cancelled'){kind='timeout';reason='time-budget';factors=[];remaining=input;certainty=null;}
   if(retirementErrors.length){kind='incomplete';reason='worker-retirement';factors=[];remaining=input;certainty=null;}
   resolve({input,kind,reason,factors,remaining,certainty,workers,peakOwners,allWorkersDisposed:owners.every(o=>o.retired),allWorkerSourcesReleased:owners.every(o=>o.sourceReleased),retirementErrors,requestWallMs:finishedAt-started,initializationMs:initializedMs,familiesIssued:issued,familiesSubmitted:submitted,polynomialsSubmitted,rawRelationsSubmitted,bytesSubmitted,familyBudget,relations,target,transportCapBytes:LIMITS.transportBytes,peakTransportBytes:peakTransport,maximumWasmBytes:workers*LIMITS.wasmBytes,retainLocal,shareContext,factorBaseSize,phaseMemory,memoryByOwner:owners.map(o=>({owner:o.index,last:o.memory,peakLinearBytes:o.peakLinear??null,peakRequestedBytes:o.peakRequested??null})),events,...extra});
  };
  const cancel=()=>finish('cancelled','cancelled');
  const timer=setTimeout(()=>finish('timeout','time-budget'),timeBudgetMs),initTimer=setTimeout(()=>finish('timeout','initialization-timeout'),Math.min(timeBudgetMs,LIMITS.initMs));
  if(signal?.aborted){cancel();return;}signal?.addEventListener('abort',cancel,{once:true});
  function release(){
   phase='releasing';for(const owner of owners)post(owner,'release');
  }
  function pump(){
   if(done||phase!=='collecting')return;
   if(now()>=deadline){finish('timeout','time-budget');return;}
   const coord=owners[0];
   if(!coord.command&&pending.has(submitted)){
    const item=pending.get(submitted);pending.delete(submitted);item.bytes=item.buffer.byteLength;submitJob=item;
    post(coord,'submit',{jobId:item.jobId,first:item.first,count:item.count,buffer:item.buffer},[item.buffer]);return;
   }
   if(relations>=target)drain=true;
   if((drain||issued>=familyBudget)&&owners.every(o=>!o.job&&!o.command)&&!pending.size){release();return;}
   if(drain)return;
   for(const owner of owners){if(owner.job||owner.command||owner.retired||issued>=familyBudget)continue;
    const count=Math.min(LIMITS.batchFamilies,familyBudget-issued),job={jobId:issued,first:issued,count,owner:owner.index};
    issued+=count;owner.job=job;post(owner,'job',{...job,target,factorBaseSize,familyBudget});
   }
  }
  function receive(owner,d){
   if(done||owner.retired)return;if(d?.generation!==generation)return;
   if(now()>=deadline){finish('timeout','time-budget');return;}
   if(phase==='initializing'&&now()>=initDeadline){finish('timeout','initialization-timeout');return;}
   if(!d||d.version!==17||typeof d.type!=='string')throw Error('Worker protocol');
   for(const m of [d.memory,d.before,d.after].filter(Boolean))validateMemory(m);
   for(const m of [d.memory,d.before,d.after].filter(Boolean)){if(!Number.isInteger(m.linearBytes)||m.linearBytes>LIMITS.wasmBytes)throw Error('Worker memory bound');owner.memory=m;owner.peakLinear=Math.max(owner.peakLinear??0,m.linearBytes);owner.peakRequested=Math.max(owner.peakRequested??0,m.peakRequested);}
   if(d.type==='fatal'){record('fatal',{owner:owner.index,...d});finish('incomplete',d.reason,{fatal:d});return;}
   if(d.type==='ready'){
    if(owner.command!=='init')throw Error('Unexpected ready');if(!releaseSource(owner)){finish('incomplete','worker-retirement');return;}owner.command=null;owner.ready=true;record('ready',{owner:owner.index,memory:d.memory});
    if(owner.index===0){target=d.target;factorBaseSize=d.factorBaseSize;familyBudget=d.familyBudget;if(!Number.isInteger(target)||target<1||target>1000000||!Number.isInteger(factorBaseSize)||factorBaseSize<1||target!==factorBaseSize+64||familyBudget!==(inputInfo.bits<=288?100000:inputInfo.bits<=368?250000:750000))throw Error('Coordinator limits');}
    if(owners.length===workers&&owners.every(o=>o.ready)){if(now()>=initDeadline){finish('timeout',now()>=deadline?'time-budget':'initialization-timeout');return;}clearTimeout(initTimer);initializedMs=now()-started;phase='collecting';pump();}return;
   }
   if(d.type==='batch'){
    if(owner.command!=='job'||!owner.job||d.jobId!==owner.job.jobId||d.first!==owner.job.first||d.count!==owner.job.count||!(d.buffer instanceof ArrayBuffer))throw Error('Unissued batch');
    const checked=validatePacket(new Uint8Array(d.buffer),{first:d.first,count:d.count,target:factorBaseSize});if(pending.has(d.first))throw Error('Duplicate batch');
    owner.command=null;transport+=d.buffer.byteLength;peakTransport=Math.max(peakTransport,transport);if(transport>LIMITS.transportBytes)throw Error('Transport bound');
    pending.set(d.first,{...owner.job,buffer:d.buffer,stats:checked});record('batch',{owner:owner.index,first:d.first,count:d.count,memory:d.memory,stats:checked});pump();return;
   }
   if(d.type==='submitted'){
    if(owner.index!==0||owner.command!=='submit'||!submitJob||d.jobId!==submitJob.jobId||!Number.isInteger(d.relations)||d.relations<relations||d.relations>1000000)throw Error('Submit acknowledgement');
    const item=submitJob;transport-=item.bytes;owners[item.owner].job=null;submitted+=item.count;polynomialsSubmitted+=item.stats.polynomials;rawRelationsSubmitted+=item.stats.relations;bytesSubmitted+=item.bytes;relations=d.relations;submitJob=null;owner.command=null;
    record('submitted',{families:submitted,relations,memory:d.memory});onProgress({families:submitted,relations,target,memory:d.memory});pump();return;
   }
   if(d.type==='released'){
    if(phase!=='releasing'||owner.command!=='release')throw Error('Release acknowledgement');
    owner.command=null;owner.released=true;record('released',{owner:owner.index,before:d.before,after:d.after});
    if(owner.index!==0&&!retire(owner)){finish('incomplete','worker-retirement');return;}
    if(owners.every(o=>o.released)){phase='extracting';post(owners[0],'extract');}return;
   }
   if(d.type==='extracted'){
    if(phase!=='extracting'||owner.index!==0||owner.command!=='extract')throw Error('Extraction acknowledgement');
    record('extracted',{status:d.status,before:d.before,after:d.after});
    const reasons={2:'insufficient-relations',3:'no-dependency',4:'no-factor',5:'algorithm-resource',6:'invalid-dependency',7:'cancelled',8:'native-unknown',9:'missing-session'};
    if(d.status===1&&d.divisor)finish('partial',null,{divisor:d.divisor,extractionStatus:d.status});
    else if(reasons[d.status]&&!d.divisor)finish('incomplete',reasons[d.status],{extractionStatus:d.status});
    else throw Error('Extraction status');return;
   }
   throw Error('Unknown Worker result');
  }
  try{for(let index=0;index<workers;index++){
   if(done)break;if(now()>=deadline){finish('timeout','time-budget');break;}
   const worker=createWorker(),owner={index,worker,retired:false,command:null,job:null,ready:false,released:false};owners.push(owner);peakOwners=Math.max(peakOwners,owners.filter(o=>!o.retired).length);
   worker.onmessage=e=>{try{receive(owner,e.data);}catch(error){finish('incomplete','protocol-failure',{error:String(error.message)});}};
   worker.onerror=()=>finish('incomplete','worker-error');worker.onmessageerror=()=>finish('incomplete','message-error');
   post(owner,'init',{input,role:index===0?'coord':'sieve',retainLocal,shareContext});
  }}catch(error){finish('incomplete','worker-creation',{error:String(error.message)});}
 });
}
