import {createRsaEvaluator} from '../src/long-rsa/evaluator.js';
import {makeRsaWorker} from '../src/long-rsa/factory.js';
import {makeWorkerFromSource} from '../src/worker/source-factory.js';
import {selectRsaPlan,RSA_PROFILE} from '../src/long-rsa/profile.js';
import {RSA_CASES as OFFICIAL_CASES} from './staged-rsa/cases.js';
import {PRACTICAL_CASES} from './staged-practical/cases.js';
const RSA_CASES=[...OFFICIAL_CASES,...PRACTICAL_CASES];
const violations=[],errors=[],rejections=[],diagnostics=[];
addEventListener('securitypolicyviolation',e=>violations.push({directive:e.violatedDirective,blocked:e.blockedURI}));
addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>rejections.push(String(e.reason)));
const assert=(ok,message)=>{if(!ok)throw Error(message);},tick=ms=>new Promise(r=>setTimeout(r,ms));
let live=0,maxLive=0,created=0,posted=false;
function track(w){
 live++;created++;maxLive=Math.max(maxLive,live);let dead=false;
 const terminate=w.terminate.bind(w),post=w.postMessage.bind(w);
 w.terminate=()=>{terminate();if(!dead){dead=true;live--;}};
 w.postMessage=data=>{posted=true;post(data);};return w;
}
const real=()=>{const w=track(makeRsaWorker());w.addEventListener('error',e=>diagnostics.push({workerError:e.message,line:e.lineno}));return w;};
const withRun=async(input,options={},deps={})=>{
 const e=createRsaEvaluator({createWorker:real,...deps});
 try{const r=await e.run(input,options);diagnostics.push({kind:r.kind,reason:r.reason,inputDigits:input.length,initializationMs:r.initializationMs});return r;}finally{e.dispose();}
};
const rsa100=RSA_CASES.find(c=>c.id==='RSA-100'),rsa2048=RSA_CASES.find(c=>c.id==='RSA-2048');
const fault=ready=>track(makeWorkerFromSource('self.postMessage('+JSON.stringify({protocolVersion:3,profile:RSA_PROFILE.id,type:'ready',backend:'brent',maxBits:ready?2048:999,wasmBytes:0})+');self.onmessage=()=>self.postMessage('+JSON.stringify({protocolVersion:3,profile:RSA_PROFILE.id,type:'error',jobId:1,code:'injected-protocol-error'})+');'));
const cases=[
 ['exact integers through the full 2048-bit boundary',async()=>{
  for(const n of [32n,1n<<128n,1n<<2047n]){
   const input=n.toString(),r=await withRun(input);
   assert(r.kind==='factorized'&&r.input===input&&r.snapshot.input===input,'Exact factorization');
   assert(r.snapshot.remaining==='1'&&r.allWorkersDisposed&&r.requestWallMs<30000,'Complete in the request deadline');
  }
 }],
 ['official corpus and unsupported WASM methods preserve full inputs without allocation',async()=>{
  const before=created;for(const c of RSA_CASES){const plan=selectRsaPlan(c.input);assert(plan.supported&&plan.input===c.input,'Exact official input plan');}
  for(const backend of ['gmp-brent','gmp-ecm','siqs'])for(const c of [rsa100,rsa2048]){
   const r=await withRun(c.input,{backend});assert(r.kind==='unsupported'&&r.input===c.input&&r.workers===0,'No silent substitution');
  }
  const out=await withRun((1n<<2048n).toString());assert(out.kind==='unsupported'&&out.reason==='profile-input-limit','Exact input limit');
  assert(created===before,'Unsupported allocated no Worker');
 }],
 ['probable factors receive a host check and stay unproven',async()=>{
  const r=await withRun((2n*((1n<<89n)-1n)).toString());
  assert(r.kind==='probable'&&r.result.status==='probable'&&r.proofTicks>0,'Explicit host-checked probable');
 }],
 ['loading and running cancellation retire the exact 617-digit request',async()=>{
  for(const phase of ['loading','running']){
   posted=false;const e=createRsaEvaluator({createWorker:real});const p=e.run(rsa2048.input);
   if(phase==='running'){for(let i=0;i<1000&&!posted;i++)await tick(1);assert(posted,'Run packet posted');await tick(20);}
   e.cancel();const r=await p;assert(r.kind==='cancelled'&&r.input===rsa2048.input&&r.snapshot.input===rsa2048.input,'Cancelled full modulus');
   assert(r.allWorkersDisposed&&live===0,'Retired cancelled owner');e.dispose();
  }
 }],
 ['accelerated host clock controls timeout without becoming a performance sample',async()=>{
  let shift=0;
  const r=await withRun(rsa100.input,{},{
   now:()=>performance.now()+shift,
   schedule(fn,delay){return setTimeout(()=>{if(delay>20000)shift+=30000;fn();},delay>20000?60:delay);}
  });
  assert(r.kind==='timeout'&&r.reason==='host-timeout'&&r.input===rsa100.input&&r.allWorkersDisposed,'One total deadline');
 }],
 ['injected protocol failure retires and a fresh explicit request recovers',async()=>{
  const bad=await withRun('32',{}, {createWorker:()=>fault(true)});assert(bad.kind==='fatal'&&bad.allWorkersDisposed,'Injected protocol failure');
  const good=await withRun('32');assert(good.kind==='factorized'&&good.allWorkersDisposed,'Fresh native recovery');
 }],
 ['wrong ready profile fails closed before computation',async()=>{
  posted=false;const r=await withRun(rsa100.input,{}, {createWorker:()=>fault(false)});
  assert(r.kind==='fatal'&&!posted&&r.allWorkersDisposed,'Wrong input or memory profile refused');
 }],
 ['zero and one are neither with no Worker',async()=>{
  const before=created;for(const n of ['0','1']){const r=await withRun(n);assert(r.kind==='neither'&&r.input===n&&r.workers===0,'Neither');}
  assert(created===before,'No Worker for zero or one');
 }]
];
globalThis.evaluationHarness={
 async run(){
  const tests=[];for(const[name,fn]of cases){try{await fn();tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:e.message});}}
  return{tests,created,maxLive,diagnostics,acceleratedClockIsPerformanceMeasurement:false};
 },
 async measure({id,seed,budgetMs}){
  const c=RSA_CASES.find(c=>c.id===id);assert(c,'Unknown official case');
  const outcome=await withRun(c.input,{seed,budgetMs});
  return{id:c.id,input:c.input,digits:c.digits,bits:c.bits,seed,outcome,knownFactorsUsed:false};
 },
 ownership:()=>({live,maxLive}),violations,errors,rejections
};
