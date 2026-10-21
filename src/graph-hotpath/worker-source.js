// SPDX-License-Identifier: AGPL-3.0-only
import{varintWorkerSource}from'../graph-varint/worker-source.js';
import{RUSQSIEVE_BASE64 as skip64}from'./wasm-skip-64.js';
import{RUSQSIEVE_BASE64 as skip256}from'./wasm-skip-256.js';
import{RUSQSIEVE_BASE64 as block64}from'./wasm-block16-64.js';
import{RUSQSIEVE_BASE64 as block256}from'./wasm-block16-256.js';
export function hotpathWorkerSource(cap,variant){if(![64,256].includes(cap)||!['baseline','skip','block16'].includes(variant))throw Error('Named hotpath role/variant');const s=varintWorkerSource(cap,'varint');if(variant==='baseline')return s;const b=variant==='skip'?(cap===64?skip64:skip256):(cap===64?block64:block256),p=/const RUSQSIEVE_BASE64="[^"]+";/g;if([...s.matchAll(p)].length!==1)throw Error('Hotpath role artifact anchor');return s.replace(p,()=> 'const RUSQSIEVE_BASE64='+JSON.stringify(b)+';');}
