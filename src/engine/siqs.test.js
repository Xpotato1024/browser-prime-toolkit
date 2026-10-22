import test from 'node:test';
import assert from 'node:assert/strict';
import { createSiqsSplit } from './siqs.js';
const budget = () => ({ tick() {} });
test('bounded SIQS finds an exact divisor and releases every job allocation', async () => {
  const split = await createSiqsSplit();
  const n = 1000000000039n * 1000000000061n;
  const f = split(n, budget(), { seed: 1 });
  assert.ok(f > 1n && f < n && n % f === 0n);
  assert.equal(split.stats().liveBytes, 0);
  assert.ok(split.stats().peakBytes > 0);
  assert.ok(split.stats().phaseMask & (1 << 5));
});
test('SIQS rejects range and seed before work', async () => {
  const split = await createSiqsSplit();
  for (const n of [5n, 1n << 129n]) assert.throws(() => split(n, budget(), { seed: 1 }), RangeError);
  assert.throws(() => split((1n << 80n) + 1n, budget(), { seed: 0 }), TypeError);
});
test('SIQS unwinds an interrupted job and can then factor exactly', async () => {
  const split = await createSiqsSplit(), stop = new Error('budget');
  assert.throws(() => split(1000000000039n * 1000000000061n, { tick() { throw stop; } }, { seed: 1 }), e => e === stop);
  assert.equal(split.stats().liveBytes, 0);
  const n = 1000000000039n * 1000000000061n, f = split(n, budget(), { seed: 11 });
  assert.equal(n % f, 0n);
});
test('SIQS uses the common verification and resource-result contract', async () => {
  const { factorInteger } = await import('./factor.js');
  const { BudgetExceeded } = await import('./options.js');
  const split = await createSiqsSplit(), n=1000000000039n*1000000000061n;
  const result=factorInteger(n,{algorithm:'siqs',operationBudget:50000000,timeBudgetMs:1000},{splitAdvanced:split});
  assert.equal(result.status,'complete');
  assert.equal(result.remaining,'1');
  for(const value of [1009n*1013n,1000000007n*((1n<<127n)-1n)]) {
    const outside=factorInteger(value,{algorithm:'siqs'},{splitAdvanced:()=>{assert.fail('range dispatch');}});
    assert.equal(outside.reason,'algorithm-range');
  }
  const limited=factorInteger(n,{algorithm:'siqs'},{splitAdvanced:()=>{throw new BudgetExceeded('algorithm-resource');}});
  assert.equal(limited.status,'incomplete');
  assert.equal(limited.reason,'algorithm-resource');
  assert.equal(limited.remaining,n.toString());
});
test('every reached SIQS phase can stop and release before a later successful job', async () => {
  const split=await createSiqsSplit(),n=1000000000039n*1000000000061n;
  for(let phase=1;phase<=6;phase++) {
    split.configureFault(phase,0);assert.equal(split(n,budget(),{seed:1}),null);
    assert.ok(split.stats().phaseMask&(1<<phase));assert.equal(split.stats().liveBytes,0);
    split.configureFault();const f=split(n,budget(),{seed:1});assert.equal(n%f,0n);
  }
});
