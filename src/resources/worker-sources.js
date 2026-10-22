// SPDX-License-Identifier: AGPL-3.0-only
import {RUS_WORKER_SOURCE as s64} from './worker-64.js';
import {RUS_WORKER_SOURCE as s128} from './worker-128.js';
import {RUS_WORKER_SOURCE as s256} from './worker-256.js';
export function workerSourceForCap(cap){
 if(![64,128,256].includes(cap))throw Error('Named Worker artifact required');
 return cap===64?s64:cap===128?s128:s256;
}
