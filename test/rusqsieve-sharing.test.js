// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import test from 'node:test';
import assert from 'node:assert/strict';
import {RUSQSIEVE_BASE64} from '../src/rusqsieve/wasm-bytes.js';
import {validatePacket} from '../src/rusqsieve/contracts.js';
import {FULL_CASES} from '../bench/staged-full/cases.js';
test('shared context preserves family bytes, lifetime and post-free requested-live baseline',async()=>{
 const {instance}=await WebAssembly.instantiate(Buffer.from(RUSQSIEVE_BASE64,'base64'),{}),a=instance.exports;
 const input=new TextEncoder().encode(FULL_CASES.find(c=>c.id==='full-balanced-40-1').input);
 const p=a.qs_alloc(input.length,1);new Uint8Array(a.memory.buffer,p,input.length).set(input);
 const take=h=>{const b=Buffer.from(new Uint8Array(a.memory.buffer,a.qs_buffer_pointer(h),a.qs_buffer_length(h)));a.qs_buffer_free(h);return b;};
 function cycle(reverse){
  const c=a.qs_coord_new(p,input.length);assert.ok(c);const fb=a.codex_coord_fb_len(c);assert.equal(a.qs_coord_target(c),fb+64);
  const before=a.codex_mem_live(),shared=a.codex_coord_worker(c),sharedExtra=a.codex_mem_live()-before;assert.ok(shared);
  const beforeCopy=a.codex_mem_live(),copy=a.qs_worker_prepare(p,input.length),copyExtra=a.codex_mem_live()-beforeCopy;assert.ok(copy);assert.ok(sharedExtra<copyExtra);
  const one=take(a.qs_worker_sieve(shared,0,2)),two=take(a.qs_worker_sieve(copy,0,2));assert.deepEqual(one,two);validatePacket(one,{first:0,count:2,target:fb});
  if(reverse){a.qs_coord_free(c);assert.equal(a.codex_coord_worker(c),0);assert.deepEqual(take(a.qs_worker_sieve(shared,0,2)),one);a.qs_worker_free(shared);}
  else{a.qs_worker_free(shared);a.qs_coord_free(c);}
  a.qs_worker_free(copy);assert.equal(a.qs_worker_sieve(shared,0,2),0);assert.equal(a.codex_coord_fb_len(c),0);return{sharedExtra,copyExtra};
 }
 cycle(false);const baseline=a.codex_mem_live();const first=cycle(false);assert.equal(a.codex_mem_live(),baseline);cycle(true);assert.equal(a.codex_mem_live(),baseline);
 a.qs_dealloc(p,input.length,1);console.log(JSON.stringify(first));
});
