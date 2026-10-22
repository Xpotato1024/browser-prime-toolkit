// SPDX-License-Identifier: AGPL-3.0-only
import{builtinWorkerSource}from'../graph-builtin/worker-source.js';
import{workerSourceForCap}from'../resources/worker-sources.js';
import{RUSQSIEVE_BASE64 as base128}from'../optimized/wasm-optimized-128.js';
import{RUSQSIEVE_BASE64 as s128}from'./wasm-varint-128.js';
import{RUSQSIEVE_BASE64 as s256}from'./wasm-varint-256.js';
const swap=(s,artifact)=>{const p=/const RUSQSIEVE_BASE64="[^"]+";/g;if([...s.matchAll(p)].length!==1)throw Error('Varint role artifact anchor');return s.replace(p,()=> 'const RUSQSIEVE_BASE64='+JSON.stringify(artifact)+';');};
export function varintWorkerSource(cap,variant){if(![64,128,256].includes(cap)||!['baseline','varint'].includes(variant))throw Error('Named varint role/variant');const s=cap===128?swap(workerSourceForCap(128),base128):builtinWorkerSource(cap,'builtin');return variant==='baseline'||cap===64?s:swap(s,cap===128?s128:s256);}
