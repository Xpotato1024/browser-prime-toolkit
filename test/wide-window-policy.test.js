// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
const {selectResourcePlan,validateResourcePlan}=await import(process.env.PRIME_WIDE_RED==='1'?'../src/long-window/policy.js':'../src/wide-window/policy.js');
test('wide experiment requires an explicit finite manual budget and preserves global transport capacity',()=>{
 const p=selectResourcePlan({mode:'manual',workers:5,memoryMiB:1536,timeBudgetMs:3600000,outstandingSlots:8});
 assert.deepEqual(p.ownerCapsMiB,[1024,64,64,64,64]);assert.equal(p.totalWasmBytes,1280*1048576);assert.equal(p.budgetBytes,1536*1048576);assert.equal(p.transportBytes,64*1048576);assert.equal(validateResourcePlan(p),p);assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.ownerCapsMiB));
});
test('wide mode rejects implicit, automatic, oversized and forged allocations',()=>{
 for(const s of [{},{mode:'manual'},{mode:'manual',memoryMiB:512},{mode:'auto',memoryMiB:1536},{mode:'manual',memoryMiB:2048},{mode:'manual',memoryMiB:1536,workers:6},{mode:'manual',memoryMiB:1536,timeBudgetMs:3600001},{mode:'manual',memoryMiB:1536,outstandingSlots:16},{mode:'manual',memoryMiB:1536,extra:true}])assert.throws(()=>selectResourcePlan(s));
 const p=selectResourcePlan({mode:'manual',memoryMiB:1536,workers:5,timeBudgetMs:100});assert.throws(()=>validateResourcePlan({...p,totalWasmBytes:1}));assert.throws(()=>validateResourcePlan({...p,ownerCapsMiB:[2048,64,64,64,64]}));
});
