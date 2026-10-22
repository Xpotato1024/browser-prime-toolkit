// SPDX-FileCopyrightText: 2026 Xpotato.net / Xpotato1024
// SPDX-License-Identifier: AGPL-3.0-only
import {BASE_FULL_WORKER_SOURCE,TUNED_FULL_WORKER_SOURCE} from '../src/full-siqs-opt/worker-source.js';
let selectedEngine=null;
const workerSource=()=>{if(selectedEngine===null)throw Error('Select engine first');const source=selectedEngine==='base'?BASE_FULL_WORKER_SOURCE:TUNED_FULL_WORKER_SOURCE;const marker='split.stats=()=>({nativeScope:';assert(source.split(marker).length===2,'Exact diagnostic marker');return source.replace(marker,'split.stats=()=>({resourceCounters:{sieveBlocks:Number(api._lab_stat(3)),basePolynomials:Number(api._lab_stat(4)),derivedPolynomials:Number(api._lab_stat(5))},wasmLinearBytes:api.HEAPU8.byteLength,saveCapacityBytes:16777216,nativeScope:');};
import {createRsaEvaluator} from '../src/full-siqs-opt/evaluator.js';
import {makeRsaWorker} from '../src/full-siqs-opt/factory.js';
import {makeWorkerFromSource} from '../src/worker/source-factory.js';
import {selectRsaPlan,RSA_PROFILE} from '../src/full-siqs-opt/profile.js';
import {RSA_CASES as OFFICIAL_CASES} from './staged-rsa/cases.js';
import {PRACTICAL_CASES} from './staged-practical/cases.js';
import {FULL_CASES} from './staged-full/cases.js';
const RSA_CASES=[...OFFICIAL_CASES,...PRACTICAL_CASES,...FULL_CASES];
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
const real=()=>{const w=track(makeWorkerFromSource(workerSource()));w.addEventListener('error',e=>diagnostics.push({workerError:e.message,line:e.lineno}));return w;};
const withRun=async(input,options={},deps={})=>{
 const e=createRsaEvaluator({createWorker:real,...deps});
 try{const r=await e.run(input,options);diagnostics.push({kind:r.kind,reason:r.reason,inputDigits:input.length,initializationMs:r.initializationMs});return r;}finally{e.dispose();}
};
const rsa100=RSA_CASES.find(c=>c.id==='RSA-100'),rsa2048=RSA_CASES.find(c=>c.id==='RSA-2048');
const fault=ready=>track(makeWorkerFromSource('self.postMessage('+JSON.stringify({protocolVersion:3,profile:RSA_PROFILE.id,type:'ready',backend:'full-siqs',maxBits:ready?332:999,wasmBytes:268435456})+');self.onmessage=()=>self.postMessage('+JSON.stringify({protocolVersion:3,profile:RSA_PROFILE.id,type:'error',jobId:1,code:'injected-protocol-error'})+');'));
async function auditNativeFailure(mode){
 const index=workerSource().lastIndexOf('\ninstallRsaWorker().catch(');assert(index>0,'Audit bundle entry');
 const source=workerSource().slice(0,index)+'\n(async()=>{const split=await createFullSiqsSplit();let trapped=false;try{split.auditFailure('+JSON.stringify(mode)+');}catch(e){trapped=e instanceof WebAssembly.RuntimeError;}let retired=false;try{split(1n<<100n,null,{seed:1});}catch(e){retired=e.message.includes("retired");}self.postMessage({trapped,retired,stats:split.stats()});})().catch(e=>self.postMessage({auditError:String(e.message)}));';
 const w=track(makeWorkerFromSource(source));
 try{return await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Audit timeout')),5000);w.onmessage=({data})=>{clearTimeout(timer);resolve(data);};w.onerror=e=>{clearTimeout(timer);e.preventDefault();reject(Error(e.message));};});}finally{w.terminate();w.releaseSource?.();}
}
const probe='1427247692705959880439315947500961989719490561';
const cases=[
 ['exact small inputs preserve full decimal results',async()=>{for(const n of ['32',(1n<<331n).toString()]){const r=await withRun(n);assert(r.kind==='factorized'&&r.snapshot.remaining==='1'&&r.allWorkersDisposed,'Exact input');}}],
 ['150-bit input enters full SIQS and remains probable',async()=>{const r=await withRun(probe);diagnostics.push({mode0Proof:{input:r.input,result:r.result,diagnostics:r.diagnostics}});const d=r.diagnostics;assert(d.nativeMode===0&&d.nativeScope==='last-split'&&d.phaseWork.reduce((a,b)=>a+b,0)===d.nativeWork&&d.notifications.periodic===Math.floor(d.nativeWork/d.stride)&&d.notifications.deliveries===d.notifications.periodic+d.notifications.flush,'Full accounting');assert(r.kind==='probable'&&r.result.remaining==='1'&&r.telemetry.some(t=>t.phase>=2)&&r.diagnostics.nnz>0&&r.diagnostics.phaseWork[4]>0&&r.diagnostics.phaseWork[5]>0&&r.diagnostics.phaseWork[6]>0,'Real SIQS result');}],
 ['profile and backend limits allocate no Worker',async()=>{const before=created;for(const [n,options] of [[(1n<<332n).toString(),{}],[probe,{backend:'brent'}],[rsa2048.input,{}]]){const r=await withRun(n,options);assert(r.kind==='unsupported'&&r.workers===0,'Unsupported');}assert(before===created,'No Worker');}],
 ['cancellation in loading and computation retires its owner',async()=>{for(const phase of ['loading','running']){posted=false;const e=createRsaEvaluator({createWorker:real}),p=e.run(rsa100.input);if(phase==='running'){for(let i=0;i<1000&&!posted;i++)await tick(1);assert(posted,'Packet sent');await tick(20);}e.cancel();const r=await p;assert(r.kind==='cancelled'&&r.allWorkersDisposed&&live===0,'Cancelled');e.dispose();}}],
 ['independent accelerated host deadline terminates stalled Worker',async()=>{let shift=0;const r=await withRun(rsa100.input,{budgetMs:600000},{now:()=>performance.now()+shift,schedule(fn,delay){return setTimeout(()=>{if(delay>20000)shift+=600000;fn();},delay>20000?60:delay);}});assert(r.kind==='timeout'&&r.allWorkersDisposed,'Host deadline');}],
 ['protocol failure retires and fresh request recovers',async()=>{const bad=await withRun('32',{}, {createWorker:()=>fault(true)});assert(bad.kind==='fatal'&&bad.allWorkersDisposed,'Injected failure');assert((await withRun('32')).kind==='factorized','Fresh request');}],
 ['wrong ready memory or bit profile fails closed',async()=>{posted=false;const r=await withRun(probe,{}, {createWorker:()=>fault(false)});assert(r.kind==='fatal'&&!posted&&r.allWorkersDisposed,'Wrong ready');}],
 ['zero and one need no Worker',async()=>{const before=created;for(const n of ['0','1'])assert((await withRun(n)).kind==='neither','Neither');assert(created===before,'No Worker');}]
];
cases.push(['real fixed-memory OOM traps and retires without reuse',async()=>{const r=await auditNativeFailure('oom');assert(r.trapped&&r.retired&&r.stats.poisoned&&r.stats.abortReason==='OOM','Real OOM');assert((await withRun('32')).kind==='factorized','Fresh recovery');}]);
cases.push(['unknown native trap retires and fresh request recovers',async()=>{const r=await auditNativeFailure('trap');assert(r.trapped&&r.retired&&r.stats.poisoned&&r.stats.abortReason!=='OOM','Unknown native trap');assert((await withRun('32')).kind==='factorized','Fresh recovery');}]);
globalThis.evaluationHarness={
 selectEngine(engine){if(selectedEngine!==null||!['base','lto'].includes(engine))throw Error('Immutable engine');selectedEngine=engine;},
 async run(){const tests=[];for(const[name,fn]of cases){try{await fn();tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:e.message});}}return{tests,created,maxLive,diagnostics,acceleratedClockIsPerformanceMeasurement:false};},
 async measure({id,seed,budgetMs}){const c=RSA_CASES.find(c=>c.id===id);assert(c,'Unknown case');const outcome=await withRun(c.input,{seed,budgetMs});return{id:c.id,input:c.input,digits:c.digits,bits:c.bits,seed,outcome,knownFactorsUsed:false};},
 ownership:()=>({live,maxLive}),violations,errors,rejections
};
