// SPDX-License-Identifier: AGPL-3.0-only
import test from'node:test';import assert from'node:assert/strict';
import{graphApi,GraphSession}from'../src/graph-profile/session.js';
import{RUSQSIEVE_BASE64 as baseline}from'../src/graph-profile/wasm-compact.js';
const{RUSQSIEVE_BASE64:release}=await import(process.env.PRIME_RELEASE_RED==='1'?'../src/graph-profile/wasm-compact.js':'../src/graph-release/wasm-release.js');
for(const input of ['8156172677439289108635319830552518815109','8505664162359734566676378490297194387200285122470917324701475577'])test('irreversible extraction preserves exact columns, counts and factor: '+input.length+' digits',async()=>{
 const a=new GraphSession(await graphApi(baseline),input),b=new GraphSession(await graphApi(release),input);
 try{
  let usable=0;
  for(let f=0;f<1024&&usable<a.target;f++){const pa=a.packet(f),pb=b.packet(f);assert.deepEqual(pa,pb);usable=a.submit(pa);assert.equal(b.submit(pb),usable);}
  assert.ok(usable>=a.target,'Usable '+usable+'/'+a.target);const counters=b.counters(),columns=b.columns();
  assert.deepEqual(a.columns(),columns);assert.deepEqual(a.counters(),counters);
  a.api.codex_mem_reset_peak();b.api.codex_mem_reset_peak();
  const ea=a.extract(),eb=b.extract();assert.equal(ea.status,1);assert.equal(eb.status,1);assert.equal(ea.divisor,eb.divisor);
  assert.deepEqual(b.counters(),counters,'Cumulative counts do not roll back when retained graph is freed');
  assert.deepEqual(b.columns(),columns);
  const profile=b.profile();assert.equal(profile.treeEdges,0);assert.equal(profile.treeCapacity,0);assert.equal(profile.mapLength,0);assert.equal(profile.seenALowerBound,0);
  assert.ok(eb.phases.find(r=>r[0]===11)[1]<eb.phases.find(r=>r[0]===10)[1]);
  assert.ok(b.memory().peak<a.memory().peak,'Reduce LA overlapping requested allocation');
  assert.equal(b.extract().status,10,'Repeated extraction explicitly refused');
  assert.equal((b.api.qs_coord_submit(b.session,0,0)>>>0),4294967295,'Post-stop submit explicitly refused before input copy');
  assert.deepEqual(b.counters(),counters);assert.deepEqual(b.columns(),columns);
 }finally{a.close();b.close();}
});
test('insufficient extraction is terminal and fresh session recovers',async()=>{
 const api=await graphApi(release),s=new GraphSession(api,'8156172677439289108635319830552518815109');
 try{assert.equal(s.extract().status,2);assert.equal(s.extract().status,10);assert.equal((api.qs_coord_submit(s.session,0,0)>>>0),4294967295);}finally{s.close();}
 const fresh=new GraphSession(api,'8156172677439289108635319830552518815109');try{assert.equal(fresh.next,0);fresh.submit(fresh.packet(0));assert.ok(fresh.counters()[7]>0);}finally{fresh.close();}
});

test('actual dense fallback with valid trivial relations returns NoFactor and remains terminal',async()=>{
 const s=new GraphSession(await graphApi(release),'8156172677439289108635319830552518815109');
 try{
  const count=s.target,body=20+count*9,b=new Uint8Array(20+body),v=new DataView(b.buffer);
  b.set([81,83,86,49]);v.setUint16(4,10,true);v.setUint16(6,1,true);v.setUint32(8,b.length-12,true);v.setUint32(12,1,true);v.setUint32(16,body,true);v.setBigUint64(20,0n,true);v.setBigUint64(28,1n,true);v.setUint32(36,count,true);
  for(let i=0;i<count;i++)b.set([1,0,1,0,0,0,0,0,0],40+i*9);
  assert.equal(s.submit(b),count);const counters=s.counters(),r=s.extract();
  assert.equal(r.status,4);assert.equal(r.divisor,null);assert.ok(r.phases.some(p=>p[0]===25),'Real fallback branch');
  assert.equal(s.extract().status,10);assert.equal((s.api.qs_coord_submit(s.session,0,0)>>>0),4294967295);assert.deepEqual(s.counters(),counters);
 }finally{s.close();}
});
