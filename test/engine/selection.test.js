import test from 'node:test';
import assert from 'node:assert/strict';
import { selectEnginePlan } from '../../src/engine/selection.js';
test('selector uses exact canonical input at the 64/256bit boundaries',()=>{
  for(const value of [0n,1n,(1n<<64n)-1n]) {
    const p=selectEnginePlan(value.toString());assert.equal(p.eligible,true);
    assert.equal(p.algorithm,'brent');assert.equal(p.wasmLinearMemoryBytes,0);
  }
  for(const value of [1n<<64n,(1n<<256n)-1n]) {
    const p=selectEnginePlan(value.toString());assert.equal(p.algorithm,'gmp-ecm');
    assert.equal(p.wasmLinearMemoryBytes,67108864);
  }
  assert.deepEqual(selectEnginePlan((1n<<256n).toString()),{
    policy:'conservative-v1',eligible:false,input:(1n<<256n).toString(),reason:'selector-range'});
  assert.equal(selectEnginePlan('1.8446744073709551616e19').algorithm,'gmp-ecm');
});
test('selector freezes one global compute budget and phase envelope without adding wire options',()=>{
  const p=selectEnginePlan('10403',{seed:11,timeBudgetMs:123,operationBudget:456});
  assert.equal(p.workers,1);assert.equal(p.requestEnvelopeMs,5223);
  assert.deepEqual(p.options,{algorithm:'brent',seed:11,timeBudgetMs:123,operationBudget:456});
  assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.options));
  for(const options of [{workers:2},{algorithm:'siqs'},{seed:0},{timeBudgetMs:60001},{operationBudget:50000001},null,[]])
    assert.throws(()=>selectEnginePlan('10403',options));
  for(const input of ['-1','1.1','1e10001','9'.repeat(4097)])
    assert.throws(()=>selectEnginePlan(input));
});
