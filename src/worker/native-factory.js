import { WORKER_SOURCE } from './native-worker-source.js';
import { makeWorkerFromSource } from './source-factory.js';
export function makeNativeWorker(dependencies) {
  return makeWorkerFromSource(WORKER_SOURCE,dependencies);
}
