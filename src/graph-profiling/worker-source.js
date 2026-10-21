// SPDX-License-Identifier: AGPL-3.0-only
import{graphWorkerSource}from'../graph-profile/worker-source.js';
import{RUSQSIEVE_BASE64 as names}from'./wasm-names.js';
export function profilingWorkerSource(cap,variant){
 if(variant!=='names'||cap!==256)throw Error('Single coordinator diagnostic only');
 const s=graphWorkerSource(cap,'compact'),pattern=/const RUSQSIEVE_BASE64="[^"]+";/g;
 if([...s.matchAll(pattern)].length!==1)throw Error('Names artifact anchor');
 return s.replace(pattern,()=> 'const RUSQSIEVE_BASE64='+JSON.stringify(names)+';');
}
