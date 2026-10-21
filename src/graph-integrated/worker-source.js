// SPDX-License-Identifier: AGPL-3.0-only
import{graphWorkerSource}from'../graph-profile/worker-source.js';import{optimizedWorkerSource}from'../optimized/worker-source.js';
export function integratedWorkerSource(cap,variant){if(!['legacy','optimized'].includes(variant))throw Error('Named integrated variant');return variant==='legacy'?graphWorkerSource(cap,'baseline'):optimizedWorkerSource(cap);}
