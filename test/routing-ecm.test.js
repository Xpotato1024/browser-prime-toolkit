// SPDX-License-Identifier: AGPL-3.0-only
// ECM adapter protocol fixtures. Real GMP execution is verified separately.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createEcmPort} from '../src/routing/ecm-port.js';
import {createRoutingSession} from '../src/routing/session.js';
const request={stage:'ecm',input:'91',jobId:1,workKey:'ecm',workBudget:500,timeBudgetMs:100,deadline:100,jobWasmBudgetMiB:128};
function fixture(data,{failTerminate=false}={}){
 const state={created:0,terminated:0,released:0};
 const createWorker=()=>{state.created++;return{onmessage:null,onerror:null,onmessageerror:null,postMessage(d){queueMicrotask(()=>this.onmessage?.({data:{version:1,type:'result',jobId:d.jobId,input:d.input,reason:'exhausted',operations:4,wasmBytes:67108864,divisor:'7',...data}}));},releaseSource(){state.released++;},terminate(){state.terminated++;if(failTerminate)throw Error('retirement');}};};
 return{state,port:createEcmPort({createWorker,now:()=>0})};
}
test('existing ECM divisor output maps to a bounded unproved decomposition packet',async()=>{
 const f=fixture(),lease=f.port.start(request),r=await lease.result;
 assert.equal(r.reason,'exhausted');assert.deepEqual(r.packet.snapshot,{factors:[{value:'7',exponent:1}],remaining:'13'});assert.equal(r.packet.reportedPrimality,'unknown');
 assert.deepEqual(lease.dispose(),{allWorkersDisposed:true,allWorkerSourcesReleased:true});assert.deepEqual(f.state,{created:1,terminated:1,released:1});
});
test('nondivisor, whole-input, wrong identity and excessive work are rejected',async()=>{
 for(const data of [{divisor:'8'},{divisor:'91'},{input:'93'},{operations:501}]){
  const f=fixture(data),lease=f.port.start(request);await assert.rejects(lease.result,e=>e.reason==='invalid-result');assert.equal(lease.dispose().allWorkersDisposed,true);
 }
});
test('ECM caps reject even/257bit inputs and memory below64MiB before allocation',()=>{
 const f=fixture();for(const patch of [{input:'92'},{input:(1n<<256n).toString()},{jobWasmBudgetMiB:0},{jobWasmBudgetMiB:undefined},{jobWasmBudgetMiB:NaN},{jobWasmBudgetMiB:Infinity},{jobWasmBudgetMiB:'128'}])assert.throws(()=>f.port.start({...request,...patch}));
 assert.equal(f.state.created,0);
});
test('preabort, deadline and retirement failure are explicit',async()=>{
 const signal=new AbortController();signal.abort();const f=fixture();
 assert.equal((await f.port.start(request,{signal:signal.signal}).result).reason,'cancelled');assert.equal(f.state.created,0);
 assert.equal((await f.port.start({...request,deadline:0}).result).reason,'phase-time-budget');
 const bad=fixture({}, {failTerminate:true}),lease=bad.port.start(request);await lease.result;assert.equal(lease.dispose().allWorkersDisposed,false);
});
test('real adapter contract connects to routing controller with simulated ECM messages only',async()=>{
 const f=fixture(),session=createRoutingSession({ports:{ecm:f.port},now:()=>0});
 const r=await session.run('91',{jobTimeMs:1000,maxStages:1});
 assert.equal(r.snapshot.remaining,'13');assert.equal(r.factorizationComplete,false);assert.equal(r.allStagesDisposed,true);assert.equal(r.trace[0].stage,'ecm');
});

test('forced cancellation preserves unknown-work rejection and always retires an in-flight Worker',async()=>{
 const control=new AbortController(),state={terminated:0,released:0};
 const port=createEcmPort({now:()=>0,createWorker:()=>({postMessage(){queueMicrotask(()=>control.abort());},releaseSource(){state.released++;},terminate(){state.terminated++;}})});
 const lease=port.start(request,{signal:control.signal});await assert.rejects(lease.result,e=>e.reason==='cancelled');
 assert.deepEqual(lease.dispose(),{allWorkersDisposed:true,allWorkerSourcesReleased:true});assert.deepEqual(state,{terminated:1,released:1});
});
test('reentrant constructor cancellation never posts work and closes its returned owner',async()=>{
 const control=new AbortController();let posted=0,terminated=0;
 const port=createEcmPort({now:()=>0,createWorker:()=>{control.abort();return{postMessage(){posted++;},releaseSource(){},terminate(){terminated++;}};}});
 const lease=port.start(request,{signal:control.signal});assert.equal((await lease.result).reason,'cancelled');assert.equal(posted,0);assert.equal(terminated,1);
});
