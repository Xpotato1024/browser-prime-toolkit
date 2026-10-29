// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectSitePlan,parseSiteInput} from '../../src/site/policy.js';
test('public parsing preserves integers and bounds expansion',()=>{
 assert.equal(parseSiteInput('9007199254740993'),'9007199254740993');
 assert.equal(parseSiteInput('3.2e1'),'32');assert.equal(parseSiteInput('1e100'),'1'+'0'.repeat(100));
 for(const x of ['2.5','-1','<img>','1e10000',(1n<<1024n).toString()])assert.throws(()=>parseSiteInput(x));
});
test('wide is explicit, finite and keeps role and queue bounds',()=>{
 assert.throws(()=>selectSitePlan('wide',{},{}));
 const p=selectSitePlan('wide',{mode:'manual',memoryMiB:1536,workers:5,timeBudgetMs:3600000},{});
 assert.deepEqual(p.ownerCapsMiB,[1024,64,64,64,64]);
 assert.equal(p.totalWasmBytes,1280*1048576);
 assert.equal(p.outstandingSlots,8);
 assert.throws(()=>selectSitePlan('wide',{mode:'manual',memoryMiB:1536,workers:6},{}));
 assert.throws(()=>selectSitePlan('wide',{mode:'manual',memoryMiB:1536,timeBudgetMs:3600001},{}));
});
test('automatic fallback and small-input path do not allocate the wide budget',()=>{
 const p=selectSitePlan('optimized',{},{});assert.equal(p.workers,1);assert.equal(p.budgetBytes,128*1048576);
 const small=selectSitePlan('wide',{mode:'manual',memoryMiB:1536,workers:5,timeBudgetMs:3600000},{},true);
 assert.equal(small.workers,1);assert.equal(small.timeBudgetMs,60000);
 assert.ok(small.totalWasmBytes<=128*1048576);
});
test('document scope retains unknown retirement and prevents overlapping jobs',async()=>{
 const {makeComputeScope,documentComputeScope}=await import('../../src/site/document-scope.js');
 const scope=makeComputeScope(),a={},b={};
 assert.equal(scope.acquire(a),true);assert.equal(scope.acquire(b),false);
 scope.release(b);assert.equal(scope.acquire(b),false);
 scope.release(a);assert.equal(scope.acquire(b),true);
 scope.quarantine();scope.release(b);assert.equal(scope.acquire(a),false);
 const document={};assert.equal(documentComputeScope(document),documentComputeScope(document));
 assert.notEqual(documentComputeScope({}),documentComputeScope(document));
});

test('repeated high factors use powers while keeping probable status and product verification',async()=>{
 const {createVerifiedRoutingSession,verifyRoutingResult}=await import('../../src/routing/verification.js');
 const {makeRoutingView}=await import('../../src/site/routing-view.js');
 const p=(1n<<89n)-1n,input=(p*p).toString();
 const run=async remaining=>{
  const port={start(r){return{result:Promise.resolve({reason:'exhausted',
   packet:{version:1,jobId:r.jobId,stage:r.stage,input:r.input,seq:1,work:1,
    snapshot:{factors:[{value:p.toString(),exponent:2}],remaining},reportedPrimality:'unknown'}}),
   dispose:()=>({allWorkersDisposed:true,allWorkerSourcesReleased:true})};}};
  return createVerifiedRoutingSession({ports:{native:port,ecm:port,siqs332:port},now:()=>0}).run(input,{jobTimeMs:1000});
 };
 const raw=await run('1'),result=verifyRoutingResult(raw,{now:()=>0});
 const view=makeRoutingView(result,input);
 assert.equal(result.status,'probable');assert.equal(result.decompositionComplete,true);
 assert.equal(result.factorizationComplete,false);assert.equal(view.groups[0].exponent,2);
 assert.ok(view.copyText.includes(p.toString()+'^2'));assert.match(view.statusText,/未証明/);
 const bad=await run('2');
 assert.deepEqual(bad.snapshot,{factors:[],remaining:input});
 const badView=makeRoutingView(verifyRoutingResult(bad,{now:()=>0}),input);
 assert.equal(badView.groups.length,0);assert.notEqual(badView.status,'probable');
 assert.throws(()=>makeRoutingView({...result,snapshot:{factors:[],remaining:'2'}},input));
});
