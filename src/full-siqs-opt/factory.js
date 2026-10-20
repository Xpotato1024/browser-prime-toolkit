import {BASE_FULL_WORKER_SOURCE,TUNED_FULL_WORKER_SOURCE} from './worker-source.js';
import {makeWorkerFromSource} from '../worker/source-factory.js';
export function makeRsaWorker({engine='lto'}={}){if(!['base','lto'].includes(engine))throw Error('Full engine');return makeWorkerFromSource(engine==='base'?BASE_FULL_WORKER_SOURCE:TUNED_FULL_WORKER_SOURCE);}
