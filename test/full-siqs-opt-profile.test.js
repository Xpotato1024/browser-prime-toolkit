import test from 'node:test';
import assert from 'node:assert/strict';
import {RSA_PROFILE,selectRsaPlan} from '../src/full-siqs-opt/profile.js';
import {createRsaEvaluator} from '../src/full-siqs-opt/evaluator.js';
test('full optimization keeps a single fixed owner and finite whole horizon',()=>{
 assert.equal(RSA_PROFILE.wasmBytes,268435456);assert.equal(RSA_PROFILE.workers,1);
 assert.equal(RSA_PROFILE.timeBudgetMs,600000);assert.equal(RSA_PROFILE.operationBudget,1000000000000);
 assert.equal(selectRsaPlan(((1n<<332n)-1n).toString(),{budgetMs:600000}).supported,true);
 assert.equal(selectRsaPlan(((1n<<332n)+1n).toString()).supported,false);
});
test('larger horizon and alternate backend fail before allocation',async()=>{
 let allocations=0;const e=createRsaEvaluator({createWorker(){allocations++;throw Error('Must not allocate');}});
 await assert.rejects(e.run('10403',{budgetMs:600001}));
 const r=await e.run('10403',{backend:'brent'});assert.equal(r.kind,'unsupported');assert.equal(allocations,0);e.dispose();
});
