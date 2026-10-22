import { WORKER_SOURCE } from './candidate-worker-source.js';
import { makeWorkerFromSource } from './source-factory.js';

export function makeCandidateWorker(dependencies) {
  return makeWorkerFromSource(WORKER_SOURCE, dependencies);
}
