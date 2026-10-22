import { FactorWorkerController } from '../src/worker/controller.js';
import { parseIntegerInput } from '../src/core/integer-input.js';
import { normalizeOptions } from '../src/engine/options.js';
import { verifyFactorResult, verifySnapshot } from '../src/engine/result.js';

// Measurement-only independent Rho lanes. No product UI or automatic parallelism.
export async function runPortfolio(text, options = {}, count = 1, {
  createController = configuration => new FactorWorkerController(configuration),
  memoryPerWorkerBytes = null,
} = {}) {
  if (![1, 2, 4].includes(count)) throw new RangeError('Worker count');
  const config = normalizeOptions(options), input = parseIntegerInput(text).canonical;
  if (!['brent', 'gmp-brent', 'gmp-ecm'].includes(config.algorithm)) throw new RangeError('Only independent Rho or ECM trials');
  const laneMemory = memoryPerWorkerBytes ?? (config.algorithm === 'brent' ? 16777216 : 67108864);
  if (![16777216, 67108864].includes(laneMemory) || count * laneMemory > 134217728) {
    throw new RangeError('Portfolio linear memory limit: 128 MiB');
  }
  const controllers = [], snapshots = [], results = [];
  const coldStarted = performance.now();
  let timer, closed = false, accept, reject, started;
  const terminal = new Promise((resolve, fail) => { accept = resolve; reject = fail; });
  terminal.catch(() => {}); // Initialization failures may precede the terminal await.
  const stop = () => { closed = true; clearTimeout(timer); for (const c of controllers) c.dispose(); };
  const unresolved = () => {
    const snapshot = snapshots.filter(Boolean).sort((a, b) =>
      BigInt(a.remaining) < BigInt(b.remaining) ? -1 : BigInt(a.remaining) > BigInt(b.remaining) ? 1 : 0)[0] ??
      { input, factors: [], remaining: input, operations: 0, elapsedMs: performance.now() - started };
    return { ...snapshot, algorithm: config.algorithm, seed: config.seed, status: 'incomplete', reason: 'host-timeout',
      primality: snapshot.factors.length ? 'composite' : 'unknown' };
  };
  try {
    for (let lane = 0; lane < count; lane++) {
      const controller = createController({ onEvent(event) {
        if (closed) return;
        try {
          if (event.type === 'error') throw Error('Portfolio worker failed');
          if (event.type === 'progress') snapshots[lane] = verifySnapshot(event.snapshot, input);
          if (event.type !== 'terminal') return;
          if (event.result.algorithm !== config.algorithm || event.result.seed !== ((config.seed - 1 + lane) % 4294967295) + 1) {
            throw Error('Portfolio lane identity');
          }
          if (event.result.status === 'incomplete' && event.result.reason === 'host-timeout') {
            if (!['unknown', 'composite'].includes(event.result.primality)) throw Error('Host certainty');
            results[lane] = { ...event.result, ...verifySnapshot(event.result, input) };
          } else results[lane] = verifyFactorResult(event.result, input);
          snapshots[lane] = verifySnapshot(event.result, input);
          if (['complete', 'probable', 'neither'].includes(event.result.status)) {
            const winner = { ...event.result, winningLane: lane };
            stop(); accept(winner);
          } else if (results.filter(Boolean).length === count) {
            const last = { ...event.result };
            stop(); accept(last);
          }
        } catch (error) { stop(); reject(error); }
      } });
      controllers.push(controller);
    }
    while (controllers.some(c => c.phase !== 'ready')) {
      if (controllers.some(c => c.phase === 'error') || performance.now() - coldStarted > 6000) throw Error('Pool initialization');
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    const initializationMs = performance.now() - coldStarted;
    started = performance.now();
    timer = setTimeout(() => { const partial = unresolved(); stop(); accept(partial); }, config.timeBudgetMs + 100);
    const laneOptions = controllers.map((c, lane) => ({ ...config,
      seed: ((config.seed - 1 + lane) % 4294967295) + 1,
      operationBudget: Math.floor(config.operationBudget / count) }));
    for (let lane = 0; lane < count && !closed; lane++) controllers[lane].start(input, laneOptions[lane]);
    const result = await terminal;
    return { ...result, wallMs: performance.now() - started, initializationMs, workers: count,
      laneSeeds: laneOptions.map(o => o.seed), ownedLinearMemoryBytes: count * laneMemory, allocatedOperationBudget: laneOptions.reduce((sum, o) => sum + o.operationBudget, 0),
      allLanesDisposed: controllers.every(c => c.phase === 'disposed') };
  } finally { stop(); }
}
