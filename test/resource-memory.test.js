import test from 'node:test';import assert from 'node:assert/strict';
import {resourceMemoryContract} from '../native/resources/memory-contract.mjs';
import {RUSQSIEVE_BASE64 as wasm64} from '../src/resources/wasm-64.js';
import {RUSQSIEVE_BASE64 as wasm128} from '../src/resources/wasm-128.js';
test('actual role artifacts enforce distinct compiled hardcaps',()=>{
 for(const [cap,base64] of [[64,wasm64],[128,wasm128]]){
  const bytes=Buffer.from(base64,'base64'),m=resourceMemoryContract(bytes,cap);
  assert.equal(m.maximumBytes,cap*1048576);assert.equal(m.initialBytes,1114112);assert.equal(m.shared,false);
  const api=new WebAssembly.Instance(new WebAssembly.Module(bytes),{}).exports;
  assert.equal(api.memory.buffer.byteLength,1114112);
  assert.throws(()=>api.memory.grow(cap*16),RangeError);
  assert.throws(()=>resourceMemoryContract(bytes,cap===64?128:64));
 }
});
