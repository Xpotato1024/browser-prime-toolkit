import test from 'node:test';
import assert from 'node:assert/strict';
import { createTinyQs } from './tinyqs.js';
import { Budget, BudgetExceeded } from './options.js';

const budget = (operations = 50000000) => new Budget({
  timeBudgetMs: 5000, operationBudget: operations,
}, () => performance.now(), () => {});
test('reviewed WASM MPQS returns an exact nontrivial divisor', async () => {
  const split = await createTinyQs();
  const n = 1000000000039n * 7000000000057n;
  const d = split(n, budget());
  assert.ok(d > 1n && d < n);
  assert.equal(n % d, 0n);
});
test('WASM bridge rejects out of bound, even and malformed values', async () => {
  const split = await createTinyQs();
  for (const n of [0n, 1n, 12n, (1n << 85n) + 1n]) {
    assert.throws(() => split(n, budget()), RangeError);
  }
  assert.throws(() => split('281474976710677', budget()), TypeError);
});
test('checkpoint exhaustion cleans up and allows the next WASM job', async () => {
  const split = await createTinyQs();
  const n = 1000000000039n * 7000000000057n;
  assert.throws(() => split(n, budget(165)), BudgetExceeded);
  const d = split(n, budget());
  assert.equal(n % d, 0n);
});
test('invalid WASM bytes cannot initialize a calculator', async () => {
  await assert.rejects(createTinyQs(new Uint8Array([0, 1, 2])));
});
