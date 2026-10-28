// SPDX-License-Identifier: AGPL-3.0-only
// Protocol fixtures only: no mathematical output is accepted as a completed result.
import test from 'node:test';
import assert from 'node:assert/strict';
import {runSiqs400,selectResourcePlan} from '../src/siqs400/index.js';
import {runRusqsieve as baseline} from '../src/selected-wide/index.js';
const input=((1n<<400n)-1n).toString();
const plan=ms=>selectResourcePlan({mode:'manual',memoryMiB:1536,workers:1,timeBudgetMs:ms,outstandingSlots:4});
const config={version:1,profile:'baseline',bits:400,factorBaseBound:6000000,intervalHalfWidth:524288,singleLimit:'870000000',doubleLimit:'43704000000000000',lpBits:56,thresholdAdjustment:-23,factorBaseSize:200000};
const memory={linearBytes:16777216,liveRequested:1000000,peakRequested:1000000,allocationFailures:0,lastFailed:0};
const counters={full:0,slp:0,dlp:0,cycles:0,vertices:0,treeEdges:0,usable:0,ingested:0};
const timings=Object.fromEntries(['prepareMs','sieveMs','copyFreeMs','framingMs','submitMs','observeMs','extractMs'].map(k=>[k,0]));
function fixture({onJob=()=>{},readyPatch={},terminateFails=false}={}){
 const state={created:0,terminated:0,released:0,messages:[]};
 return{state,createWorker(){
  state.created++;
  const worker={postMessage(d){
   state.messages.push(d);
   queueMicrotask(()=>{
    const send=data=>worker.onmessage?.({data:{version:21,generation:d.generation,timings,...data}});
    if(d.type==='init')send({type:'ready',role:'coord',maxMiB:1024,config,memory,dlpStats:counters,target:200064,factorBaseSize:200000,familyBudget:750000,...readyPatch});
    if(d.type==='job')onJob(worker,d,send);
   });
  },releaseSource(){state.released++;},terminate(){state.terminated++;if(terminateFails)throw Error('retirement fixture');}};
  return worker;
 }};
}
test('401 bits and noncanonical input are rejected before Worker allocation; old public route stays332',()=>{
 let count=0;const createWorker=()=>{count++;throw Error('must not create');};
 for(const value of [(1n<<400n).toString(),'1e100','01','9'.repeat(122)])assert.throws(()=>runSiqs400(value,{resourcePlan:plan(100),createWorker}));
 assert.throws(()=>baseline(input,{resourcePlan:plan(100),createWorker}));assert.equal(count,0);
});
test('400-bit ready/active job cancellation retires all owned resources',async()=>{
 const controller=new AbortController(),f=fixture({onJob(){controller.abort();}});
 const r=await runSiqs400(input,{resourcePlan:plan(100),createWorker:f.createWorker,signal:controller.signal,now:()=>0});
 assert.equal(r.reason,'cancelled');assert.equal(r.kind,'cancelled');assert.equal(r.remaining,input);assert.deepEqual(r.factors,[]);
 assert.equal(r.familyBudget,750000);assert.equal(r.creditState.outstanding,1);
 assert.equal(r.allWorkersDisposed,true);assert.equal(r.allWorkerSourcesReleased,true);
 assert.equal(f.state.terminated,1);assert.equal(f.state.released,1);
 assert.ok(r.creditState.peakReservedBytes<=4*8388608);
});
test('finite wall timeout stays distinct from memory exhaustion',async()=>{
 const f=fixture();const r=await runSiqs400(input,{resourcePlan:plan(15),createWorker:f.createWorker,now:()=>0});
 assert.equal(r.kind,'timeout');assert.equal(r.reason,'time-budget');assert.equal(r.remaining,input);assert.equal(f.state.terminated,1);
});
test('Worker disappearance is worker-error, never assumed OOM',async()=>{
 const f=fixture({onJob(worker){worker.onerror({});}});
 const r=await runSiqs400(input,{resourcePlan:plan(100),createWorker:f.createWorker,now:()=>0});
 assert.equal(r.reason,'worker-error');assert.equal(r.allWorkersDisposed,true);
});
test('bad configuration and unissued extraction cannot become factor success',async()=>{
 for(const f of [fixture({readyPatch:{config:{...config,doubleLimit:'43704000000000001'}}}),fixture({onJob(_w,_d,send){send({type:'extracted',status:1,divisor:'2',memory});}})]){
  const r=await runSiqs400(input,{resourcePlan:plan(100),createWorker:f.createWorker,now:()=>0});
  assert.equal(r.reason,'protocol-failure');assert.deepEqual(r.factors,[]);assert.equal(r.remaining,input);
 }
});
test('observed coordinator threshold stops before the hard cap',async()=>{
 const f=fixture({readyPatch:{memory:{...memory,linearBytes:832*1048576}}});
 const r=await runSiqs400(input,{resourcePlan:plan(100),createWorker:f.createWorker,now:()=>0});
 assert.equal(r.reason,'coordinator-memory-soft-stop');assert.equal(r.allWorkersDisposed,true);assert.equal(f.state.messages.length,1);
});
test('retirement failure remains visible and does not fabricate a complete result',async()=>{
 const control=new AbortController(),f=fixture({terminateFails:true,onJob(){control.abort();}});
 const r=await runSiqs400(input,{resourcePlan:plan(100),createWorker:f.createWorker,signal:control.signal,now:()=>0});
 assert.equal(r.reason,'worker-retirement');assert.equal(r.allWorkersDisposed,false);assert.equal(r.allWorkerSourcesReleased,true);assert.deepEqual(r.factors,[]);
});
test('stale-generation packets are ignored until a current cancellation',async()=>{
 const control=new AbortController(),f=fixture({onJob(worker,d){
  worker.onmessage({data:{version:21,generation:d.generation-1,type:'extracted',status:1,divisor:'2'}});control.abort();
 }});
 const r=await runSiqs400(input,{resourcePlan:plan(100),createWorker:f.createWorker,signal:control.signal,now:()=>0});
 assert.equal(r.reason,'cancelled');assert.deepEqual(r.factors,[]);
});

