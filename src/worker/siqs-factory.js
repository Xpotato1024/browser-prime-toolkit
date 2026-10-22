import { WORKER_SOURCE } from './siqs-worker-source.js';
import { makeWorkerFromSource } from './source-factory.js';

export function makeSiqsWorker(dependencies) {
  return makeWorkerFromSource(WORKER_SOURCE, dependencies);
}
