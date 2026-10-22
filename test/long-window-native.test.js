// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {graphApi} from '../src/graph-profile/session.js';
import {PackedSession} from '../src/graph-arena/profile.js';
const {RUSQSIEVE_BASE64}=await import(process.env.PRIME_LONG_RED==='1'?'../src/lp-map/wasm-lpmap-256.js':'../src/long-window/wasm-long-256.js');
for(const kind of [1,2,3,4])test('native extraction quota refuses safely, allocator route '+kind,async()=>{
 const api=await graphApi(RUSQSIEVE_BASE64);
 assert.equal(typeof api.codex_la_probe,'function');
 const before=api.codex_mem_live();
 assert.equal(api.codex_la_probe(kind),1);
 assert.equal(api.codex_mem_live(),before);
 assert.equal(api.codex_la_refusals(),1);
 assert.equal(api.codex_mem_failures(),1);
 assert.equal(api.codex_la_active(),0);
});
test('actual extraction preflight returns ResourceLimit before large allocation',async()=>{
 const api=await graphApi(RUSQSIEVE_BASE64),s=new PackedSession(api,'8156172677439289108635319830552518815109');
 try{
  let usable=0;for(let f=0;f<64&&usable<s.target;f++)usable=s.submit(s.packet(f));
  assert.ok(usable>=s.target);
  assert.equal(api.codex_la_lower_limits(1,208*1048576),1);
  const r=s.extract();assert.equal(r.status,5);assert.equal(r.divisor,null);
  assert.equal(api.codex_la_preflight_refused(),1);
  assert.equal(api.codex_la_refusals(),0);
  assert.equal(api.codex_mem_failures(),0);assert.equal(api.codex_la_active(),0);
 }finally{s.close();}
});
