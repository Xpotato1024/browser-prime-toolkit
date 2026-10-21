// SPDX-License-Identifier: AGPL-3.0-only
import{workerSourceForCap}from'../resources/worker-sources.js';
import{RUSQSIEVE_BASE64 as baseline}from'./wasm-baseline.js';
import{RUSQSIEVE_BASE64 as compact}from'./wasm-compact.js';
export function graphWorkerSource(cap,variant){
 if(!['baseline','compact'].includes(variant))throw Error('Named graph variant');
 let source=workerSourceForCap(cap);if(cap!==256)return source;
 const wasm=variant==='baseline'?baseline:compact;
 const pattern=/const RUSQSIEVE_BASE64="[^"]+";/g;
 if([...source.matchAll(pattern)].length!==1)throw Error('Frozen artifact anchor');
 source=source.replace(pattern,()=> 'const RUSQSIEVE_BASE64='+JSON.stringify(wasm)+';');
 const anchor='memory:memory(),...(role===';
 if(source.split(anchor).length!==2)throw Error('Graph snapshot anchor');
 source=source.replace(anchor,'...graphSnapshot(),memory:memory(),...(role===');
 source+='\nlet graphSequence=0;function graphSnapshot(){if(role!=="coord"||!session||graphSequence++%16!==0)return{};const b=take(api.codex_graph_profile(session)),v=new DataView(b.buffer);if(b.length!==156)throw Error("Graph snapshot width");return{graphProfile:Array.from({length:18},(_,i)=>Number(v.getBigUint64(12+8*i,true)))};}\n';
 const submitted="send('submitted',{jobId:d.jobId,relations,target,...snapshot()});";
 if(source.split(submitted).length!==2)throw Error('Graph columns anchor');
 source=source.replace(submitted,"let graphColumnSha=null;const graphStart=performance.now();if([4,16,32,64,128].includes(d.first+d.count)){const bytes=take(api.codex_graph_columns(session));graphColumnSha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');}send('submitted',{graphColumnSha,graphFamily:d.first+d.count,graphObserveMs:performance.now()-graphStart,jobId:d.jobId,relations,target,...snapshot()});");
 const extracted="send('extracted',{status,";
 if(source.split(extracted).length!==2)throw Error('Graph extraction anchor');
 return source.replace(extracted,"send('extracted',{graphPhases:Array.from({length:16},(_,i)=>Array.from({length:4},(_,j)=>api.codex_graph_phase(i,j))).filter(r=>r[0]),status,");
}
