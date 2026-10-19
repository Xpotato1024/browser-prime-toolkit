import test from 'node:test';
import assert from 'node:assert/strict';
import { runPortfolio } from '../../bench/portfolio.js';
import { factorInteger } from '../../src/engine/factor.js';

function fakeFactory(behavior) {
  const lanes = [];
  return { lanes, createController({ onEvent }) {
    const lane = { phase: 'ready', disposed: false, config: null,
      start(input, config) { lane.config = config; behavior(lane, onEvent, input, config); },
      dispose() { lane.disposed = true; lane.phase = 'disposed'; },
    };
    lanes.push(lane); return lane;
  } };
}
test('Rho portfolio uses unique seeds, a shared operation cap and disposes every lane', async () => {
  const factory = fakeFactory((lane, emit, input, options) => queueMicrotask(() =>
    emit({ type: 'terminal', result: factorInteger(BigInt(input), options) })));
  const r = await runPortfolio('1000036000099', { algorithm: 'brent', seed: 4294967295,
    operationBudget: 100003, timeBudgetMs: 1000 }, 4, factory);
  assert.equal(r.status, 'complete');
  assert.equal(new Set(factory.lanes.map(l => l.config.seed)).size, 4);
  assert.ok(factory.lanes.reduce((sum, l) => sum + l.config.operationBudget, 0) <= 100003);
  assert.ok(factory.lanes.every(l => l.disposed));
});
test('pool failure and global timeout always stop every lane', async () => {
  const broken = fakeFactory((lane, emit) => queueMicrotask(() => emit({ type: 'error' })));
  await assert.rejects(runPortfolio('1000036000099', {}, 2, broken));
  assert.ok(broken.lanes.every(l => l.disposed));
  const stalled = fakeFactory(() => {});
  const r = await runPortfolio('1000036000099', { timeBudgetMs: 0 }, 2, stalled);
  assert.equal(r.status, 'incomplete');
  assert.equal(r.reason, 'host-timeout');
  assert.equal(r.remaining, r.input);
  assert.ok(stalled.lanes.every(l => l.disposed));
});
test('fixed-seed MPQS duplication and excessive worker counts are rejected', async () => {
  await assert.rejects(runPortfolio('12', { algorithm: 'tinyqs' }, 2));
  for (const count of [0, 3, 5, 100]) await assert.rejects(runPortfolio('12', {}, count));
});

test('individual host deadlines remain incomplete and preserve the submitted product', async () => {
  const factory = fakeFactory((lane, emit, input, options) => queueMicrotask(() => {
    const result = factorInteger(BigInt(input), { ...options, timeBudgetMs: 0 });
    emit({ type: 'terminal', result: { ...result, reason: 'host-timeout' } });
  }));
  const r = await runPortfolio('1000036000099', { timeBudgetMs: 1000 }, 2, factory);
  assert.equal(r.status, 'incomplete'); assert.equal(r.remaining, r.input);
  assert.ok(factory.lanes.every(l => l.disposed));
});
