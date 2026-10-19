import test from 'node:test';
import assert from 'node:assert/strict';
import {factorInteger} from '../../src/engine/factor.js';
import {verifyRsaWorkerResult,verifyRsaSnapshot,classifyRsaResult} from '../../src/rsa/result.js';
const result=n=>factorInteger(n,{algorithm:'brent',timeBudgetMs:30000,operationBudget:50000000});
test('large perfect powers retain their full input and proven factorization',()=>{
 const n=1n<<2047n,r=verifyRsaWorkerResult(result(n),n.toString());assert.equal(r.input,n.toString());
 assert.equal(r.factors.length,2047);assert.equal(r.remaining,'1');assert.equal(classifyRsaResult(r),'factorized');
});
test('probable remains unproven after an independent host check',()=>{
 const n=2n*((1n<<89n)-1n);let ticks=0;
 const r=verifyRsaWorkerResult(result(n),n.toString(),()=>ticks++);
 assert.equal(classifyRsaResult(r),'probable');assert.ok(ticks>0);
 const composite=3n*((1n<<89n)-1n),forged={...result(n),input:composite.toString(),factors:[{value:composite.toString(),certainty:'probable',method:'mr-fixed7'}],remaining:'1',primality:'probable-prime'};
 assert.throws(()=>verifyRsaWorkerResult(forged,composite.toString()),/probable|prime/i);
});
test('timeouts, operation limits, primes and neither have distinct classifications',()=>{
 const r=result(10403n),partial={...r,factors:[],remaining:'10403',status:'incomplete',reason:'time-budget',primality:'composite'};
 assert.equal(classifyRsaResult(verifyRsaWorkerResult(partial,'10403')),'timeout');
 assert.equal(classifyRsaResult(verifyRsaWorkerResult({...partial,reason:'operation-budget'},'10403')),'incomplete');
 assert.equal(classifyRsaResult(verifyRsaWorkerResult(result(101n),'101')),'prime');
 for(const n of [0n,1n])assert.equal(classifyRsaResult(verifyRsaWorkerResult(result(n),n.toString())),'neither');
});
test('identity, source methods, oversized snapshots and expired proof cannot become successes',()=>{
 const n=2n*((1n<<89n)-1n),r=result(n);
 assert.throws(()=>verifyRsaWorkerResult(r,'32'));
 assert.throws(()=>verifyRsaWorkerResult({...r,algorithm:'floyd'},n.toString()));
 assert.throws(()=>verifyRsaWorkerResult({...r,factors:Array(2049).fill({value:'2',certainty:'proven',method:'small-prime'})},n.toString()));
 assert.throws(()=>verifyRsaWorkerResult(r,n.toString(),()=>{throw Error('proof expired');}),/proof expired/);
});
test('partial progress cannot retain a forged probable composite factor',()=>{
 const n=3n*((1n<<89n)-1n);
 const snapshot={input:n.toString(),factors:[{value:n.toString(),certainty:'probable',method:'mr-fixed7'}],remaining:'1',operations:1,elapsedMs:1};
 assert.throws(()=>verifyRsaSnapshot(snapshot,n.toString()),/probable|prime/i);
});
