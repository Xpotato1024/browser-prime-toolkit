// SPDX-License-Identifier: AGPL-3.0-only
import test from'node:test';import assert from'node:assert/strict';
const{runRusqsieve}=await import(process.env.PRIME_FATAL_RED==='1'?'../src/graph-profile/runner.js':'../src/graph-release/runner.js');
import{selectResourcePlan}from'../src/resources/policy.js';
for(const reason of ['wasm-oom','fatal-unknown'])test('fatal at resource threshold keeps exact classification: '+reason,async()=>{
 let retired=0,released=0,posted=0;
 const worker={onmessage:null,terminate(){retired++;},releaseSource(){released++;},postMessage(d){posted++;queueMicrotask(()=>worker.onmessage?.({data:{version:21,generation:d.generation,type:'fatal',reason,message:'injected fault without allocating memory',timings:{prepareMs:0,sieveMs:0,copyFreeMs:0,framingMs:0,submitMs:0,observeMs:0,extractMs:0},memory:{linearBytes:208*1048576,liveRequested:160*1048576,peakRequested:160*1048576,allocationFailures:reason==='wasm-oom'?1:0,lastFailed:reason==='wasm-oom'?65536:0}}}));}};
 const r=await runRusqsieve('143',{workers:1,timeBudgetMs:1000,resourcePlan:selectResourcePlan({mode:'manual',workers:1,memoryMiB:512,timeBudgetMs:1000}),createWorker:()=>worker});
 assert.equal(r.reason,reason);assert.equal(r.fatal.message,'injected fault without allocating memory');assert.equal(r.phaseMemory[0].type,'fatal');assert.equal(r.allWorkersDisposed,true);assert.equal(r.allWorkerSourcesReleased,true);assert.equal(retired,1);assert.equal(released,1);assert.equal(posted,1);
});
