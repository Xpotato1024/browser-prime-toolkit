import { FactorWorkerController } from '../src/worker/controller.js';
import { makeSiqsWorker } from '../src/worker/siqs-factory.js';
import { makeCandidateWorker } from '../src/worker/candidate-factory.js';
import { makeEcmAuditWorker } from '../src/worker/ecm-audit-factory.js';
import { WORKER_SOURCE } from '../src/worker/siqs-worker-source.js';
import { makeWorkerFromSource } from '../src/worker/source-factory.js';
let controller, kind, resolveJob, audit, live = 0, maxLive = 0, retired = 0;
const violations = [], rejections = [], errors = [];
addEventListener('securitypolicyviolation', e => violations.push({directive:e.violatedDirective,blocked:e.blockedURI}));
addEventListener('unhandledrejection', e => rejections.push(String(e.reason)));
function factory(mode) {
  const worker = mode === 'siqs' ? makeSiqsWorker() : mode === 'candidate' ? makeCandidateWorker() : makeEcmAuditWorker(mode);
  live++; maxLive = Math.max(maxLive, live);
  const terminate = worker.terminate.bind(worker); let disposed = false;
  worker.terminate = () => { if (!disposed) { disposed = true; live--; retired++; } terminate(); };
  worker.addEventListener('message', e => { if (e.data.audit) audit = e.data.audit; });
  return worker;
}
async function ready() {
  const start = performance.now();
  while (controller.phase !== 'ready') {
    if (controller.phase === 'error' || performance.now()-start>6000) throw Error('Worker not ready');
    await new Promise(r=>setTimeout(r,5));
  }
}
async function select(mode, renew=false) {
  const start=performance.now();
  if (mode !== kind || renew) {
    controller?.dispose(); kind=mode;
    controller=new FactorWorkerController({createWorker:()=>factory(kind),onEvent:e=>{
      if (e.type==='terminal' || e.type==='error') { const resolve=resolveJob;resolveJob=null;resolve?.(e); }
    }});
  }
  await ready(); return performance.now()-start;
}
async function run(input,options={},renew=false) {
  const initializationMs=await select(options.algorithm==='siqs'?'siqs':'candidate',renew);
  audit=null; const start=performance.now();
  const event=await new Promise(resolve=>{resolveJob=resolve;controller.start(input,options);});
  if(event.type==='error') {errors.push(event);throw Error(event.code);}
  return {...event.result,wallMs:performance.now()-start,initializationMs,freshPerTrial:renew,audit};
}
async function cancelRun(input,algorithm='brent',delayMs=30) {
  await select(algorithm==='siqs'?'siqs':'candidate');
  let heartbeat=0;const ticker=setInterval(()=>heartbeat++,5);
  const pending=run(input,{algorithm,timeBudgetMs:10000,operationBudget:50000000});
  await new Promise(r=>setTimeout(r,delayMs));
  const start=performance.now(),cancelled=controller.cancel(),result=await pending;
  await ready();clearInterval(ticker);
  return {cancelled,result,cancelMs:performance.now()-start,heartbeat};
}
async function fatalRun(mode,input) {
  await select(mode);audit=null;const before=retired,old=controller.worker;
  const stale=old.onmessage;
  const event=await new Promise(resolve=>{resolveJob=resolve;controller.start(input,{algorithm:'gmp-ecm',seed:1,timeBudgetMs:5000,operationBudget:50000000});});
  const details=audit,errorPhase=controller.phase;
  const retiredOld=controller.worker===null&&retired===before+1;
  kind='candidate';controller.createWorker=()=>factory(kind);controller.restart();await ready();
  stale({data:{protocolVersion:1,type:'error',jobId:1,code:'late-fault'}});
  const staleIgnored=controller.phase==='ready';
  const recovered=await run('10403',{algorithm:'gmp-ecm',seed:17,timeBudgetMs:1000});
  return {event,details,errorPhase,retiredOld,staleIgnored,recovered};
}
async function stage2Stop(input) {
  await select('stop');audit=null;
  const event=await new Promise(resolve=>{resolveJob=resolve;controller.start(input,{algorithm:'gmp-ecm',seed:1,timeBudgetMs:5000,operationBudget:50000000});});
  const details=audit;return {event,details};
}
function verifyCspAudit() {
  return new Promise((resolve,reject)=>{
    const suffix='\nfetch('+JSON.stringify(location.origin+'/blocked-worker-probe')+').catch(()=>{});';
    const worker=makeWorkerFromSource(WORKER_SOURCE+suffix);
    const cleanup=()=>{clearTimeout(timer);worker.releaseSource();worker.terminate();};
    const timer=setTimeout(()=>{cleanup();reject(Error('Worker CSP missing'));},2000);
    worker.onmessage=e=>{if(e.data.type==='audit-csp'){cleanup();resolve(true);}};
    worker.onerror=e=>{cleanup();reject(Error(e.message));};
  });
}
await select('siqs');
globalThis.factorHarness={ready,run,cancelRun,fatalRun,stage2Stop,verifyCspAudit,
  violations,rejections,errors,get controller(){return controller;},
  ownership:()=>({live,maxLive,retired})};
