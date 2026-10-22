import test from 'node:test';
import assert from 'node:assert/strict';
import { createGmpSplit } from '../../src/engine/gmp.js';
import { Budget, BudgetExceeded } from '../../src/engine/options.js';
const budget = ops => new Budget({ timeBudgetMs: 5000, operationBudget: ops ?? 50000000 }, () => performance.now(), () => {});
for (const algorithm of ['gmp-brent', 'gmp-ecm']) {
  test(algorithm + ': exact divisor and all input/config boundaries', async () => {
    const split = await createGmpSplit(), config = { algorithm, seed: 17 };
    const n = 1000003n * 1000033n, d = split(n, budget(), config);
    assert.ok(d > 1n && d < n); assert.equal(n % d, 0n);
    for (const v of [0n, 1n, 3n, 12n, (1n << 256n) + 1n]) assert.throws(() => split(v, budget(), config), RangeError);
    assert.throws(() => split('10403', budget(), config), TypeError);
    for (const seed of [0, -1, 4294967296, 0.1]) assert.throws(() => split(n, budget(), { algorithm, seed }), TypeError);
  });
  test(algorithm + ': latched budget failure unwinds, then reuses the instance', async () => {
    const split = await createGmpSplit(), config = { algorithm, seed: 1 };
    const n = 1000000000039n * 7000000000057n;
    for (const ops of [0, 1, 2, 5, 20]) assert.throws(() => split(n, budget(ops), config), BudgetExceeded);
    const d = split(10403n, budget(), config);
    assert.equal(10403n % d, 0n);
  });
}
test('GMP loader rejects invalid WASM before becoming ready', async () => {
  await assert.rejects(createGmpSplit(new Uint8Array([0, 1, 2])));
});
