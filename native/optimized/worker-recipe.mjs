// SPDX-License-Identifier: AGPL-3.0-only
import{builtinWorkerSource}from'../../src/graph-builtin/worker-source.js';
import{workerSourceForCap}from'../../src/resources/worker-sources.js';
import{RUSQSIEVE_BASE64 as s128}from'../../src/graph-varint/wasm-varint-128.js';
import{RUSQSIEVE_BASE64 as s256}from'../../src/graph-varint/wasm-varint-256.js';
export function selectedWorkerSource(cap){if(![64,128,256].includes(cap))throw Error('Selected role cap');if(cap===64)return builtinWorkerSource(cap,'builtin');const s=cap===128?workerSourceForCap(128):builtinWorkerSource(cap,'builtin'),p=/const RUSQSIEVE_BASE64="[^"]+";/g;if([...s.matchAll(p)].length!==1)throw Error('Selected role artifact anchor');return s.replace(p,()=> 'const RUSQSIEVE_BASE64='+JSON.stringify(cap===128?s128:s256)+';');}
