// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectSitePlan,parseSiteInput} from '../../src/site/policy.js';
test('public parsing preserves integers and bounds expansion',()=>{
 assert.equal(parseSiteInput('9007199254740993'),'9007199254740993');
 assert.equal(parseSiteInput('3.2e1'),'32');
 for(const x of ['2.5','-1','<img>','1e10000','9'.repeat(101)])assert.throws(()=>parseSiteInput(x));
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
 const {heavyView}=await import('../../src/site/session.js');
 const p=(1n<<89n)-1n,input=(p*p).toString();
 const value={input,kind:'probable',factors:[{value:p.toString(),certainty:'probable'},{value:p.toString(),certainty:'probable'}],remaining:'1',allWorkersDisposed:true,allWorkerSourcesReleased:true};
 const view=heavyView(value,input,{now:()=>0,deadline:1000});assert.ok(view.copyText.includes(p.toString()+'^2'));assert.match(view.statusText,/未証明/);
 assert.throws(()=>heavyView({...value,remaining:'2'},input,{now:()=>0,deadline:1000}));
});
