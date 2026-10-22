// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {graphApi} from '../src/graph-profile/session.js';
import {PackedSession} from '../src/graph-arena/profile.js';
const {RUSQSIEVE_BASE64}=await import(process.env.PRIME_MATRIX_MEMORY_RED==='1'?'../src/long-window/wasm-long-1024.js':'../src/matrix-memory/wasm-1024.js');
test('completed reduced columns survive early filter release with a real live-byte drop',async()=>{
 const input='8505664162359734566676378490297194387200285122470917324701475577',s=new PackedSession(await graphApi(RUSQSIEVE_BASE64),input);
 let trapped=false;
 try{
  let usable=0;
  for(let family=0;family<1024&&usable<s.target;family++)usable=s.submit(s.packet(family));
  assert.ok(usable>=s.target);const result=s.extract();assert.equal(result.status,1);
  const n=BigInt(input),d=BigInt(result.divisor);assert.ok(d>1n&&d<n);assert.equal(n%d,0n);
  const before=result.phases.find(p=>p[0]===22),released=result.phases.find(p=>p[0]===26);
  assert.ok(before&&released,'A filter-release phase must be observed');
  assert.ok(released[1]<before[1],'Owned reduced columns remain while filter storage is freed');
  assert.equal(s.memory().failures,0);
 }catch(error){trapped=error instanceof WebAssembly.RuntimeError;throw error;}
 finally{if(!trapped)s.close();}
});
