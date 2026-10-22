// SPDX-License-Identifier: AGPL-3.0-only
import test from'node:test';import assert from'node:assert/strict';
import{graphApi,GraphSession}from'../src/graph-profile/session.js';
import{PackedSession}from'../src/graph-arena/profile.js';
import{RUSQSIEVE_BASE64 as baseline}from'../src/graph-release/wasm-release.js';
const red=process.env.PRIME_PACKED_RED==='1';
const{RUSQSIEVE_BASE64:packed}=await import(red?'../src/graph-release/wasm-release.js':'../src/graph-arena/wasm-packed.js');
const Candidate=red?GraphSession:PackedSession;
for(const input of ['8156172677439289108635319830552518815109','8505664162359734566676378490297194387200285122470917324701475577'])test('packed edges preserve packets, all columns and full extraction: '+input.length+' digits',async()=>{
 const a=new GraphSession(await graphApi(baseline),input),b=new Candidate(await graphApi(packed),input);
 try{
  let usable=0;
  for(let f=0;f<1024&&usable<a.target;f++){const pa=a.packet(f),pb=b.packet(f);assert.deepEqual(pa,pb);usable=a.submit(pa);assert.equal(b.submit(pb),usable);}
  assert.ok(usable>=a.target,'Usable '+usable+'/'+a.target);assert.deepEqual(a.columns(),b.columns());assert.deepEqual(a.counters(),b.counters());
  assert.ok(b.memory().live<a.memory().live,'Reduce retained requested allocation');
  const ga=a.profile(),gb=b.profile();assert.equal(gb.retainedStructBytes,8);assert.equal(gb.powerCapacity,0);assert.ok(gb.retainedPayloadBytes>0);assert.equal(ga.powerLength,gb.powerLength);assert.equal(ga.rootEncodedBytes,gb.rootEncodedBytes);
  assert.ok(b.memory().live<a.memory().live);
  const ea=a.extract(),eb=b.extract();assert.equal(ea.status,1);assert.equal(eb.status,1);assert.equal(ea.divisor,eb.divisor);
  assert.equal(b.profile().retainedPayloadBytes,0);assert.equal(b.extract().status,10);
 }finally{a.close();b.close();}
});
