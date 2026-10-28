// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';import assert from 'node:assert/strict';
import {createSiteSession} from '../../src/site/session.js';
import {runExtendedInput,isVerifiedExtendedOutcome} from '../../src/extended/runner.js';
import {makeExtendedResultView} from '../../src/extended/result-view.js';
import {factorInteger} from '../../src/engine/factor.js';
import {makeComputeScope} from '../../src/site/document-scope.js';
import {SITE_CAPABILITIES} from '../../src/site/capabilities.js';
import {validateSiteInput,siteInputLimit} from '../../src/site/policy.js';
import {executionPresentation} from '../../src/site/presentation.js';
function fixture({stall=false,throwTerminate=false,scope=makeComputeScope(),onChange=()=>{}}={}){
 const calls=[],metrics={created:0,terminated:0,released:0};
 const createWorker=()=>{metrics.created++;const worker={onmessage:null,onerror:null,onmessageerror:null,
  releaseSource(){metrics.released++;},terminate(){metrics.terminated++;if(throwTerminate)throw Error('retire');},
  postMessage(message){calls.push(message);if(!stall)queueMicrotask(()=>worker.onmessage?.({data:{protocolVersion:1,type:'result',jobId:1,result:factorInteger(BigInt(message.input),message.options)}}));}
 };queueMicrotask(()=>worker.onmessage?.({data:{protocolVersion:1,type:'ready'}}));return worker;};
 const session=createSiteSession({scope,onChange,loadExtended:async()=>({runExtendedInput:(input,options,deps)=>runExtendedInput(input,options,{...deps,createWorker})})});
 return{session,scope,calls,metrics,createWorker};
}
test('standard acceptance1024 is separate from small128 and unchanged SIQS332',()=>{
 const modes=SITE_CAPABILITIES.modes;assert.equal(modes[0].maxBits,1024);assert.equal(modes[0].maxDigits,309);
 assert.equal(SITE_CAPABILITIES.smallInputRoute.exclusiveUpperPowerOfTwo,128);
 const max=((1n<<1024n)-1n).toString();assert.equal(validateSiteInput(max,'standard'),max);
 for(const mode of ['optimized','wide'])assert.throws(()=>validateSiteInput(max,mode));
 assert.throws(()=>validateSiteInput((1n<<1024n).toString(),'standard'));assert.match(siteInputLimit('standard').note,/保証/);
});
test('adapter runs scientific101digits and shows actual finite Brent resources',async()=>{
 const f=fixture();await f.session.prepare();await f.session.start('1e100',{timeBudgetMs:60000});
 const state=f.session.getState();assert.equal(state.phase,'result',JSON.stringify(state));assert.match(state.view.equation,/2\^100 × 5\^100/);
 assert.equal(state.resources.route,'extended-brent');assert.equal(state.resources.actualTimeBudgetMs,5000);
 assert.equal(state.resources.actualWorkers,1);assert.equal(state.resources.actualWasmBytes,0);assert.equal(state.resources.actualOperationBudget,50000);
 assert.equal(f.calls[0].options.timeBudgetMs<=5000,true);assert.equal(f.calls[0].options.operationBudget,50000);
 assert.equal(f.scope.isQuarantined(),false);assert.equal(f.metrics.terminated,1);
 assert.match(JSON.stringify(executionPresentation(state.resources,1).limits),/有限Brent/);
});
test('certified outcomes are immutable and cannot be forged or attached to another input',async()=>{
 const f=fixture(),result=await runExtendedInput('1e100',{}, {createWorker:f.createWorker,scope:f.scope});
 assert.equal(isVerifiedExtendedOutcome(result,result.input),true);assert.equal(Object.isFrozen(result.factors[0]),true);
 assert.throws(()=>result.factors[0].value='7');assert.throws(()=>result.allWorkersDisposed=false);
 assert.match(makeExtendedResultView(result,result.input).statusText,/分解完了/);
 assert.throws(()=>makeExtendedResultView(structuredClone(result),result.input));
 assert.throws(()=>makeExtendedResultView(result,'32'));
});
test('borrowed lease remains owned through display and cannot be borrowed with another token',async()=>{
 const f=fixture(),token={};assert.equal(f.scope.acquire(token),true);
 const result=await runExtendedInput('1e100',{}, {createWorker:f.createWorker,scope:f.scope,scopeToken:token});
 assert.equal(result.status,'complete');assert.equal(f.scope.owns(token),true);
 assert.equal(f.scope.acquire({}),false);f.scope.release(token);
 const bad=await runExtendedInput('1e100',{}, {createWorker:f.createWorker,scope:f.scope,scopeToken:{}});
 assert.equal(bad.status,'blocked');assert.equal(f.metrics.created,1);
});
test('cancel/unmount and uncertain retirement preserve the document scope boundary',async()=>{
 const f=fixture({stall:true});await f.session.prepare();const pending=f.session.start('1e100');
 assert.equal(f.session.cancel(),true);await pending;const state=f.session.getState();
 assert.equal(state.phase,'result',JSON.stringify(state));assert.match(state.view.statusText,/中止/);assert.equal(f.metrics.terminated,1);
 const bad=fixture({throwTerminate:true});await bad.session.prepare();await bad.session.start('1e100');
 assert.equal(bad.session.getState().phase,'blocked');assert.equal(bad.scope.isQuarantined(),true);
 assert.equal(await bad.session.start('32'),false);
});
test('bounded large prime keeps probable status and copying retains uncertainty',async()=>{
 const f=fixture(),n=((1n<<521n)-1n).toString();await f.session.prepare();await f.session.start(n);
 const view=f.session.getState().view;assert.match(view.statusText,/未証明/);assert.equal(view.groups[0].certainty,'probable');
 assert.match(view.copyText,/未証明/);assert.equal(view.residual,null);
});
