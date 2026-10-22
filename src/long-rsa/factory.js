import {RSA_WORKER_SOURCE} from './worker-source.js';
import {makeWorkerFromSource} from '../worker/source-factory.js';
export function makeRsaWorker(){return makeWorkerFromSource(RSA_WORKER_SOURCE);}
