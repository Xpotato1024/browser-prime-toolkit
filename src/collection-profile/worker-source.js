// SPDX-License-Identifier: AGPL-3.0-only
import {wideWorkerSource} from '../wide-window/worker-source.js';
import {RUSQSIEVE_BASE64} from './wasm-phase-1024.js';
const rep=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Collection Worker anchor '+a.slice(0,90));return s.replace(a,b);};
export function collectionWorkerSource(cap,variant){
 if(cap!==1024||!['baseline','instrumented'].includes(variant))throw Error('Named one-owner diagnostic role');
 let s=wideWorkerSource(1024);
 if(variant==='instrumented'){
  const re=/const RUSQSIEVE_BASE64="[^"]+";/g;if([...s.matchAll(re)].length!==1)throw Error('One artifact');
  s=s.replace(re,()=> 'const RUSQSIEVE_BASE64='+JSON.stringify(RUSQSIEVE_BASE64)+';');
  s=rep(s,'WebAssembly.instantiate(bytes,{})','WebAssembly.instantiate(bytes,{codex_collection:{now_ms:()=>performance.now()}})');
 }
 s=rep(s,'api=instance.instance.exports;bytes=null;','api=instance.instance.exports;collectionApi=api;bytes=null;');
 s=rep(s,'const send=(type,data={},transfer=[])=>postMessage(','const send=(type,data={},transfer=[])=>collectionSend(');
 const prefix=`// Fixed diagnostic side port; normal version/generation protocol is untouched.
let collectionApi=null,collectionPort=null,collectionSequence=0;
addEventListener('message',e=>{
 if(e.data?.type!=='codex-collection-port-v1')return;
 e.stopImmediatePropagation();
 if(collectionPort||Object.keys(e.data).length!==1||e.ports.length!==1)throw Error('One diagnostic port');
 collectionPort=e.ports[0];collectionPort.start();
},{capture:true});
function collectionSend(message,transfer){
 // Never call into a trapped instance while forwarding fatal/oom evidence.
 if(collectionPort&&collectionApi&&['ready','batch','submitted','released','extracted'].includes(message.type)){
  if(++collectionSequence>128)throw Error('Diagnostic frame cap');
  const instrumented=typeof collectionApi.codex_collection_field==='function';
  collectionPort.postMessage({version:1,sequence:collectionSequence,type:message.type,instrumented,
   rows:instrumented?Array.from({length:16},(_,i)=>Array.from({length:3},(_,j)=>collectionApi.codex_collection_field(i,j))):null,
   status:instrumented?Array.from({length:6},(_,i)=>collectionApi.codex_collection_status(i)):null});
 }
 postMessage(message,transfer);
}
`;
 return prefix+s;
}
