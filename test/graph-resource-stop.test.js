// SPDX-License-Identifier: AGPL-3.0-only
import test from'node:test';import assert from'node:assert/strict';
import{runRusqsieve}from'../src/graph-profile/runner.js';
import{selectResourcePlan}from'../src/resources/policy.js';
const low={linearBytes:1114112,liveRequested:0,peakRequested:0,allocationFailures:0,lastFailed:0};
const config={version:1,profile:'baseline',bits:8,factorBaseBound:17,intervalHalfWidth:256,singleLimit:'1000',doubleLimit:'0',lpBits:10,thresholdAdjustment:-4,factorBaseSize:2};
const counters={full:0,slp:0,dlp:0,cycles:0,vertices:0,treeEdges:0,usable:0,ingested:0};
const timings={prepareMs:0,sieveMs:0,copyFreeMs:0,framingMs:0,submitMs:0,observeMs:0,extractMs:0};
function packet(first){const b=new Uint8Array(40),v=new DataView(b.buffer);b.set([81,83,86,49]);v.setUint16(4,10,true);v.setUint16(6,1,true);v.setUint32(8,28,true);v.setUint32(12,1,true);v.setUint32(16,20,true);v.setBigUint64(20,BigInt(first),true);return b.buffer;}
for(const phase of ['ready','batch','submitted'])for(const trigger of ['live','linear'])test('stop before further dispatch at '+phase+' '+trigger,async()=>{
 const commands=[];let retired=0,released=0;
 const high={...low,linearBytes:208*1048576,liveRequested:trigger==='live'?160*1048576:0,peakRequested:trigger==='live'?160*1048576:0};
 const owner={onmessage:null,terminate(){retired++;},releaseSource(){released++;},postMessage(d){
  commands.push(d.type);queueMicrotask(()=>{if(!owner.onmessage)return;
   let r;if(d.type==='init')r={type:'ready',role:d.role,maxMiB:d.maxMiB,config,dlpStats:counters,target:66,factorBaseSize:2,familyBudget:100000};
   if(d.type==='job')r={type:'batch',jobId:d.jobId,first:d.first,count:d.count,buffer:packet(d.first)};
   if(d.type==='submit')r={type:'submitted',jobId:d.jobId,relations:0,target:66,dlpStats:counters};
   if(!r)return;const memory=r.type===phase?high:low;
   if(trigger==='live'&&r.type===phase)memory.linearBytes=192*1048576;
   owner.onmessage?.({data:{version:21,generation:d.generation,timings,memory,...r}});
  });
 }};
 const r=await runRusqsieve('143',{workers:1,timeBudgetMs:1000,resourcePlan:selectResourcePlan({mode:'manual',workers:1,memoryMiB:512,timeBudgetMs:1000}),createWorker:()=>owner});
 assert.equal(r.reason,'coordinator-memory-soft-stop');assert.equal(r.allWorkersDisposed,true);assert.equal(r.allWorkerSourcesReleased,true);
 assert.deepEqual(commands,phase==='ready'?['init']:phase==='batch'?['init','job']:['init','job','submit']);
 assert.equal(retired,1);assert.equal(released,1);
});
