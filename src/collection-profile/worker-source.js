// SPDX-License-Identifier: AGPL-3.0-only
import {wideWorkerSource} from '../wide-window/worker-source.js';
import {RUSQSIEVE_BASE64} from './wasm-phase-1024.js';
import {RUSQSIEVE_BASE64 as RESIEVE4} from '../collection-hotpath/wasm-resieve4-1024.js';
import {RUSQSIEVE_BASE64 as SPARSE} from '../collection-hotpath/wasm-sparse-1024.js';
const rep=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Collection Worker anchor '+a.slice(0,90));return s.replace(a,b);};
export function collectionWorkerSource(cap,variant){
 if(cap!==1024||!['baseline','instrumented','resieve4','sparse'].includes(variant))throw Error('Named one-owner diagnostic role');
 let s=wideWorkerSource(1024);
 if(['resieve4','sparse'].includes(variant)){
  const re=/const RUSQSIEVE_BASE64="[^"]+";/g;if([...s.matchAll(re)].length!==1)throw Error('One candidate artifact');
  s=s.replace(re,()=> 'const RUSQSIEVE_BASE64='+JSON.stringify(variant==='resieve4'?RESIEVE4:SPARSE)+';');
 }
 if(variant==='instrumented'){
  const re=/const RUSQSIEVE_BASE64="[^"]+";/g;if([...s.matchAll(re)].length!==1)throw Error('One artifact');
  s=s.replace(re,()=> 'const RUSQSIEVE_BASE64='+JSON.stringify(RUSQSIEVE_BASE64)+';');
  s=rep(s,"if(WebAssembly.Module.imports(module).length)throw Error('Unexpected WASM imports');","const imports=WebAssembly.Module.imports(module);if(imports.length!==1||imports[0].module!=='codex_collection'||imports[0].name!=='now_ms'||imports[0].kind!=='function')throw Error('Unexpected diagnostic WASM imports');");
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
  if(++collectionSequence>2048)throw Error('Diagnostic frame cap');
  const instrumented=typeof collectionApi.codex_collection_field==='function';
  const status=instrumented?Array.from({length:6},(_,i)=>collectionApi.codex_collection_status(i)):null;
  if(status&&(status[0]!==0||status[1]!==0||status[2]>2000000||status.some(v=>!Number.isFinite(v)||v<0)))throw Error('Diagnostic clock/scope failure');
  collectionPort.postMessage({version:1,sequence:collectionSequence,type:message.type,instrumented,
   rows:instrumented?Array.from({length:16},(_,i)=>Array.from({length:3},(_,j)=>collectionApi.codex_collection_field(i,j))):null,
   status});
 }
 postMessage(message,transfer);
}
`;
 return prefix+s;
}
