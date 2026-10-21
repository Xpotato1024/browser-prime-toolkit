// SPDX-License-Identifier: AGPL-3.0-only
import {optimizedWorkerSource} from '../optimized/worker-source.js';
import {RUSQSIEVE_BASE64 as old128} from '../graph-varint/wasm-varint-128.js';
import {RUSQSIEVE_BASE64 as old256} from '../graph-varint/wasm-varint-256.js';
import {RUSQSIEVE_BASE64 as s128} from './wasm-lpmap-128.js';
import {RUSQSIEVE_BASE64 as s256} from './wasm-lpmap-256.js';
export function lpMapWorkerSource(cap,variant){
 if(![64,128,256].includes(cap)||!['baseline','lpmap'].includes(variant))throw Error('LP map experiment role');
 const source=optimizedWorkerSource(cap);
 if(cap===64)return source;
 const pattern=/const RUSQSIEVE_BASE64="[^"]+";/g;
 if([...source.matchAll(pattern)].length!==1)throw Error('LP map role artifact anchor');
 const bytes=variant==='baseline'?(cap===128?old128:old256):(cap===128?s128:s256);
 return source.replace(pattern,()=> 'const RUSQSIEVE_BASE64='+JSON.stringify(bytes)+';');
}
