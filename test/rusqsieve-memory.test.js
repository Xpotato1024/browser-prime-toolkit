// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import test from 'node:test';
import assert from 'node:assert/strict';
import {RUSQSIEVE_BASE64} from '../src/rusqsieve/wasm-bytes.js';
import {memoryContract} from '../native/rusqsieve/memory-contract.mjs';
test('bounded SIMD WASM allocator observer accounts alloc/free and refused growth',async()=>{
 const b=Buffer.from(RUSQSIEVE_BASE64,'base64'),contract=memoryContract(b);assert.equal(contract.minPages,17);assert.equal(contract.maxPages,4096);assert.equal(contract.shared,false);
 const {instance}=await WebAssembly.instantiate(b,{}),a=instance.exports;
 assert.equal(a.qs_abi_version(),6);assert.equal(a.qs_max_siqs_bits(),400);assert.equal(a.qs_max_input_bits(),1024);
 const before=a.codex_mem_live(),p=a.qs_alloc(1024,8);assert.ok(p);assert.equal(a.codex_mem_live(),before+1024);
 a.qs_dealloc(p,1024,8);assert.equal(a.codex_mem_live(),before);assert.ok(a.codex_mem_peak()>=before+1024);
 a.codex_mem_reset_peak();assert.equal(a.codex_mem_peak(),before);
 assert.equal(a.qs_alloc(268435456,8),0);assert.ok(a.codex_mem_failures()>0);assert.equal(a.codex_mem_last_failed(),268435456);assert.ok(a.memory.buffer.byteLength<=268435456);
});
