// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {graphApi} from '../src/graph-profile/session.js';
import {PackedSession} from '../src/graph-arena/profile.js';
import {RUSQSIEVE_BASE64 as baseline} from '../src/graph-varint/wasm-varint-256.js';
const {RUSQSIEVE_BASE64:candidate}=await import(process.env.PRIME_LPMAP_RED==='1'?'../src/graph-varint/wasm-varint-256.js':'../src/lp-map/wasm-lpmap-256.js');
test('LP map exact u32/u64 boundary, collisions and replacement',async()=>{
 const api=await graphApi(candidate);
 assert.equal(typeof api.codex_lpmap_selftest,'function');
 assert.equal(api.codex_lpmap_selftest(),1);
});
for(const input of ['8156172677439289108635319830552518815109','8505664162359734566676378490297194387200285122470917324701475577'])test('LP map preserves packets, columns, counters, factors and terminal recovery: '+input.length+'digits',async()=>{
 const a=new PackedSession(await graphApi(baseline),input),b=new PackedSession(await graphApi(candidate),input);
 try{
  let usable=0;
  for(let f=0;f<1024&&usable<a.target;f++){const p=a.packet(f);assert.deepEqual(b.packet(f),p);usable=a.submit(p);assert.equal(b.submit(p),usable);}
  assert.ok(usable>=a.target);
  assert.deepEqual(a.columns(),b.columns());assert.deepEqual(a.counters(),b.counters());
  const x=a.profile(),y=b.profile();
  for(const key of Object.keys(x))if(!['mapCapacity','mapEntryLowerBound'].includes(key))assert.equal(y[key],x[key],key);
  assert.ok(y.mapEntryLowerBound<x.mapEntryLowerBound,'narrow keys reduce retained key/value capacity');
  assert.ok(b.memory().live<a.memory().live,'narrow keys reduce total live requested allocation');
  assert.equal(b.memory().failures,0);
  const smallLen=b.api.codex_lpmap_field(b.session,0),smallCap=b.api.codex_lpmap_field(b.session,1),wideLen=b.api.codex_lpmap_field(b.session,2),wideCap=b.api.codex_lpmap_field(b.session,3);
  assert.equal(smallLen+wideLen,y.mapLength);assert.equal(smallCap+wideCap,y.mapCapacity);
  assert.equal(smallCap*8+wideCap*16,y.mapEntryLowerBound);
  const left=a.extract(),right=b.extract();assert.equal(left.status,1);assert.equal(right.status,1);assert.equal(left.divisor,right.divisor);
  const n=BigInt(input),d=BigInt(right.divisor);assert.ok(d>1n&&d<n);assert.equal(n%d,0n);
  assert.equal(b.api.codex_lpmap_field(b.session,0),0);assert.equal(b.api.codex_lpmap_field(b.session,2),0);
  assert.notEqual(b.extract().status,1);
 }finally{a.close();b.close();}
 const fresh=new PackedSession(await graphApi(candidate),input);try{assert.equal(fresh.next,0);assert.equal(fresh.api.codex_lpmap_field(fresh.session,0),0);assert.equal(fresh.api.codex_lpmap_field(fresh.session,2),0);}finally{fresh.close();}
});
