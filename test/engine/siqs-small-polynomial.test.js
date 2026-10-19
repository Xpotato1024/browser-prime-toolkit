import test from 'node:test';
import assert from 'node:assert/strict';
import { createSiqsSplit } from '../../src/engine/siqs.js';
import { BudgetExceeded } from '../../src/engine/options.js';
test('unsupported 64bit polynomial selection is a clean capacity stop, with later recovery',async()=>{
  const split=await createSiqsSplit(),budget={tick(){}},options={seed:1};
  assert.throws(()=>split(10189224821914436983n,budget,options),e=>e instanceof BudgetExceeded&&e.reason==='algorithm-resource');
  assert.equal(split.stats().liveBytes,0);assert.equal(split.stats().poisoned,false);
  const n=1000000000039n*1000000000061n;assert.equal(n%split(n,budget,options),0n);
});
