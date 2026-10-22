import { WORKER_SOURCE } from './worker-source.js';
import { makeWorkerFromSource } from './source-factory.js';

export function makeBundledWorker(dependencies) {
  return makeWorkerFromSource(WORKER_SOURCE, dependencies);
}
