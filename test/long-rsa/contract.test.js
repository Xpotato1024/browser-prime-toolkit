import test from 'node:test';
import assert from 'node:assert/strict';
import {selectRsaPlan,RSA_PROFILE} from '../../src/long-rsa/profile.js';
import {normalizeRsaCoreOptions} from '../../src/long-rsa/options.js';
import {verifySnapshot} from '../../src/long-rsa/core-result.js';
import {createRsaEvaluator} from '../../src/long-rsa/evaluator.js';
import {Budget} from '../../src/engine/options.js';
import {RSA_PROFILE as fixed30} from '../../src/rsa/profile.js';
test('long evaluation accepts only the four named finite budgets and leaves the 30s profile fixed',()=>{
 for(const budgetMs of [3000,30000,180000,600000]){
  const p=selectRsaPlan('10403',{budgetMs});assert.equal(p.options.timeBudgetMs,budgetMs);assert.equal(p.options.operationBudget,10000000000);
 }
 for(const budgetMs of [0,3001,600001,Infinity])assert.throws(()=>selectRsaPlan('10403',{budgetMs}));
 assert.equal(fixed30.timeBudgetMs,30000);assert.equal(fixed30.operationBudget,200000000);
});
test('long counter metadata is exact past both old caps and stays finitely bounded',()=>{
 const c=normalizeRsaCoreOptions({operationBudget:10000000000,timeBudgetMs:600000});
 assert.ok(Object.isFrozen(c));assert.equal(c.operationBudget,10000000000);
 for(const operations of [200000001,10000000000]){
  const s={input:'10403',factors:[],remaining:'10403',operations,elapsedMs:599999};
  assert.equal(verifySnapshot(s,'10403').operations,operations);
 }
 assert.throws(()=>normalizeRsaCoreOptions({operationBudget:10000000001}));
 assert.throws(()=>normalizeRsaCoreOptions({timeBudgetMs:600001}));
 assert.throws(()=>verifySnapshot({input:'10403',factors:[],remaining:'10403',operations:10000000001,elapsedMs:0},'10403'));
});
test('the same shared clock stops a high finite budget at the minute deadline',()=>{
 let clock=0;const b=new Budget(normalizeRsaCoreOptions({operationBudget:10000000000,timeBudgetMs:600000}),()=>clock,()=>{});
 b.tick();clock=600000;assert.throws(()=>b.tick(),e=>e.reason==='time-budget');assert.equal(b.operations,1);
});
test('all named host deadlines charge initialization and cancellation retires one owner',async()=>{
 for(const budgetMs of [3000,30000,180000,600000]){
  let clock=0,terminated=0;const timers=[],sent=[];const w={postMessage:x=>sent.push(x),terminate(){terminated++;}};
  const e=createRsaEvaluator({now:()=>clock,schedule(fn,delay){const t={fn,delay};timers.push(t);return t;},unschedule:t=>t.dead=true,createWorker:()=>w});
  const p=e.run('10403',{budgetMs});assert.ok(timers.some(t=>t.delay===budgetMs));
  clock=250;w.onmessage({data:{protocolVersion:3,profile:RSA_PROFILE.id,type:'ready',backend:'brent',maxBits:2048,wasmBytes:0}});
  assert.equal(sent[0].options.timeBudgetMs,budgetMs-275);assert.equal(sent[0].options.operationBudget,10000000000);
  e.cancel();const r=await p;assert.equal(r.kind,'cancelled');assert.equal(r.requestWallMs,250);assert.equal(r.limits.timeBudgetMs,budgetMs);
  assert.equal(terminated,1);assert.equal(r.allWorkersDisposed,true);assert.ok(timers.every(t=>t.dead));e.dispose();
 }
});
import {installRsaWorker} from '../../src/long-rsa/install.js';
import {factorRsaInteger} from '../../src/long-rsa/factor.js';
import {RSA_WORKER_SOURCE} from '../../src/long-rsa/worker-source.js';
import {spawnSync} from 'node:child_process';
test('the long Worker accepts its exact finite grant, bounds packets and retires as one shot',()=>{
 const saved=globalThis.self,out=[];globalThis.self={postMessage:d=>out.push(d),addEventListener(){}};
 try{
  installRsaWorker();assert.equal(out[0].profile,RSA_PROFILE.id);
  const packet={protocolVersion:3,profile:RSA_PROFILE.id,type:'run',jobId:1,input:'32',options:{algorithm:'brent',seed:1,timeBudgetMs:600000,operationBudget:10000000000}};
  self.onmessage({data:packet});assert.equal(out.at(-1).result.status,'complete');assert.equal(out.at(-1).result.input,'32');
  self.onmessage({data:packet});assert.equal(out.at(-1).type,'error');
 }finally{globalThis.self=saved;}
});
test('long host deadline, initialization cap and late success all fail closed',async()=>{
 for(const phase of ['initialization','terminal']){
  let clock=0,dead=0;const w={postMessage(){},terminate(){dead++;}};
  const e=createRsaEvaluator({now:()=>clock,schedule:()=>({}),unschedule(){},createWorker:()=>w});
  const p=e.run('32',{budgetMs:600000});
  if(phase==='initialization')clock=5001;
  w.onmessage({data:{protocolVersion:3,profile:RSA_PROFILE.id,type:'ready',backend:'brent',maxBits:2048,wasmBytes:0}});
  if(phase==='terminal'){clock=600001;w.onmessage({data:{protocolVersion:3,profile:RSA_PROFILE.id,type:'result',jobId:1,result:factorRsaInteger(32n)}});}
  const r=await p;assert.equal(r.kind,phase==='initialization'?'fatal':'timeout');assert.equal(dead,1);e.dispose();
 }
});
test('the long bundle is a valid module and contains no oracle or runtime import',()=>{
 const r=spawnSync(process.execPath,['--check','--input-type=module'],{input:RSA_WORKER_SOURCE,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 assert.doesNotMatch(RSA_WORKER_SOURCE,/oracle|PRACTICAL_CASES|\bimport\s*\(/);
});
