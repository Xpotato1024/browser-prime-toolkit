import test from 'node:test';
import assert from 'node:assert/strict';
import { FactorWorkerController } from '../../src/worker/controller.js';
import { makeBundledWorker } from '../../src/worker/factory.js';
import { factorInteger } from '../../src/engine/factor.js';

const ready = { protocolVersion: 1, type: 'ready' };
function setup() {
  const workers = [], events = [], timers = new Map();
  let id = 0;
  const controller = new FactorWorkerController({
    createWorker() {
      const worker = { sent: [], terminated: false, released: 0, onmessage: null,
        postMessage(message) { this.sent.push(message); if (this.throwPost) throw Error('post'); },
        terminate() { this.terminated = true; }, releaseSource() { this.released++; },
        deliver(data) { this.onmessage?.({ data }); },
      };
      workers.push(worker); return worker;
    },
    onEvent(event) { events.push(event); },
    schedule(fn, delay) { const key = ++id; timers.set(key, { fn, delay }); return key; },
    unschedule(key) { timers.delete(key); },
  });
  function fire(delay) {
    const entry = [...timers].find(([, value]) => value.delay === delay);
    assert.ok(entry, 'timer at ' + delay); timers.delete(entry[0]); entry[1].fn();
  }
  return { controller, workers, events, timers, fire };
}
const terminal = s => s.events.filter(e => e.type === 'terminal').at(-1);
test('initialization rejects early work and readiness releases source URL', () => {
  const s = setup();
  assert.equal(s.controller.phase, 'loading');
  assert.throws(() => s.controller.start('12'));
  s.workers[0].deliver(ready);
  assert.equal(s.controller.phase, 'ready');
  assert.equal(s.timers.size, 0);
  assert.equal(s.workers[0].released, 1);
  s.controller.dispose();
});
test('one job binds a result to submitted input and options', () => {
  const s = setup(); s.workers[0].deliver(ready);
  const options = { seed: 7 };
  const jobId = s.controller.start('1.2e1', options); options.seed = 9;
  assert.throws(() => s.controller.start('13'));
  assert.equal(s.workers[0].sent[0].input, '12');
  assert.equal(s.workers[0].sent[0].options.seed, 7);
  s.workers[0].deliver({ protocolVersion: 1, type: 'result', jobId,
    result: factorInteger(12n, { seed: 7 }) });
  assert.equal(terminal(s).submittedInput, '1.2e1');
  assert.equal(terminal(s).result.status, 'complete');
  assert.equal(s.controller.phase, 'ready');
  assert.equal(s.timers.size, 0);
  s.controller.dispose();
});
test('cancel terminates immediately, retains verified factors and ignores old generation', () => {
  const s = setup(); const old = s.workers[0]; old.deliver(ready);
  const jobId = s.controller.start('6000018');
  old.deliver({ protocolVersion: 1, type: 'progress', jobId, snapshot: {
    input: '6000018', factors: [{ value: '2', certainty: 'proven', method: 'small-prime' }],
    remaining: '3000009', operations: 10, elapsedMs: 100 } });
  const late = old.onmessage;
  assert.equal(s.controller.cancel(), true);
  assert.equal(old.terminated, true);
  assert.equal(terminal(s).result.status, 'cancelled');
  assert.equal(terminal(s).result.remaining, '3000009');
  terminal(s).result.factors.length = 0;
  const count = s.events.length;
  late({ data: { protocolVersion: 1, type: 'result', jobId, result: factorInteger(6000018n) } });
  assert.equal(s.events.length, count);
  assert.equal(s.controller.phase, 'loading');
  s.workers[1].deliver(ready);
  const nextId = s.controller.start('13');
  assert.notEqual(nextId, jobId);
  s.workers[1].deliver({ protocolVersion: 1, type: 'result', jobId: nextId, result: factorInteger(13n) });
  assert.equal(terminal(s).result.input, '13');
  s.controller.dispose();
});
test('host deadline kills a worker even without cooperative messages', () => {
  const s = setup(); s.workers[0].deliver(ready);
  s.controller.start('1000000016000000063', { timeBudgetMs: 10 });
  s.fire(110);
  assert.equal(s.workers[0].terminated, true);
  assert.equal(terminal(s).result.reason, 'host-timeout');
  assert.equal(terminal(s).result.remaining, '1000000016000000063');
  assert.equal(s.controller.phase, 'loading');
  s.controller.dispose();
});
test('dispose stops active work, clears timers and prevents restart', () => {
  const s = setup(); s.workers[0].deliver(ready); s.controller.start('12');
  const late = s.workers[0].onmessage;
  s.controller.dispose();
  assert.equal(s.controller.phase, 'disposed');
  assert.equal(s.workers.length, 1);
  assert.equal(s.timers.size, 0);
  assert.equal(terminal(s).result.reason, 'disposed');
  assert.throws(() => s.controller.start('12'));
  assert.throws(() => s.controller.restart());
  const count = s.events.length; late({ data: ready }); assert.equal(s.events.length, count);
});
test('stale job responses are ignored on a reused worker', () => {
  const s = setup(); const w = s.workers[0]; w.deliver(ready);
  const first = s.controller.start('12');
  w.deliver({ protocolVersion: 1, type: 'result', jobId: first, result: factorInteger(12n) });
  const second = s.controller.start('13');
  w.deliver({ protocolVersion: 99, type: 'result', jobId: first, result: {} });
  assert.equal(s.controller.phase, 'running');
  w.deliver({ protocolVersion: 1, type: 'result', jobId: second, result: factorInteger(13n) });
  assert.equal(terminal(s).result.input, '13');
  s.controller.dispose();
});
test('wrong product, version, seed and regressing work counts are fatal for current job', () => {
  for (const mode of ['product', 'version', 'seed', 'regress']) {
    const s = setup(); const w = s.workers[0]; w.deliver(ready);
    const jobId = s.controller.start('12');
    const result = factorInteger(12n);
    if (mode === 'product') result.remaining = '2';
    if (mode === 'seed') result.seed = 2;
    if (mode === 'regress') {
      w.deliver({ protocolVersion: 1, type: 'progress', jobId, snapshot: {
        input: '12', factors: [], remaining: '12', operations: 100, elapsedMs: 1 } });
    }
    w.deliver({ protocolVersion: mode === 'version' ? 2 : 1, type: 'result', jobId, result });
    assert.equal(s.controller.phase, 'error', mode);
    assert.equal(w.terminated, true);
    assert.equal(s.events.at(-1).type, 'error');
    s.controller.dispose();
  }
});
test('load timeout, worker error, messageerror and post failure clean up and can restart', () => {
  for (const mode of ['load', 'error', 'messageerror', 'post']) {
    const s = setup(); const w = s.workers[0];
    if (mode === 'load') s.fire(5000);
    else {
      w.deliver(ready);
      if (mode === 'post') w.throwPost = true;
      s.controller.start('12');
      if (mode === 'error') w.onerror?.({ preventDefault() {} });
      if (mode === 'messageerror') w.onmessageerror?.({});
    }
    assert.equal(s.controller.phase, 'error', mode);
    assert.equal(w.terminated, true);
    assert.equal(s.timers.size, 0);
    s.controller.restart(); s.workers[1].deliver(ready);
    assert.equal(s.controller.phase, 'ready');
    s.controller.dispose();
  }
});
test('bundled worker URL is released on normal ownership cleanup or construction failure', () => {
  const revoked = [];
  const URLApi = { createObjectURL(blob) { assert.ok(blob instanceof Blob); return 'blob:fixed'; },
    revokeObjectURL(url) { revoked.push(url); } };
  class FakeWorker { constructor(url, options) { assert.equal(url, 'blob:fixed'); assert.equal(options.type, 'module'); } }
  const w = makeBundledWorker({ WorkerCtor: FakeWorker, URLApi });
  w.releaseSource(); w.releaseSource();
  assert.deepEqual(revoked, ['blob:fixed']);
  assert.throws(() => makeBundledWorker({ WorkerCtor: class { constructor() { throw Error('no'); } }, URLApi }));
  assert.deepEqual(revoked, ['blob:fixed', 'blob:fixed']);
});
