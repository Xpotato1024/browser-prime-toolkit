import test from 'node:test';
import assert from 'node:assert/strict';
import { installHarness } from '../../bench/harness-common.js';
import { factorInteger } from '../../src/engine/factor.js';
globalThis.addEventListener = () => {};
function setup() {
  const workers = new Set(), all = []; let peak = 0;
  const createWorker = () => {
    const timers = new Set();
    const worker = { terminated: false, releaseSource() {},
      postMessage(data) {
        const timer = setTimeout(() => {
          timers.delete(timer);
          if (!worker.terminated) worker.onmessage?.({ data: { protocolVersion: 1, type: 'result', jobId: data.jobId,
            result: factorInteger(BigInt(data.input), data.options) } });
        }, 20);
        timers.add(timer);
      },
      terminate() { if (!worker.terminated) { worker.terminated = true; workers.delete(worker); }
        for (const timer of timers) clearTimeout(timer); timers.clear(); },
    };
    workers.add(worker); all.push(worker); peak = Math.max(peak, workers.size);
    queueMicrotask(() => { if (!worker.terminated) worker.onmessage?.({ data: { protocolVersion: 1, type: 'ready' } }); });
    return worker;
  };
  installHarness(createWorker, '', 67108864);
  return { harness: globalThis.factorHarness, peak: () => peak,
    close() { globalThis.factorHarness.controller.dispose(); for (const worker of all) worker.terminate(); } };
}
for (const order of ['pool/pool', 'run/pool', 'pool/run']) {
  test('harness admission remains exclusive across await ready: ' + order, async () => {
    const s = setup();
    try {
      await s.harness.ready();
      const invoke = kind => kind === 'pool' ? s.harness.poolRun('12', { timeBudgetMs: 1000 }, 2) :
        s.harness.run('12', { timeBudgetMs: 1000 });
      const [first, second] = order.split('/');
      const results = await Promise.allSettled([invoke(first), invoke(second)]);
      assert.equal(results[0].status, 'fulfilled');
      assert.equal(results[0].value.status, 'complete');
      assert.equal(results[1].status, 'rejected');
      assert.ok(s.peak() <= 2, 'At most 2 owned candidate Workers');
    } finally { s.close(); }
  });
}

for (const order of ['cancel/pool', 'cancel/run', 'run/cancel', 'pool/cancel']) {
  test('cancellation helper owns admission through its delayed cancel: ' + order, async () => {
    const s = setup();
    try {
      await s.harness.ready();
      const invoke = kind => kind === 'cancel' ? s.harness.cancelRun('12', 'brent', 30) :
        kind === 'pool' ? s.harness.poolRun('12', { timeBudgetMs: 1000 }, 2) : s.harness.run('12');
      const [first, second] = order.split('/');
      const results = await Promise.allSettled([invoke(first), invoke(second)]);
      assert.equal(results[0].status, 'fulfilled');
      assert.equal(results[1].status, 'rejected');
      assert.ok(s.peak() <= 2);
    } finally { s.close(); }
  });
}
