// SPDX-License-Identifier: AGPL-3.0-only
import{graphReleaseWorkerSource}from'../graph-release/worker-source.js';
export function fullWorkerSource(cap,variant){
 let s=graphReleaseWorkerSource(cap,variant);if(cap!==256)return s;
 const a='const snap=snapshot(),handle=';
 if(s.split(a).length!==2)throw Error('Final column hash anchor');
 s=s.replace(a,"const graphFinalBytes=take(api.codex_graph_columns(session)),graphFinalSha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',graphFinalBytes)),n=>n.toString(16).padStart(2,'0')).join('');const snap=snapshot(),handle=");
 const b="send('extracted',{graphPhases:";
 if(s.split(b).length!==2)throw Error('Final column result anchor');
 return s.replace(b,"send('extracted',{graphColumnSha:graphFinalSha,graphFamily:graphPrefix,graphObserveMs:null,graphPhases:");
}
