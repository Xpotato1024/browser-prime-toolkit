// SPDX-License-Identifier: AGPL-3.0-only
import{graphWorkerSource}from'../graph-profile/worker-source.js';
import{RUSQSIEVE_BASE64 as release}from'./wasm-release.js';
export function graphReleaseWorkerSource(cap,variant){
 if(!['baseline','release'].includes(variant))throw Error('Named extraction variant');
 const source=graphWorkerSource(cap,'compact');
 if(cap!==256||variant==='baseline')return source;
 const pattern=/const RUSQSIEVE_BASE64="[^"]+";/g;
 if([...source.matchAll(pattern)].length!==1)throw Error('Release artifact anchor');
 return source.replace(pattern,()=> 'const RUSQSIEVE_BASE64='+JSON.stringify(release)+';');
}
