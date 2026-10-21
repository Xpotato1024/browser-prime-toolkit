// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
const {selectResourcePlan,validateResourcePlan}=await import(process.env.PRIME_LONG_RED==='1'?'../src/graph-multicore/policy.js':'../src/long-window/policy.js');
test('long experiment has finite explicit five-owner 512MiB plan and 1800s ceiling',()=>{
 const p=selectResourcePlan({mode:'manual',workers:5,memoryMiB:512,outstandingSlots:8,timeBudgetMs:1800000});
 assert.deepEqual(p.ownerCapsMiB,[256,64,64,64,64]);
 assert.equal(p.totalWasmBytes,512*1048576);
 assert.equal(p.transportBytes,64*1048576);
 assert.equal(validateResourcePlan(p),p);
 assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.ownerCapsMiB));
});
test('long experiment rejects automatic, oversized, unknown and forged settings',()=>{
 for(const settings of [{mode:'auto'},{workers:6},{memoryMiB:1536},{timeBudgetMs:1800001},{timeBudgetMs:Infinity},{outstandingSlots:16},{extra:true}]){
  assert.throws(()=>selectResourcePlan(settings));
 }
 const p=selectResourcePlan({mode:'manual',workers:5,memoryMiB:512,outstandingSlots:8,timeBudgetMs:100});
 assert.throws(()=>validateResourcePlan({...p,totalWasmBytes:1}));
 assert.throws(()=>validateResourcePlan({...p,ownerCapsMiB:[1024,64,64,64,64]}));
});
