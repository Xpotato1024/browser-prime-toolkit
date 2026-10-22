import { runPortfolio } from './portfolio.js';
import { FactorWorkerController } from '../src/worker/controller.js';
import { makeWorkerFromSource } from '../src/worker/source-factory.js';

export function installHarness(createWorker, WORKER_SOURCE, memoryPerWorkerBytes = 16777216) {
  let resolveJob, rejectJob, progressCount = 0, owner = null;
  const violations = [], rejections = [], errors = [];
  addEventListener('securitypolicyviolation', event => violations.push({
    directive: event.violatedDirective, blocked: event.blockedURI }));
  addEventListener('unhandledrejection', event => rejections.push(String(event.reason)));
  function createPrimary() {
    return new FactorWorkerController({ createWorker, onEvent(event) {
      if (event.type === 'error') errors.push(event);
      if (event.type === 'progress') progressCount++;
      if (event.type === 'terminal' && resolveJob) {
        const resolve = resolveJob; resolveJob = rejectJob = null; resolve(event);
      }
      if (event.type === 'error' && rejectJob) {
        const reject = rejectJob; resolveJob = rejectJob = null; reject(Error(event.code));
      }
    } });
  }
  let controller = createPrimary();
  const take = kind => { if (owner) throw Error('Concurrent harness job'); owner = kind; };
  async function ready() {
    const started = performance.now();
    while (controller.phase !== 'ready') {
      if (controller.phase === 'error' || performance.now() - started > 6000) throw Error('Worker not ready');
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  }
  async function runOwned(input, options = {}) {
    await ready();
    progressCount = 0;
    const started = performance.now();
    const event = await new Promise((resolve, reject) => {
      resolveJob = resolve; rejectJob = reject;
      try { controller.start(input, options); }
      catch (error) { resolveJob = rejectJob = null; reject(error); }
    });
    return { ...event.result, wallMs: performance.now() - started, progressCount };
  }
  async function run(input, options = {}) {
    take('run');
    try { return await runOwned(input, options); }
    finally { owner = null; }
  }
  async function cancelRun(input, algorithm = 'brent', delayMs = 30) {
    take('cancel');
    let ticker, heartbeat = 0;
    try {
      await ready();
      ticker = setInterval(() => heartbeat++, 5);
      const pending = runOwned(input, { algorithm, timeBudgetMs: 10000, operationBudget: 50000000 });
      pending.catch(() => {}); // Preserve the original rejection after the deliberate delay.
      await new Promise(resolve => setTimeout(resolve, delayMs));
      const started = performance.now(), cancelled = controller.cancel();
      const result = await pending, cancelMs = performance.now() - started;
      await ready();
      return { result, cancelled, cancelMs, heartbeat };
    } finally { clearInterval(ticker); owner = null; }
  }
  async function poolRun(text, options, count) {
    take('pool');
    let result, recoveryMs, primaryDisposed = false;
    try {
      await ready();
      controller.dispose(); primaryDisposed = controller.phase === 'disposed';
      result = await runPortfolio(text, options, count, {
        memoryPerWorkerBytes,
        createController: configuration => new FactorWorkerController({ ...configuration, createWorker }),
      });
    } finally {
      try {
        if (primaryDisposed) {
          const started = performance.now();
          controller = createPrimary(); await ready();
          recoveryMs = performance.now() - started;
        }
      } finally { owner = null; }
    }
    return { ...result, idleControllerDisposedDuringPool: primaryDisposed, idleRecoveryMs: recoveryMs };
  }
  function verifyCspAudit() {
    take('audit');
    return new Promise((resolve, reject) => {
      const suffix = '\nfetch(' + JSON.stringify(location.origin + '/blocked-worker-probe') + ').catch(()=>{});';
      const worker = makeWorkerFromSource(WORKER_SOURCE + suffix);
      const cleanup = () => { clearTimeout(timer); worker.releaseSource(); worker.terminate(); };
      const timer = setTimeout(() => { cleanup(); reject(Error('Worker CSP audit missing')); }, 2000);
      worker.onmessage = event => { if (event.data.type === 'audit-csp') { cleanup(); resolve(true); } };
      worker.onerror = event => { cleanup(); reject(Error(event.message)); };
    }).finally(() => { owner = null; });
  }
  globalThis.factorHarness = { get controller() { return controller; },
    ready, run, poolRun, cancelRun, verifyCspAudit, violations, rejections, errors };
}
