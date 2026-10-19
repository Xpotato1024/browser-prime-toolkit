import test from 'node:test';
import assert from 'node:assert/strict';
import { createGmpSplit } from '../../src/engine/gmp.js';
const n = 392318858461667547569595655490009919272404068553904357377n;
const config = { algorithm: 'gmp-ecm', seed: 1 };
const budget = { tick() {} };
test('actual stage2 cooperative stop cleans up and permits exact reuse', async () => {
  const split = await createGmpSplit(undefined, { stop: 5 });
  assert.equal(split(n, budget, config), null);
  const stats = split.stats();
  for (const point of [1, 5, 11, 12, 13]) assert.ok(stats.mask & (1 << point));
  assert.ok(stats.parameters.dF > 0 && stats.parameters.k > 0);
  assert.equal(stats.poisoned, false);
  split.configureAudit({});
  const d = split(10403n, budget, config); assert.equal(10403n % d, 0n);
});
for (const audit of [{ trap: 5 }, { domain: 1, allocation: 1 }, { domain: 2, allocation: 3 }]) {
  test('fatal stage2 fault poisons this instance: ' + JSON.stringify(audit), async () => {
    const split = await createGmpSplit(undefined, audit);
    assert.throws(() => split(n, budget, config));
    assert.equal(split.stats().injected, true);
    assert.equal(split.stats().poisoned, true);
    assert.throws(() => split(10403n, budget, config), /retired/);
    const fresh = await createGmpSplit(), d = fresh(10403n, budget, config);
    assert.equal(10403n % d, 0n);
  });
}
