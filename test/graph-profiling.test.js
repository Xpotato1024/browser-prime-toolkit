// SPDX-License-Identifier: AGPL-3.0-only
import test from'node:test';import assert from'node:assert/strict';import{semanticSections}from'../native/graph-profiling/sections.mjs';import{RUSQSIEVE_BASE64 as names}from'../src/graph-profiling/wasm-names.js';import{RUSQSIEVE_BASE64 as original}from'../src/graph-profile/wasm-compact.js';
test('diagnostic name section preserves every executable and data section',()=>{assert.deepEqual(semanticSections(Buffer.from(names,'base64')),semanticSections(Buffer.from(original,'base64')));});
test('diagnostic section reader rejects truncated sizes and payloads',()=>{for(const extra of [[1,128],[1,127,0],[1,255,255,255,255,31]])assert.throws(()=>semanticSections(Buffer.from([0,97,115,109,1,0,0,0,...extra])));});
