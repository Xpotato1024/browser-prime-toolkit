import { FactorWorkerController } from '../src/worker/controller.js';
import { selectEnginePlan } from '../src/engine/selection.js';
import { makeNativeWorker } from '../src/worker/native-factory.js';
import { makeCandidateWorker } from '../src/worker/candidate-factory.js';
import { WORKER_SOURCE } from '../src/worker/native-worker-source.js';
import { makeWorkerFromSource } from '../src/worker/source-factory.js';
let controller,kind,resolveJob,owner=false,live=0,maxLive=0;
const violations=[],rejections=[],errors=[];
addEventListener('securitypolicyviolation',e=>violations.push({directive:e.violatedDirective,blocked:e.blockedURI}));
addEventListener('unhandledrejection',e=>rejections.push(String(e.reason)));
function factory() {
  const worker=kind==='native'?makeNativeWorker():makeCandidateWorker();
  live++;maxLive=Math.max(maxLive,live);let disposed=false;
  const terminate=worker.terminate.bind(worker);
  worker.terminate=()=>{if(!disposed){disposed=true;live--;}terminate();};
  return worker;
}
async function ready() {
  const start=performance.now();
  while(controller.phase!=='ready') {
    if(controller.phase==='error'||performance.now()-start>6000)throw Error('Worker not ready');
    await new Promise(r=>setTimeout(r,5));
  }
}
async function select(mode,renew=true) {
  const start=performance.now();
  if(kind!==mode||renew) {
    controller?.dispose();kind=mode;
    controller=new FactorWorkerController({createWorker:factory,onEvent:event=>{
      if(event.type==='terminal'||event.type==='error'){const resolve=resolveJob;resolveJob=null;resolve?.(event);}
    }});
  }
  await ready();return performance.now()-start;
}
function planFor(input,options) {
  const {algorithm='selector',...compute}=options;
  if(!['selector','brent','gmp-ecm'].includes(algorithm))throw TypeError('Unsupported holdout mode');
  const plan=selectEnginePlan(input,compute);
  if(!plan.eligible)throw RangeError('Selector range');
  return {plan,requestedAlgorithm:algorithm,config:{...plan.options,algorithm:algorithm==='selector'?plan.algorithm:algorithm}};
}
async function runOwned(input,options={},renew=true) {
  const totalStart=performance.now(),{plan,requestedAlgorithm,config}=planFor(input,options);
  const initializationMs=await select(config.algorithm==='brent'?'native':'candidate',renew);
  const start=performance.now();
  const event=await new Promise(resolve=>{resolveJob=resolve;controller.start(plan.input,config);});
  if(event.type==='error'){errors.push(event);throw Error(event.code);}
  return {...event.result,wallMs:performance.now()-start,initializationMs,requestWallMs:performance.now()-totalStart,
    requestedAlgorithm,freshPerTrial:renew,selection:plan};
}
async function run(input,options={}) {
  if(owner)throw Error('Concurrent holdout request');owner=true;
  try{return await runOwned(input,options);}finally{owner=false;}
}
async function cancelRun(input,algorithm='selector',delayMs=30) {
  if(owner)throw Error('Concurrent holdout request');owner=true;
  let ticker,heartbeat=0;
  try {
    const {config}=planFor(input,{algorithm});await select(config.algorithm==='brent'?'native':'candidate');
    ticker=setInterval(()=>heartbeat++,5);
    const pending=runOwned(input,{algorithm,timeBudgetMs:10000,operationBudget:50000000},false);
    pending.catch(()=>{});
    await new Promise(r=>setTimeout(r,delayMs));
    const start=performance.now(),cancelled=controller.cancel(),result=await pending;
    await ready();return {cancelled,result,cancelMs:performance.now()-start,heartbeat};
  } finally {clearInterval(ticker);owner=false;}
}
function verifyCspAudit() {
  return new Promise((resolve,reject)=>{
    const worker=makeWorkerFromSource(WORKER_SOURCE+'\nfetch('+JSON.stringify(location.origin+'/blocked-worker-probe')+').catch(()=>{});');
    const cleanup=()=>{clearTimeout(timer);worker.releaseSource();worker.terminate();};
    const timer=setTimeout(()=>{cleanup();reject(Error('Worker CSP missing'));},2000);
    worker.onmessage=e=>{if(e.data.type==='audit-csp'){cleanup();resolve(true);}};
    worker.onerror=e=>{cleanup();reject(Error(e.message));};
  });
}
await select('native');
globalThis.factorHarness={ready,run,cancelRun,verifyCspAudit,violations,rejections,errors,
  ownership:()=>({live,maxLive}),get controller(){return controller;}};
