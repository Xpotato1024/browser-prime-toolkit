// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {graphApi,GraphSession,GRAPH_FIELDS} from '../src/graph-profile/session.js';
import {RUSQSIEVE_BASE64 as baseline} from '../src/graph-profile/wasm-baseline.js';
import {RUSQSIEVE_BASE64 as compact} from '../src/graph-profile/wasm-compact.js';
const input='8156172677439289108635319830552518815109';
test('lossless forest roots preserve packets, cycles and complete extraction',async()=>{
 const a=new GraphSession(await graphApi(baseline),input),b=new GraphSession(await graphApi(compact),input);
 try{
  let usable=0;
  for(let f=0;f<32&&usable<a.target;f++){
   const pa=a.packet(f),pb=b.packet(f);assert.deepEqual(pa,pb,'Unchanged numerical family packet');
   usable=a.submit(pa);assert.equal(b.submit(pb),usable);assert.deepEqual(a.counters(),b.counters());
   assert.deepEqual(a.columns(),b.columns(),'Exact full exponents, roots and LP square factors');
  }
  assert.ok(usable>=a.target,'Small input reaches LA');
  assert.ok(a.counters()[3]>0,'Real LP cycles covered');
  const ga=a.profile(),gb=b.profile();assert.equal(Object.keys(ga).length,GRAPH_FIELDS.length);
  assert.ok(gb.retainedStructBytes<ga.retainedStructBytes);
  assert.equal(ga.rootEncodedBytes,gb.rootEncodedBytes);
  const ea=a.extract(),eb=b.extract();assert.equal(ea.status,1);assert.equal(eb.status,1);
  for(const r of [ea,eb]){const n=BigInt(input),d=BigInt(r.divisor);assert.ok(d>1n&&d<n&&n%d===0n);assert.deepEqual(r.phases.map(x=>x[0]),[1,2,3,4]);}
  assert.equal(ea.divisor,eb.divisor);
 }finally{a.close();b.close();}
 assert.equal(a.memory().failures,0);assert.equal(b.memory().failures,0);
 assert.throws(()=>b.packet(0),/Bounded family/);
});
