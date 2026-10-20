// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import test from 'node:test';
import assert from 'node:assert/strict';
import {runRusqsieve} from '../src/rusqsieve/runner.js';
const memory={linearBytes:1114112,liveRequested:0,peakRequested:0,allocationFailures:0,lastFailed:0};
function batch(first,count){const b=new Uint8Array(16+count*24),v=new DataView(b.buffer);b.set([81,83,86,49]);v.setUint16(4,10,true);v.setUint16(6,1,true);v.setUint32(8,b.length-12,true);v.setUint32(12,count,true);for(let k=0;k<count;k++){const o=16+k*24;v.setUint32(o,20,true);v.setBigUint64(o+4,BigInt(first+k),true);}return b.buffer;}
function fixture(mode='normal'){
 const clock={value:0},owners=[];
 const createWorker=()=>{const index=owners.length,owner={terminated:0,released:0,onmessage:null,postMessage(d){queueMicrotask(()=>{
  if(!owner.onmessage)return;let response;
  if(d.type==='init'){if(mode==='late-ready')clock.value=10001;response={type:'ready',target:66,factorBaseSize:2,familyBudget:100000,memory};}
  if(d.type==='job')response={type:'batch',jobId:d.jobId,first:d.first,count:d.count,buffer:batch(d.first,d.count),memory};
  if(d.type==='submit')response={type:'submitted',jobId:d.jobId,relations:66,target:66,memory};
  if(d.type==='release')response={type:'released',before:memory,after:memory};
  if(d.type==='extract'){if(mode==='late-extract')clock.value=101;response={type:'extracted',status:1,divisor:'11',before:memory,after:memory};}
  owner.onmessage?.({data:{version:17,generation:d.generation,...response}});
 });},terminate(){owner.terminated++;if(mode==='terminate-throws'&&index===0)throw Error('test terminate');if(mode==='retirement-late')clock.value=101;},releaseSource(){owner.released++;if(mode==='release-throws'&&index===0)throw Error('test release');if(mode==='release-late')clock.value=10001;}};
 owners.push(owner);return owner;};
 return{clock,owners,createWorker};
}
const bounded=p=>Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(Error('Unresolved evaluation')),100))]);
for(const mode of ['late-ready','release-late','late-extract','retirement-late'])test('recheck deadline: '+mode,async()=>{
 const f=fixture(mode),budget=mode.includes('ready')||mode==='release-late'?20000:100;
 const r=await bounded(runRusqsieve('143',{createWorker:f.createWorker,timeBudgetMs:budget,now:()=>f.clock.value}));
 assert.equal(r.kind,'timeout');assert.equal(r.reason,budget===20000?'initialization-timeout':'time-budget');assert.deepEqual(r.factors,[]);assert.equal(r.remaining,'143');
});
for(const mode of ['terminate-throws','release-throws'])test('retirement isolates exceptions: '+mode,async()=>{
 const f=fixture(mode),r=await bounded(runRusqsieve('143',{workers:2,createWorker:f.createWorker,timeBudgetMs:1000,now:()=>f.clock.value}));
 assert.equal(r.kind,'incomplete');assert.equal(r.reason,'worker-retirement');assert.ok(f.owners.every(o=>o.terminated>0&&o.released>0));assert.ok(r.retirementErrors.length);
 if(mode==='terminate-throws')assert.equal(r.allWorkersDisposed,false);else assert.equal(r.allWorkerSourcesReleased,false);
});
test('normal owners are terminated and every Blob source is released',async()=>{
 const f=fixture(),r=await bounded(runRusqsieve('143',{workers:2,createWorker:f.createWorker,timeBudgetMs:1000,now:()=>f.clock.value}));
 assert.equal(r.kind,'factorized');assert.equal(r.allWorkersDisposed,true);assert.equal(r.allWorkerSourcesReleased,true);assert.ok(f.owners.every(o=>o.terminated===1&&o.released===1));
});
