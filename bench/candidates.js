import { WORKER_SOURCE } from '../src/worker/candidate-worker-source.js';
import { makeCandidateWorker } from '../src/worker/candidate-factory.js';
import { installHarness } from './harness-common.js';
installHarness(makeCandidateWorker, WORKER_SOURCE, 67108864);
