// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
const residual='2092730116612106821063442900076655612965121';
// An isolated realm models the identifier rewriting observed in the published
// host bundle. Parameters/local references rename together; captured imports
// acquire bundle-local names that do not exist in the new Blob Worker.
async function sourceWithRenamedBindings(){
 const code="const{parentPort,workerData}=require('node:worker_threads');"+
 "(async()=>{const original=Function.prototype.toString;try{"+
 "Function.prototype.toString=function(){let s=original.call(this);if(this.name==='createGmpSplit'||this.name==='ecmWorkerMain')s=s.replace(/\\bcreateGmpSplit\\b/g,'bundleFactory').replace(/\\bGMP_BASE64\\b/g,'bundleBytes').replace(/\\becmWorkerMain\\b/g,'bundleWorker');return s;};"+
 "const m=await import(workerData);parentPort.postMessage(m.ECM_WORKER_SOURCE);"+
 "}finally{Function.prototype.toString=original;}})().catch(e=>{throw e;});";
 const w=new Worker(code,{eval:true,workerData:new URL('../src/routing/ecm-source.js',import.meta.url).href});
 try{return await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Source capture deadline')),5000);
  w.once('message',s=>{clearTimeout(timer);resolve(s);});w.once('error',e=>{clearTimeout(timer);reject(e);});
 });}finally{await w.terminate();}
}
async function run(source,{operationBudget=500000,withoutWasm=false}={}){
 const prefix="const{parentPort}=require('node:worker_threads');"+
 "globalThis.postMessage=data=>parentPort.postMessage(data);"+
 "parentPort.on('message',data=>globalThis.onmessage({data}));"+
 (withoutWasm?"globalThis.WebAssembly=undefined;":"");
 const w=new Worker(prefix+source,{eval:true}),messages=[];
 try{
  const pending=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('ECM result deadline')),5000);
   w.on('message',d=>{messages.push(d);if(d.type==='result'){clearTimeout(timer);resolve(d);}});
   w.once('error',e=>{clearTimeout(timer);reject(e);});
  });
  w.postMessage({version:1,type:'start',jobId:7,input:residual,timeBudgetMs:1000,operationBudget});
  return {result:await pending,messages};
 }finally{await w.terminate();}
}
test('renamed host bindings still initialize real ECM and return a proper divisor',{timeout:15000},async()=>{
 const {result:r,messages}=await run(await sourceWithRenamedBindings());
 assert.equal(messages[0].type,'ready','Blob Worker must not depend on host-local import names');
 assert.equal(messages[0].wasmBytes,67108864);
 assert.equal(r.reason,'exhausted');assert.equal(r.jobId,7);assert.equal(r.input,residual);
 const n=BigInt(residual),d=BigInt(r.divisor);
 assert.ok(d>1n&&d<n);assert.equal(n%d,0n);assert.equal(d*(n/d),n);
 assert.ok(r.operations>0&&r.operations<=500000);assert.equal(r.wasmBytes,67108864);
});
test('renamed ECM preserves the existing finite operation stop',{timeout:15000},async()=>{
 const {result:r,messages}=await run(await sourceWithRenamedBindings(),{operationBudget:1});
 assert.equal(messages[0].type,'ready');assert.equal(r.reason,'operation-budget');
 assert.equal(r.operations,1);assert.equal(r.divisor,null);assert.equal(r.wasmBytes,67108864);
});
test('a genuine WASM initialization failure is still a worker error',{timeout:15000},async()=>{
 const {result:r,messages}=await run(await sourceWithRenamedBindings(),{withoutWasm:true});
 assert.equal(messages.length,1);assert.equal(r.reason,'worker-error');
 assert.equal(r.operations,0);assert.equal(r.divisor,null);assert.equal(r.wasmBytes,null);
});
