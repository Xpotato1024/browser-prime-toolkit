import test from 'node:test';
import assert from 'node:assert/strict';
import { factorInteger } from '../../src/engine/factor.js';
import { verifySnapshot, verifyFactorResult } from '../../src/engine/result.js';

const product = result => result.factors.reduce((p, f) => p * BigInt(f.value), 1n) * BigInt(result.remaining);
function run(n, options = {}, runtime) {
  const result = factorInteger(n, { timeBudgetMs: 10000, ...options }, runtime);
  assert.equal(product(result), n);
  assert.equal(verifyFactorResult(result, n.toString()).input, n.toString());
  return result;
}
function trialFactors(n) {
  const out = [];
  for (let p = 2n; p * p <= n; p++) while (n % p === 0n) { out.push(p.toString()); n /= p; }
  if (n > 1n) out.push(n.toString());
  return out;
}
test('zero and one are neither prime nor composite', () => {
  for (const n of [0n, 1n]) {
    const r = run(n);
    assert.equal(r.status, 'neither');
    assert.equal(r.primality, 'neither');
    assert.deepEqual(r.factors, []);
  }
});
test('small exhaustive factors agree with an independent trial oracle', () => {
  for (let n = 2n; n <= 2500n; n++) {
    const r = run(n);
    assert.equal(r.status, 'complete');
    assert.deepEqual(r.factors.map(f => f.value), trialFactors(n), n.toString());
  }
});
for (const algorithm of ['brent', 'floyd']) {
  test(algorithm + ' factors a balanced semiprime and repeated large factors', () => {
    for (const [n, expected] of [
      [1000003n * 1000033n, ['1000003', '1000033']],
      [1000003n ** 2n, ['1000003', '1000003']],
      [1009n ** 3n, ['1009', '1009', '1009']],
    ]) {
      const r = run(n, { algorithm });
      assert.equal(r.status, 'complete');
      assert.deepEqual(r.factors.map(f => f.value), expected);
    }
  });
}
test('deterministic 64-bit policy handles primes and strong pseudoprimes', () => {
  assert.equal(run(2n ** 61n - 1n).primality, 'proven-prime');
  for (const n of [341550071728321n, 3825123056546413051n]) {
    const r = run(n, { operationBudget: 10000 });
    assert.equal(r.primality, 'composite');
    assert.notEqual(r.status, 'probable');
  }
  const r = run(2n ** 64n - 1n);
  assert.deepEqual(r.factors.map(f => f.value), ['3', '5', '17', '257', '641', '65537', '6700417']);
});
test('above 64 bits passing fixed bases remains explicitly probable', () => {
  const r = run(2n ** 89n - 1n);
  assert.equal(r.status, 'probable');
  assert.equal(r.primality, 'probable-prime');
  assert.deepEqual(r.factors, [{ value: (2n ** 89n - 1n).toString(), certainty: 'probable', method: 'mr-fixed7' }]);
});
test('operation exhaustion retains exact unresolved cofactor', () => {
  const n = 2n * 1000000007n * 1000000009n;
  const r = run(n, { operationBudget: 30 });
  assert.equal(r.status, 'incomplete');
  assert.equal(r.reason, 'operation-budget');
  assert.equal(r.factors[0].value, '2');
  assert.equal(r.remaining, (n / 2n).toString());
  assert.ok(r.operations <= 30);
});
test('deadline is checked inside arithmetic loops', () => {
  let clock = 0;
  const r = run(1000000007n * 1000000009n, { timeBudgetMs: 10 }, { now: () => clock++ });
  assert.equal(r.status, 'incomplete');
  assert.equal(r.reason, 'time-budget');
  assert.ok(r.operations < 20);
});
test('zero budgets return a verified unresolved result', () => {
  assert.equal(run(97n, { operationBudget: 0 }).reason, 'operation-budget');
  assert.equal(run(97n, { timeBudgetMs: 0 }).reason, 'time-budget');
});
test('progress snapshots remain reconstructable and isolated', () => {
  const snapshots = [];
  let clock = 0;
  const r = run(2n ** 20n * 1000003n * 1000033n, { timeBudgetMs: 10000 },
    { now: () => clock++, onProgress: snapshot => { snapshots.push(structuredClone(snapshot)); snapshot.factors.length = 0; } });
  assert.ok(snapshots.length > 0);
  for (const s of snapshots) { assert.equal(product(s), BigInt(s.input)); verifySnapshot(s, s.input); }
  assert.equal(product(r), BigInt(r.input));
});
test('invalid domain and options are rejected without work', () => {
  for (const n of [-1n, 10n ** 1024n]) assert.throws(() => factorInteger(n), RangeError);
  for (const n of ['12', 12, null]) assert.throws(() => factorInteger(n), TypeError);
  for (const options of [{ seed: 0 }, { seed: 2 ** 32 }, { seed: 1.5 }, { timeBudgetMs: -1 },
    { timeBudgetMs: Infinity }, { timeBudgetMs: 60001 }, { operationBudget: 50000001 },
    { operationBudget: 1.5 }, { algorithm: 'remote' }, { unknown: true }]) {
    assert.throws(() => factorInteger(12n, options));
  }
});
test('result verification rejects wrong products, certainty and completion', () => {
  const r = run(12n);
  assert.throws(() => verifyFactorResult({ ...r, remaining: '2' }, '12'));
  assert.throws(() => verifyFactorResult({ ...r, input: '13' }, '12'));
  assert.throws(() => verifyFactorResult({ ...r, status: 'probable' }, '12'));
  assert.throws(() => verifyFactorResult({ ...r, primality: 'proven-prime' }, '12'));
  assert.throws(() => verifySnapshot({ ...r, factors: [{ value: '4', certainty: 'proven', method: 'small-prime' }] }, '12'));
  assert.throws(() => verifySnapshot({ ...r, factors: [{ value: '2'.repeat(1025), certainty: 'proven', method: 'mr64' }] }, '12'));
  assert.throws(() => verifySnapshot({ ...r, factors: Array(4097).fill(r.factors[0]) }, '12'));
  assert.throws(() => verifySnapshot({ ...r, operations: NaN }, '12'));
});
test('seeded runs reproduce factors and work counts', () => {
  const a = run(1000003n * 1000033n, { seed: 123 });
  const b = run(1000003n * 1000033n, { seed: 123 });
  assert.deepEqual(a.factors, b.factors);
  assert.equal(a.operations, b.operations);
});
