import test from 'node:test';
import assert from 'node:assert/strict';
import { createSiqsSplit } from '../../src/engine/siqs.js';
import { BudgetExceeded } from '../../src/engine/options.js';
test('WASM SIQS early, middle and last allocation failures release, then recover',async()=>{
  const split=await createSiqsSplit(),n=1000000000039n*1000000000061n,budget={tick(){}},options={seed:1};
  assert.equal(n%split(n,budget,options),0n);
  const total=split.stats().allocations;assert.ok(total>100);
  for(const allocation of [1,2,Math.floor(total/2),total]) {
    split.configureFault(0,allocation);
    assert.throws(()=>split(n,budget,options),e=>e instanceof BudgetExceeded&&e.reason==='algorithm-resource');
    assert.equal(split.stats().liveBytes,0);assert.equal(split.stats().poisoned,false);
    split.configureFault();assert.equal(n%split(n,budget,options),0n);
  }
});
