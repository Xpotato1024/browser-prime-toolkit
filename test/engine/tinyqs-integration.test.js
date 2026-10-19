import test from 'node:test';
import assert from 'node:assert/strict';
import { createTinyQs } from '../../src/engine/tinyqs.js';
import { factorInteger } from '../../src/engine/factor.js';

const options = { algorithm: 'tinyqs', timeBudgetMs: 1000, operationBudget: 50000000 };
test('MPQS integration proves factors and keeps the exact input product', async () => {
  const split = await createTinyQs();
  for (const n of [1000000000039n * 7000000000057n, 101n * 7000000000057n,
    103n * 7000000000057n, 1000003n ** 2n, 12n, 0n, 1n]) {
    const r = factorInteger(n, options, { splitAdvanced: split });
    assert.equal(r.status, n < 2n ? 'neither' : 'complete');
    assert.ok(r.factors.every(f => f.certainty === 'proven'));
    assert.equal(r.factors.reduce((a, f) => a * BigInt(f.value), 1n) * BigInt(r.remaining), n);
  }
});
test('unsupported MPQS range and exhausted search remain incomplete', () => {
  for (const [n, splitAdvanced, reason] of [
    [1000000000039n * 7000000000057n, () => null, 'algorithm-exhausted'],
    [(2n ** 61n - 1n) * (2n ** 31n - 1n), () => { throw Error('Must not call'); }, 'algorithm-range'],
  ]) {
    const r = factorInteger(n, options, { splitAdvanced });
    assert.equal(r.status, 'incomplete'); assert.equal(r.reason, reason);
    assert.equal(r.remaining, n.toString()); assert.equal(r.primality, 'composite');
  }
});
test('advanced adapter cannot supply a fake divisor or silently run without initialization', () => {
  const n = 1000000000039n * 7000000000057n;
  for (const splitAdvanced of [undefined, () => 1n, () => n, () => 17n]) {
    assert.throws(() => factorInteger(n, options, { splitAdvanced }));
  }
});
