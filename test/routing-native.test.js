// SPDX-License-Identifier: AGPL-3.0-only
// Protocol transport fixture with the real existing native engine/proof functions.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/extended/runner.js';
import {factorInteger} from '../src/engine/factor.js';
import {createNativePort} from '../src/routing/native-port.js';
import {createRoutingSession} from '../src/routing/session.js';
import {verifyRoutingResult} from '../src/routing/verification.js';
import {makeComputeScope} from '../src/site/document-scope.js';
function apiTransport({progressOnly=false}={}){
 const metrics={created:0,terminated:0,released:0};
 const api={...engine,runExtendedInput(input,options,deps){
  const createWorker=()=>{
   metrics.created++;const worker={onmessage:null,onerror:null,onmessageerror:null,releaseSource(){metrics.released++;},terminate(){metrics.terminated++;},postMessage(d){queueMicrotask(()=>{
    if(progressOnly){worker.onmessage?.({data:{protocolVersion:1,type:'progress',jobId:1,snapshot:{input,factors:[{value:'2',certainty:'proven',method:'small-prime'}],remaining:'30',operations:1,elapsedMs:0}}});return;}
    const result=factorInteger(BigInt(input),d.options);worker.onmessage?.({data:{protocolVersion:1,type:'result',jobId:1,result}});
   });}};queueMicrotask(()=>worker.onmessage?.({data:{protocolVersion:1,type:'ready'}}));return worker;
  };
  return engine.runExtendedInput(input,options,{...deps,createWorker});
 }};
 return{api,metrics};
}
test('native port borrows the routing scope and returns a verifiable exact prefix',async()=>{
 const t=apiTransport(),session=createRoutingSession({ports:{native:createNativePort({api:t.api,now:()=>0})},now:()=>0});
 const r=await session.run('91');assert.equal(verifyRoutingResult(r,{now:()=>0}).factorizationComplete,true);
 assert.deepEqual(t.metrics,{created:1,terminated:1,released:1});assert.equal((await session.run('1')).status,'neither');
});
test('native progress cancellation preserves its certified prefix and unknown work is fully charged',async()=>{
 const t=apiTransport({progressOnly:true}),session=createRoutingSession({ports:{native:createNativePort({api:t.api,now:()=>0})},now:()=>0});
 const r=await session.run('60',{onChange:e=>{if(e.phase==='accepted-prefix'&&e.factors.length)session.cancel();}});
 assert.equal(r.status,'cancelled');assert.equal(r.snapshot.remaining,'30');assert.equal(r.trace[0].workChargedUpperBound,50000);
 assert.deepEqual(t.metrics,{created:1,terminated:1,released:1});
});
test('native adapter rejects invalid requests before running the API',()=>{
 const t=apiTransport(),port=createNativePort({api:t.api,now:()=>0}),scope=makeComputeScope(),token={};scope.acquire(token);
 const request={stage:'native',workKey:'native',jobId:1,timeBudgetMs:100,workBudget:50000,deadline:100,input:'91'};
 for(const patch of [{timeBudgetMs:5001},{workBudget:1000001},{deadline:NaN}])assert.throws(()=>port.start({...request,...patch},{scope,scopeToken:token}));
 assert.equal(t.metrics.created,0);
});
