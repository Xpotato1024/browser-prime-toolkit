import test from 'node:test';
import assert from 'node:assert/strict';
import {selectResourcePlan,validateResourcePlan} from '../src/resources/policy.js';
test('missing or unusable device hints fall back conservatively',()=>{
 for(const hints of [{},{hardwareConcurrency:NaN,deviceMemory:Infinity},{hardwareConcurrency:0,deviceMemory:0}]){
  const p=selectResourcePlan({},hints);assert.equal(p.workers,1);assert.equal(p.budgetBytes,128*1048576);assert.deepEqual(p.ownerCapsMiB,[128]);assert.equal(validateResourcePlan(p),p);
 }
});
test('automatic hints select finite reviewed tiers without maximizing CPU',()=>{
 const p=selectResourcePlan({}, {hardwareConcurrency:64,deviceMemory:8});
 assert.equal(p.workers,2);assert.equal(p.budgetBytes,512*1048576);assert.deepEqual(p.ownerCapsMiB,[256,64]);assert.equal(p.totalWasmBytes,320*1048576);
 assert.equal(selectResourcePlan({}, {hardwareConcurrency:2,deviceMemory:8}).workers,1);
 assert.equal(selectResourcePlan({}, {hardwareConcurrency:8,deviceMemory:4}).workers,2);
});
test('manual role caps fit whole budget or fail before allocation',()=>{
 for(const workers of [1,2,3,4]){
  const p=selectResourcePlan({mode:'manual',workers,memoryMiB:512,timeBudgetMs:60000});
  assert.deepEqual(p.ownerCapsMiB,[256,...Array(workers-1).fill(64)]);assert.ok(p.totalWasmBytes<=p.budgetBytes);assert.equal(p.transportBytes,33554432);assert.equal(p.outstandingSlots,4);
 }
 assert.deepEqual(selectResourcePlan({mode:'manual',workers:4,memoryMiB:384}).ownerCapsMiB,[128,64,64,64]);
 assert.throws(()=>selectResourcePlan({mode:'manual',workers:4,memoryMiB:256}));
 assert.throws(()=>selectResourcePlan({mode:'manual',workers:2,memoryMiB:128}));
});
test('reject unbounded, unknown and forged resource settings',()=>{
 for(const x of [{mode:'other'},{workers:5},{memoryMiB:1024},{timeBudgetMs:600001},{timeBudgetMs:0},{operationBudget:Infinity},{extra:true}])assert.throws(()=>selectResourcePlan(x));
 const p=selectResourcePlan({mode:'manual',workers:3,memoryMiB:512});
 assert.throws(()=>validateResourcePlan({...p,totalWasmBytes:1}));
 assert.throws(()=>validateResourcePlan({...p,ownerCapsMiB:[256,256,256]}));
 assert.throws(()=>validateResourcePlan({...p,transportBytes:67108864}));
 assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.ownerCapsMiB));
});

test('manual plans cannot impersonate automatic limits',()=>{
 for(const settings of [{mode:'manual',workers:4,memoryMiB:512},{mode:'manual',workers:1,memoryMiB:384}])assert.throws(()=>validateResourcePlan({...selectResourcePlan(settings),mode:'auto'}));
});
