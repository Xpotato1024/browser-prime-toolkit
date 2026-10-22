import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRsaCoreOptions} from '../../src/rsa/options.js';
import {factorRsaInteger} from '../../src/rsa/factor.js';
import {verifySnapshot as verifyRsaCoreSnapshot} from '../../src/rsa/core-result.js';
import {normalizeOptions,Budget} from '../../src/engine/options.js';
import {verifySnapshot} from '../../src/engine/result.js';
test('the RSA-only finite operation cap leaves legacy options unchanged',()=>{
 const c=normalizeRsaCoreOptions({operationBudget:200000000,timeBudgetMs:30000});
 assert.equal(c.operationBudget,200000000);assert.ok(Object.isFrozen(c));
 for(const options of [{operationBudget:200000001},{timeBudgetMs:30001},{algorithm:'floyd'},{seed:0}])assert.throws(()=>normalizeRsaCoreOptions(options));
 assert.throws(()=>normalizeOptions({operationBudget:50000001}));
});
test('RSA result metadata crosses 50M exactly without changing legacy proof contracts',()=>{
 for(const operations of [50000001,200000000]){
  const snapshot={input:'10403',factors:[],remaining:'10403',operations,elapsedMs:1};
  assert.equal(verifyRsaCoreSnapshot(snapshot,'10403').operations,operations);
  assert.throws(()=>verifySnapshot(snapshot,'10403'));
 }
 assert.throws(()=>verifyRsaCoreSnapshot({input:'10403',factors:[],remaining:'10403',operations:200000001,elapsedMs:1},'10403'));
});
test('RSA high operation budget still checks the clock on each checkpoint',()=>{
 let clock=0;const budget=new Budget(normalizeRsaCoreOptions({operationBudget:200000000,timeBudgetMs:30000}),()=>clock,()=>{});
 budget.tick();assert.equal(budget.operations,1);clock=30000;assert.throws(()=>budget.tick(),e=>e.reason==='time-budget');assert.equal(budget.operations,1);
 for(const [options,reason]of [[{timeBudgetMs:0,operationBudget:200000000},'time-budget'],[{timeBudgetMs:30000,operationBudget:0},'operation-budget']]){
  const result=factorRsaInteger(10403n,options);assert.equal(result.status,'incomplete');assert.equal(result.reason,reason);assert.equal(result.remaining,'10403');
 }
});
