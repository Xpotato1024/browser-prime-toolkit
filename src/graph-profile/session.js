// SPDX-License-Identifier: AGPL-3.0-only
import {validateInput,validatePacket,factorPacket} from '../rusqsieve/contracts.js';
export const GRAPH_FIELDS=Object.freeze(['retainedStructBytes','treeEdges','treeCapacity','powerLength','powerCapacity','rootEncodedBytes','parentBytes','edgeBytes','sizeBytes','mapLength','mapCapacity','mapEntryLowerBound','columnStructBytes','columnPowerBytes','columnExtraBytes','seenALowerBound','bufferedFamilies','pathCapacityBytes']);
export async function graphApi(base64){
 const b=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
 const {instance}=await WebAssembly.instantiate(b,{});
 const api=instance.exports;
 if(api.qs_abi_version()!==6||api.codex_graph_roundtrip()!==1)throw Error('Graph ABI/roundtrip');
 return api;
}
export class GraphSession{
 constructor(api,input){
  validateInput(input);this.api=api;this.input=input;this.closed=false;this.next=0;
  this.session=this.withBytes(new TextEncoder().encode(input),(p,n)=>api.codex_dlp_new(p,n,0));
  if(!this.session)throw Error('Graph preparation failed');
  this.context=api.codex_coord_worker(this.session);if(!this.context)throw Error('Graph context failed');
  this.target=api.qs_coord_target(this.session);this.factorBase=api.codex_coord_fb_len(this.session);
 }
 withBytes(b,fn){const a=this.api,p=a.qs_alloc(b.length,1);if(!p)throw Error('Allocation refused');try{new Uint8Array(a.memory.buffer,p,b.length).set(b);return fn(p,b.length);}finally{a.qs_dealloc(p,b.length,1);}}
 take(h){if(!h)throw Error('Missing native buffer');const a=this.api,p=a.qs_buffer_pointer(h),n=a.qs_buffer_length(h);try{if(n<12||n>16777228||p+n>a.memory.buffer.byteLength)throw Error('Native buffer bounds');return new Uint8Array(a.memory.buffer.slice(p,p+n));}finally{a.qs_buffer_free(h);}}
 packet(first){if(this.closed||!Number.isInteger(first)||first<0||first>=750000)throw Error('Bounded family required');return this.take(this.api.qs_worker_sieve(this.context,first,1));}
 submit(bytes){if(this.closed)throw Error('Closed graph');validatePacket(bytes,{first:this.next,count:1,target:this.factorBase});const n=this.withBytes(bytes.subarray(12),(p,len)=>this.api.qs_coord_submit(this.session,p,len));this.next++;return n;}
 profile(){const b=this.take(this.api.codex_graph_profile(this.session));if(b.length!==12+8*GRAPH_FIELDS.length)throw Error('Graph snapshot width');const v=new DataView(b.buffer);return Object.fromEntries(GRAPH_FIELDS.map((k,i)=>[k,Number(v.getBigUint64(12+8*i,true))]));}
 columns(){return this.take(this.api.codex_graph_columns(this.session));}
 memory(){const a=this.api;return{linear:a.memory.buffer.byteLength,live:a.codex_mem_live(),peak:a.codex_mem_peak(),failures:a.codex_mem_failures()};}
 counters(){return Array.from({length:8},(_,i)=>Number(this.api.codex_dlp_stat(this.session,i)));}
 extract(){const a=this.api,h=a.qs_coord_extract(this.session),status=a.codex_extract_status();return{status,divisor:h?factorPacket(this.take(h),this.input):null,phases:Array.from({length:16},(_,i)=>Array.from({length:4},(_,j)=>a.codex_graph_phase(i,j))).filter(r=>r[0])};}
 close(){if(!this.closed){this.api.qs_worker_free(this.context);this.api.qs_coord_free(this.session);this.closed=true;}}
}
