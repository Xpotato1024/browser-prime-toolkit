// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {graphApi} from '../src/graph-profile/session.js';
import {PackedSession} from '../src/graph-arena/profile.js';
import {RUSQSIEVE_BASE64 as baseline} from '../src/lp-map/wasm-lpmap-256.js';
import {RUSQSIEVE_BASE64 as guarded} from '../src/long-window/wasm-long-256.js';
for(const input of ['8156172677439289108635319830552518815109','8505664162359734566676378490297194387200285122470917324701475577'])test('allocation guard preserves complete numeric path: '+input.length+'digits',async()=>{
 const a=new PackedSession(await graphApi(baseline),input),b=new PackedSession(await graphApi(guarded),input);
 try{
  let usable=0;
  for(let f=0;f<1024&&usable<a.target;f++){const p=a.packet(f);assert.deepEqual(b.packet(f),p);usable=a.submit(p);assert.equal(b.submit(p),usable);}
  assert.ok(usable>=a.target);
  assert.deepEqual(a.columns(),b.columns());assert.deepEqual(a.counters(),b.counters());assert.deepEqual(a.profile(),b.profile());
  const x=a.extract(),y=b.extract();assert.equal(x.status,1);assert.equal(y.status,1);assert.equal(x.divisor,y.divisor);
  assert.equal(BigInt(input)%BigInt(y.divisor),0n);assert.equal(b.api.codex_la_active(),0);assert.equal(b.api.codex_la_refusals(),0);
  assert.equal(b.api.codex_la_preflight_refused(),0);assert.ok(b.api.codex_la_count()>0&&b.api.codex_la_count()<=24);
  assert.equal(b.memory().failures,0);
 }finally{a.close();b.close();}
 const c=new PackedSession(await graphApi(guarded),input);try{assert.equal(c.next,0);assert.equal(c.api.codex_la_refusals(),0);}finally{c.close();}
});
test('real small allocation abort leaves only nonallocating scalar diagnostics readable',async()=>{
 const a=await graphApi(guarded);
 assert.throws(()=>a.codex_la_abort_probe(),WebAssembly.RuntimeError);
 assert.equal(a.codex_la_active(),1);assert.equal(a.codex_la_refusals(),1);assert.equal(a.codex_mem_failures(),1);
 const count=a.codex_la_count();assert.ok(count>0&&count<=24);assert.equal(a.codex_la_field(count-1,0),99);
 // Deliberately no free/session/reuse after the Rust abort.
});
