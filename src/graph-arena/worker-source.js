// SPDX-License-Identifier: AGPL-3.0-only
import{graphReleaseWorkerSource}from'../graph-release/worker-source.js';
import{RUSQSIEVE_BASE64 as packed}from'./wasm-packed.js';
export function packedWorkerSource(cap,variant){
 if(!['baseline','packed'].includes(variant))throw Error('Named packed variant');
 let source=graphReleaseWorkerSource(cap,'release');
 if(cap!==256||variant==='baseline')return source;
 const pattern=/const RUSQSIEVE_BASE64="[^"]+";/g;
 if([...source.matchAll(pattern)].length!==1)throw Error('Packed artifact anchor');
 source=source.replace(pattern,()=> 'const RUSQSIEVE_BASE64='+JSON.stringify(packed)+';');
 for(const[a,b]of [['if(b.length!==156)','if(b.length!==164)'],['graphProfile:Array.from({length:18}','graphProfile:Array.from({length:19}']]){
  if(source.split(a).length!==2)throw Error('Packed schema anchor');source=source.replace(a,b);
 }
 return source;
}
