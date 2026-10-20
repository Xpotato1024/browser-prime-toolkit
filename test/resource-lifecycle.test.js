// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import test from 'node:test';
import assert from 'node:assert/strict';
import {runRusqsieve as runResource} from '../src/resources/runner.js';
import {selectResourcePlan} from '../src/resources/policy.js';
const runRusqsieve=(input,{workers=1,timeBudgetMs=1000,...options}={})=>runResource(input,{...options,workers,timeBudgetMs,resourcePlan:selectResourcePlan({mode:'manual',workers,memoryMiB:512,timeBudgetMs})});
const memory={linearBytes:1114112,liveRequested:0,peakRequested:0,allocationFailures:0,lastFailed:0};
function batch(first,count){const length=284,b=new Uint8Array(16+count*(length+4)),v=new DataView(b.buffer);b.set([81,83,86,49]);v.setUint16(4,10,true);v.setUint16(6,1,true);v.setUint32(8,b.length-12,true);v.setUint32(12,count,true);for(let k=0;k<count;k++){const o=16+k*(length+4);v.setUint32(o,length,true);v.setBigUint64(o+4,BigInt(first+k),true);v.setUint32(o+20,33,true);}return b.buffer;}
const timing={prepareMs:0,sieveMs:0,copyFreeMs:0,framingMs:0,submitMs:0,observeMs:0,extractMs:0};
const config={version:1,profile:'baseline',bits:8,factorBaseBound:17,intervalHalfWidth:256,singleLimit:'1000',doubleLimit:'0',lpBits:10,thresholdAdjustment:-4,factorBaseSize:2};
const zero={full:0,slp:0,dlp:0,cycles:0,vertices:0,treeEdges:0,usable:0,ingested:0};

function fixture(mode='normal'){let submittedFull=0;
 const clock={value:0},owners=[];
 const createWorker=()=>{const index=owners.length,owner={terminated:0,released:0,onmessage:null,postMessage(d){queueMicrotask(()=>{
  if(!owner.onmessage)return;let response;
  if(d.type==='init'){if(mode==='late-ready')clock.value=10001;response={type:'ready',role:d.role,maxMiB:d.maxMiB,config,dlpStats:zero,target:66,factorBaseSize:2,familyBudget:100000,memory};}
  if(d.type==='job')response={type:'batch',jobId:d.jobId,first:d.first,count:d.count,buffer:batch(d.first,d.count),memory};
  if(d.type==='submit'){submittedFull+=new DataView(d.buffer).getUint32(12,true)*33;response={type:'submitted',dlpStats:{...zero,full:submittedFull,usable:submittedFull,ingested:submittedFull},jobId:d.jobId,relations:submittedFull,target:66,memory};}
  if(d.type==='release')response={type:'released',before:memory,after:memory};
  if(d.type==='extract'){if(mode==='late-extract')clock.value=101;response={type:'extracted',status:1,divisor:'11',before:memory,after:memory};}
  owner.onmessage?.({data:{version:21,generation:d.generation,timings:timing,...response}});
 });},terminate(){owner.terminated++;if(mode==='terminate-throws'&&index===0)throw Error('test terminate');if(mode==='retirement-late')clock.value=101;},releaseSource(){owner.released++;if((mode==='release-throws'||(mode==='release-throws-once'&&owner.released===1))&&index===0)throw Error('test release');if(mode==='release-late')clock.value=10001;}};
 owners.push(owner);return owner;};
 return{clock,owners,createWorker};
}
const bounded=p=>Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(Error('Unresolved evaluation')),100))]);
for(const workers of [1,2,3,4]){const scheduler='credit1';
for(const mode of ['late-ready','release-late','late-extract','retirement-late'])test(workers+' owners '+scheduler+' recheck deadline: '+mode,async()=>{
 const f=fixture(mode),budget=mode.includes('ready')||mode==='release-late'?20000:100;
 const r=await bounded(runRusqsieve('143',{scheduler,workers,createWorker:f.createWorker,timeBudgetMs:budget,now:()=>f.clock.value}));
 assert.equal(r.kind,'timeout');assert.equal(r.reason,budget===20000?'initialization-timeout':'time-budget');assert.deepEqual(r.factors,[]);assert.equal(r.remaining,'143');
});
for(const mode of ['terminate-throws','release-throws','release-throws-once'])test(workers+' owners '+scheduler+' retirement isolates exceptions: '+mode,async()=>{
 const f=fixture(mode),r=await bounded(runRusqsieve('143',{scheduler,workers,createWorker:f.createWorker,timeBudgetMs:1000,now:()=>f.clock.value}));
 assert.equal(r.kind,'incomplete');assert.equal(r.reason,'worker-retirement');assert.ok(f.owners.every(o=>o.terminated>0&&o.released>0));assert.ok(r.retirementErrors.length);
 if(mode==='terminate-throws')assert.equal(r.allWorkersDisposed,false);else assert.equal(r.allWorkerSourcesReleased,false);
});
test(workers+' owners '+scheduler+' normal owners are terminated and every Blob source is released',async()=>{
 const f=fixture(),r=await bounded(runRusqsieve('143',{scheduler,workers,createWorker:f.createWorker,timeBudgetMs:1000,now:()=>f.clock.value}));
 assert.equal(r.kind,'factorized');assert.equal(r.allWorkersDisposed,true);assert.equal(r.allWorkerSourcesReleased,true);assert.ok(f.owners.every(o=>o.terminated===1&&o.released===1));
});

}
