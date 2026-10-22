// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {graphApi} from '../src/graph-profile/session.js';
import {StreamingPacketAudit} from '../src/graph-multicore/packet-audit.js';
import {validatePacket} from '../src/rusqsieve/contracts.js';
import {resourceMemoryContract} from '../native/resources/memory-contract.mjs';
import {RUSQSIEVE_BASE64 as baseline} from '../src/graph-builtin/wasm-builtin-64.js';
import {RUSQSIEVE_BASE64 as selected} from '../src/selected-wide/wasm-selected-64.js';
import {captureSourceGuard,checkSourceGuard} from './source-guard.mjs';
import {createHash} from 'node:crypto';
const output=process.argv[2];assert.ok(output);assert.equal(process.version,'v'+readFileSync(new URL('../.node-version',import.meta.url),'utf8').trim());
const guard=captureSourceGuard(process.cwd()),started=performance.now(),rows=[];
const reference=JSON.parse(gunzipSync(Buffer.from(readFileSync('docs/benchmarks/staged-wide-window-stage38/completed/wide-1024.json.gz.base64','utf8').replaceAll('\n',''),'base64'),{maxOutputLength:16777216})).records[0];
const input=reference.input,sha=b=>createHash('sha256').update(b).digest('hex');
for(const [variant,base64] of Object.entries({baseline,selected})){
 assert.ok(performance.now()-started<240000);
 const bytes=Buffer.from(base64,'base64');resourceMemoryContract(bytes,64);
 const api=await graphApi(base64),text=new TextEncoder().encode(input),p=api.qs_alloc(text.length,1);assert.ok(p);
 let context=0,trapped=false,closed=false;
 try{
  new Uint8Array(api.memory.buffer,p,text.length).set(text);
  context=api.codex_dlp_prepare(p,text.length,0);assert.ok(context);
  const began=performance.now(),audit=new StreamingPacketAudit(true),packets=[],target=Number(api.codex_dlp_worker_config(context,7));
  assert.equal(target,reference.outcome.factorBaseSize);
  for(let family=0;family<4;family++){
   assert.ok(performance.now()-began<90000);
   const h=api.qs_worker_sieve(context,family,1);assert.ok(h);
   let packet;
   try{const ptr=api.qs_buffer_pointer(h),len=api.qs_buffer_length(h);assert.ok(len>=12&&len<=8388608&&ptr+len<=api.memory.buffer.byteLength);packet=new Uint8Array(api.memory.buffer.slice(ptr,ptr+len));}finally{api.qs_buffer_free(h);}
   const facts=validatePacket(packet,{first:family,count:1,target});
   packets.push({family,bytes:packet.length,sha256:sha(packet),facts});audit.add({first:family,count:1},packet);await audit.flush();
  }
  const digests=(await audit.finish()).families;
  assert.deepEqual(digests,reference.familyDigests.slice(0,4).map(({acknowledged,...r})=>r));
  const memory={linearBytes:api.memory.buffer.byteLength,liveRequested:api.codex_mem_live(),peakRequested:api.codex_mem_peak(),allocationFailures:api.codex_mem_failures()};
  assert.ok(memory.linearBytes<=64*1048576);assert.equal(memory.allocationFailures,0);
  api.qs_worker_free(context);context=0;closed=true;
  rows.push({variant,artifactSha256:sha(bytes),input,packets,digests,memory,closed,knownFactorsUsed:false});
 }catch(error){trapped=error instanceof WebAssembly.RuntimeError;throw error;}
 finally{if(!trapped){if(context)api.qs_worker_free(context);api.qs_dealloc(p,text.length,1);}}
}
assert.deepEqual(rows[0].packets,rows[1].packets);checkSourceGuard(guard);
writeFileSync(output,JSON.stringify({kind:'64MiB producer-only four-family equality; not speed measurement',measuredHead:guard.head,nodeVersion:process.version,sourceGuard:{version:guard.version,files:guard.files,treeSha256:guard.treeSha256},rows},null,2)+'\n',{flag:'wx'});
console.log('Old/selected64: all four RSA100 packet bytes/digests/counters agree with Stage38; zero allocation failures, both contexts freed');
