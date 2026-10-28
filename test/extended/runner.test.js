// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {runExtendedInput,isVerifiedExtendedProgress} from '../../src/extended/runner.js';
import {factorInteger} from '../../src/engine/factor.js';
import {makeComputeScope} from '../../src/site/document-scope.js';
function transport({stall=false,corrupt=false,throwTerminate=false,throwRelease=false,events=[]}={}){
 const metrics={created:0,terminated:0,released:0};
 const createWorker=()=>{
  metrics.created++;const worker={onmessage:null,onerror:null,onmessageerror:null,
   terminate(){metrics.terminated++;if(throwTerminate)throw Error('retire');},
   releaseSource(){metrics.released++;if(throwRelease)throw Error('release');},
   postMessage(message){if(stall)return;queueMicrotask(()=>{
    const result=factorInteger(BigInt(message.input),message.options);
    if(corrupt)result.remaining='2';
    for(const snapshot of events)worker.onmessage?.({data:{protocolVersion:1,type:'progress',jobId:1,snapshot}});
    worker.onmessage?.({data:{protocolVersion:1,type:'result',jobId:1,result}});
   });}
  };queueMicrotask(()=>worker.onmessage?.({data:{protocolVersion:1,type:'ready'}}));return worker;
 };return{metrics,createWorker};
}
test('309-digit/1024-bit existing engine completes smooth input and disposes its only Worker',async()=>{
 const t=transport(),n=(1n<<1023n).toString(),r=await runExtendedInput(n,{timeBudgetMs:1000},t);
 assert.equal(r.status,'complete');assert.equal(r.remaining,'1');assert.equal(r.inspection.checkedMultiplicity,1023);
 assert.equal(r.factors.length,1023);assert.equal(r.allWorkersDisposed,true);assert.equal(r.allWorkerSourcesReleased,true);
 assert.deepEqual(t.metrics,{created:1,terminated:1,released:1});assert.equal(r.wasmBytes,0);
});
test('101-digit scientific input and probable-prime certainty are separate from public acceptance',async()=>{
 const a=await runExtendedInput('1e100',{},transport());assert.equal(a.status,'complete');assert.equal(a.factors.length,200);
 const b=await runExtendedInput(((1n<<127n)-1n).toString(),{},transport());assert.equal(b.status,'probable');
 assert.equal(b.factors[0].certainty,'probable');assert.equal(b.primality,'probable-prime');
});
test('out-of-range and invalid options create no Worker; zero/one need no computation',async()=>{
 const t=transport();
 for(const raw of [(1n<<1024n).toString(),'1e309','0'.repeat(4097)])await assert.rejects(runExtendedInput(raw,{},t));
 for(const options of [{timeBudgetMs:0},{timeBudgetMs:5001},{operationBudget:1000001},{algorithm:'siqs'}])await assert.rejects(runExtendedInput('12',options,t));
 assert.equal((await runExtendedInput('0',{},t)).status,'neither');assert.equal((await runExtendedInput('1',{},t)).status,'neither');
 assert.equal(t.metrics.created,0);
});
test('cancel and total deadline retire without dispatching another Worker',async()=>{
 const t=transport({stall:true}),control=new AbortController(),pending=runExtendedInput('1e100',{signal:control.signal},t);
 control.abort();const cancelled=await pending;
 assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.reason,'cancelled');assert.equal(cancelled.remaining,'1'+'0'.repeat(100));
 assert.deepEqual(t.metrics,{created:1,terminated:1,released:1});
 const timed=await runExtendedInput('123456789123456789',{timeBudgetMs:10},transport({stall:true}));
 assert.equal(timed.status,'incomplete');assert.equal(timed.reason,'time-budget');
});
test('finite work budget keeps an honest residual and does not imply SIQS completion',async()=>{
 const n=((1n<<521n)-1n)*((1n<<127n)-1n),r=await runExtendedInput(n.toString(),{operationBudget:50},transport());
 assert.equal(r.status,'incomplete');assert.equal(r.reason,'operation-budget');assert.equal(r.remaining,n.toString());
 assert.equal(r.inspection.executionEnabled,false);assert.equal(r.inspection.residualClass,'outside-siqs-residual');
});
test('corrupt results are rejected while the last verified prefix remains intact',async()=>{
 const r=await runExtendedInput('12',{},transport({corrupt:true}));
 assert.equal(r.status,'error');assert.equal(r.reason,'verification-failed');assert.deepEqual(r.factors,[]);assert.equal(r.remaining,'12');
 assert.equal(r.allWorkersDisposed,true);
});
test('retirement failures quarantine the scope and block a fresh Worker',async()=>{
 for(const flags of [{throwTerminate:true},{throwRelease:true}]){
  const scope=makeComputeScope(),t=transport(flags),r=await runExtendedInput('12',{}, {...t,scope});
  assert.equal(r.status,'blocked');assert.equal(r.reason,'worker-retirement');assert.equal(scope.isQuarantined(),true);
  const next=await runExtendedInput('12',{}, {...t,scope});assert.equal(next.reason,'scope-quarantined');assert.equal(t.metrics.created,1);
 }
});
test('pre-aborted requests do not create Workers and progress never invents a percentage',async()=>{
 const control=new AbortController();control.abort();const t=transport();
 assert.equal((await runExtendedInput('12',{signal:control.signal},t)).status,'cancelled');assert.equal(t.metrics.created,0);
 const events=[],r=await runExtendedInput('360',{onProgress:e=>events.push(e)},transport());
 assert.equal(r.status,'complete');assert.ok(events.some(e=>e.stage==='verifying'));
 assert.ok(events.every(e=>e.fraction===null));
});
test('a verified prefix survives a later invalid result and cannot be rolled back',async()=>{
 const prefix={input:'12',factors:[{value:'2',certainty:'proven',method:'small-prime'}],remaining:'6',operations:1,elapsedMs:0};
 const t=transport({corrupt:true,events:[prefix]}),r=await runExtendedInput('12',{},t);
 assert.equal(r.reason,'verification-failed');assert.equal(r.remaining,'6');assert.deepEqual(r.factors,prefix.factors);
 const rollback={input:'12',factors:[{value:'3',certainty:'proven',method:'small-prime'}],remaining:'4',operations:2,elapsedMs:0};
 const q=await runExtendedInput('12',{},transport({events:[prefix,rollback]}));assert.equal(q.reason,'verification-failed');assert.equal(q.remaining,'6');
});
test('a cancellation during the ready observer dispatches no calculation',async()=>{
 const t=transport(),control=new AbortController(),create=t.createWorker;let posted=0;
 const r=await runExtendedInput('12',{signal:control.signal,onProgress:e=>{if(e.stage==='computing')control.abort();}},{...t,createWorker:()=>{
  const worker=create(),post=worker.postMessage;worker.postMessage=x=>{posted++;post(x);};return worker;
 }});
 assert.equal(r.status,'cancelled');assert.equal(posted,0);assert.equal(t.metrics.terminated,1);
});
test('cancellation inside a trusted factory still retires its returned Worker',async()=>{
 const control=new AbortController(),t=transport(),create=t.createWorker;
 const r=await runExtendedInput('12',{signal:control.signal},{...t,createWorker:()=>{const worker=create();control.abort();return worker;}});
 assert.equal(r.status,'cancelled');assert.equal(r.allWorkersDisposed,true);assert.equal(t.metrics.terminated,1);
});
test('scope ownership is exclusive until retirement and late messages cannot create progress',async()=>{
 const scope=makeComputeScope(),t=transport({stall:true}),control=new AbortController();let worker,events=0,late;
 const pending=runExtendedInput('12',{signal:control.signal,onProgress:()=>events++},{...t,scope,createWorker:()=>{worker=t.createWorker();return worker;}});
 const second=await runExtendedInput('12',{}, {...t,scope});assert.equal(second.reason,'scope-busy');assert.equal(t.metrics.created,1);
 await new Promise(r=>setImmediate(r));late=worker.onmessage;control.abort();await pending;
 const count=events;late({data:{protocolVersion:1,type:'progress',jobId:1,snapshot:{}}});assert.equal(events,count);
 assert.equal(scope.isQuarantined(),false);assert.equal((await runExtendedInput('12',{}, {...transport(),scope})).status,'complete');
});
test('valid data exhausting proof or request time is not reported as a corrupt result',async()=>{
 const n=(1n<<1023n).toString();let tick=0;
 const proof=await runExtendedInput(n,{timeBudgetMs:5000},{...transport(),now:()=>tick++});
 assert.equal(proof.status,'incomplete');assert.equal(proof.reason,'verification-time-budget');assert.equal(proof.remaining,n);
 tick=0;
 const total=await runExtendedInput(n,{timeBudgetMs:20},{...transport(),now:()=>tick++});
 assert.equal(total.status,'incomplete');assert.equal(total.reason,'time-budget');assert.equal(total.remaining,n);
});
test('a verified whole-input prime progress snapshot is never labeled composite on a later error',async()=>{
 for(const n of [7n,(1n<<127n)-1n]){
  const calculated=factorInteger(n,{algorithm:'brent',timeBudgetMs:1000,operationBudget:50000,seed:1});
  const snapshot={input:n.toString(),factors:calculated.factors,remaining:'1',operations:1,elapsedMs:0};
  const r=await runExtendedInput(n.toString(),{},transport({corrupt:true,events:[snapshot]}));
  assert.equal(r.status,'error');assert.equal(r.reason,'verification-failed');
  assert.equal(r.primality,n===7n?'proven-prime':'probable-prime');
 }
});

test('accepted progress has its own immutable provenance and preserves prefix on callback cancellation',async()=>{
 const t=transport({events:[{input:'12',factors:[{value:'2',certainty:'proven',method:'small-prime'}],remaining:'6',operations:1,elapsedMs:0}]}),control=new AbortController(),seen=[];
 const r=await runExtendedInput('12',{signal:control.signal,onAccepted:s=>{
  seen.push(s);assert.equal(isVerifiedExtendedProgress(s,'12'),true);assert.equal(isVerifiedExtendedProgress({...s},'12'),false);assert.equal(Object.isFrozen(s.factors),true);control.abort();
 }},t);
 assert.equal(r.status,'cancelled');assert.equal(r.remaining,'6');assert.equal(seen.length,1);assert.equal(r.allWorkersDisposed,true);assert.equal(r.allWorkerSourcesReleased,true);
});
