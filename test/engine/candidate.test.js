import test from 'node:test';
import assert from 'node:assert/strict';
import { factorInteger } from '../../src/engine/factor.js';

for (const algorithm of ['gmp-brent', 'gmp-ecm']) {
  test(algorithm + ': common proof and product contract with trusted splitter', () => {
    const calls = [];
    const result = factorInteger(10403n, { algorithm, seed: 17 }, {
      now: () => 0,
      splitAdvanced(value, budget, config) {
        calls.push([value, config.algorithm, config.seed]);
        budget.tick();
        return 101n;
      },
    });
    assert.equal(result.status, 'complete');
    assert.equal(result.remaining, '1');
    assert.equal(result.algorithm, algorithm);
    assert.deepEqual(result.factors.map(f => f.value), ['101', '103']);
    assert.deepEqual(calls, [[10403n, algorithm, 17]]);
  });
  test(algorithm + ': explicit exhaustion never silently falls back', () => {
    const result = factorInteger(10403n, { algorithm }, { now: () => 0, splitAdvanced: () => null });
    assert.equal(result.status, 'incomplete');
    assert.equal(result.reason, 'algorithm-exhausted');
    assert.equal(result.remaining, '10403');
  });
  test(algorithm + ': untrusted divisor rejected', () => {
    assert.throws(() => factorInteger(10403n, { algorithm }, {
      now: () => 0, splitAdvanced: () => 100n,
    }), /Invalid divisor/);
  });
}