test('familyLimit bounds issued work while retaining normal release/extraction behavior',async()=>{
 let issued=0,released=0,extracted=0,terminated=0;const createWorker=()=>{
  const worker={releaseSource(){},terminate(){terminated++;},postMessage(d){queueMicrotask(()=>{
   const send=data=>worker.onmessage?.({data:{version:21,generation:d.generation,timings,...data}});
   if(d.type==='init')send({type:'ready',role:'coord',maxMiB:1024,config,memory,dlpStats:counters,target:200064,factorBaseSize:200000,familyBudget:750000});
   if(d.type==='job'){
    issued+=d.count;const b=new Uint8Array(40),v=new DataView(b.buffer);b.set([81,83,86,49]);v.setUint16(4,10,true);v.setUint16(6,1,true);v.setUint32(8,28,true);v.setUint32(12,1,true);v.setUint32(16,20,true);v.setBigUint64(20,BigInt(d.first),true);
    send({type:'batch',jobId:d.jobId,first:d.first,count:d.count,buffer:b.buffer,memory});
   }
   if(d.type==='submit')send({type:'submitted',jobId:d.jobId,relations:0,dlpStats:counters,memory});
   if(d.type==='release'){released++;send({type:'released',before:memory,after:memory});}
   if(d.type==='extract'){extracted++;send({type:'extracted',status:2,divisor:null,before:memory,after:memory,nativeQuota:{extracting:true,active:0,preflightRefused:0,refusals:0,stages:[]}});}
  });}};return worker;
 };
 const r=await runSiqs400(input,{resourcePlan:plan(100),familyLimit:1,createWorker,now:()=>0});
 assert.equal(r.reason,'insufficient-relations');assert.equal(r.familiesIssued,1);assert.equal(r.familiesSubmitted,1);assert.equal(issued,1);assert.equal(released,1);assert.equal(extracted,1);assert.equal(terminated,1);
 for(const cap of [0,4097,NaN,'1'])assert.throws(()=>runSiqs400(input,{resourcePlan:plan(100),familyLimit:cap,createWorker(){throw Error('must not create');}}));
});
