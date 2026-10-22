// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RUSQSIEVE_BASE64} from '../src/rusqsieve-dlp/wasm-bytes.js';
import {validatePacket} from '../src/rusqsieve/contracts.js';
import {DLP_STAT_KEYS,validateDlpConfiguration,validateDlpStats} from '../src/rusqsieve-dlp/contracts.js';
const {instance:{exports:api}}=await WebAssembly.instantiate(Buffer.from(RUSQSIEVE_BASE64,'base64'),{});
const rsa=JSON.parse(readFileSync(new URL('../bench/staged-rsa/catalog.json',import.meta.url))).find(c=>c.id==='RSA-100').input;
function bytesCall(bytes,fn){const p=api.qs_alloc(bytes.length,1);assert.ok(p);try{new Uint8Array(api.memory.buffer,p,bytes.length).set(bytes);return fn(p,bytes.length);}finally{api.qs_dealloc(p,bytes.length,1);}}
const inputCall=(n,fn)=>bytesCall(new TextEncoder().encode(n),fn);
function config(handle,profile,worker=false){const query=worker?api.codex_dlp_worker_config:api.codex_dlp_coord_config,v=Array.from({length:8},(_,i)=>query(handle,i));return{version:api.codex_dlp_version(),profile,bits:Number(v[0]),factorBaseBound:Number(v[1]),intervalHalfWidth:Number(v[2]),singleLimit:v[3].toString(),doubleLimit:v[4].toString(),lpBits:Number(v[5]),thresholdAdjustment:Number(v[6]),factorBaseSize:Number(v[7])};}
const stats=s=>Object.fromEntries(DLP_STAT_KEYS.map((k,i)=>[k,Number(api.codex_dlp_stat(s,i))]));
test('actual native profiles use identical coord/helper settings and fixed target',()=>{
 assert.equal(api.codex_dlp_version(),1);
 for(const [id,p]of ['baseline','half','quarter'].entries()){
  const s=inputCall(rsa,(p,n)=>api.codex_dlp_new(p,n,id)),w=inputCall(rsa,(p,n)=>api.codex_dlp_prepare(p,n,id));assert.ok(s&&w);
  try{const c=config(s,p);validateDlpConfiguration(c,p,330);assert.deepEqual(config(w,p,true),c);assert.equal(api.qs_coord_target(s),c.factorBaseSize+64);validateDlpStats(stats(s),null,0,0);}finally{api.qs_coord_free(s);api.qs_worker_free(w);}
 }
 assert.equal(inputCall(rsa,(p,n)=>api.codex_dlp_new(p,n,3)),0);
});
test('actual serialized ingestion counters describe full and cycle yield',()=>{
 const n=JSON.parse(readFileSync(new URL('../bench/staged-full/catalog.json',import.meta.url))).cases.find(c=>c.digits===40).input;
 const s=inputCall(n,(p,l)=>api.codex_dlp_new(p,l,2)),w=inputCall(n,(p,l)=>api.codex_dlp_prepare(p,l,2));assert.ok(s&&w);
 try{const h=api.qs_worker_sieve(w,0,2),p=api.qs_buffer_pointer(h),length=api.qs_buffer_length(h);const b=new Uint8Array(api.memory.buffer.slice(p,p+length));api.qs_buffer_free(h);
 const rows=validatePacket(b,{first:0,count:2,target:api.codex_coord_fb_len(s)});assert.ok(rows.relations>0);
 const usable=bytesCall(b.subarray(12),(p,l)=>api.qs_coord_submit(s,p,l));validateDlpStats(stats(s),null,rows.relations,usable);assert.ok(stats(s).ingested>0);
 }finally{api.qs_coord_free(s);api.qs_worker_free(w);}
});

test('real RSA DLP packets reach the original collector for every named cutoff',{timeout:60000},()=>{
 for(const [id,profile]of ['baseline','half','quarter'].entries()){
  const s=inputCall(rsa,(p,n)=>api.codex_dlp_new(p,n,id)),w=inputCall(rsa,(p,n)=>api.codex_dlp_prepare(p,n,id));assert.ok(s&&w);
  try{
   const h=api.qs_worker_sieve(w,0,1),p=api.qs_buffer_pointer(h),length=api.qs_buffer_length(h),b=new Uint8Array(api.memory.buffer.slice(p,p+length));api.qs_buffer_free(h);
   const rows=validatePacket(b,{first:0,count:1,target:api.codex_coord_fb_len(s)});assert.equal(rows.polynomials,2048);
   const usable=bytesCall(b.subarray(12),(p,n)=>api.qs_coord_submit(s,p,n)),observed=stats(s);
   validateDlpStats(observed,null,rows.relations,usable);assert.equal(observed.ingested,rows.relations);assert.ok(observed.dlp>0);
   console.log(JSON.stringify({preflightOnly:true,profile,polynomials:rows.polynomials,raw:rows.relations,collector:observed,configuration:config(s,profile)}));
  }finally{api.qs_coord_free(s);api.qs_worker_free(w);}
 }
});
