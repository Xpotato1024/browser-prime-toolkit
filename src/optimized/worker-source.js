// SPDX-License-Identifier: AGPL-3.0-only
import{builtinWorkerSource}from'../graph-builtin/worker-source.js';import{workerSourceForCap}from'../resources/worker-sources.js';import{RUSQSIEVE_BASE64 as lowcap}from'./wasm-optimized-128.js';
export function optimizedWorkerSource(cap){if(cap!==128)return builtinWorkerSource(cap,'builtin');const s=workerSourceForCap(128),p=/const RUSQSIEVE_BASE64="[^"]+";/g;if([...s.matchAll(p)].length!==1)throw Error('Optimized lowcap artifact anchor');return s.replace(p,()=> 'const RUSQSIEVE_BASE64='+JSON.stringify(lowcap)+';');}
