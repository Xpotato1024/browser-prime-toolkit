// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {longMemoryContract} from '../native/long-window/memory-contract.mjs';
import {graphApi} from '../src/graph-profile/session.js';
import {PackedSession} from '../src/graph-arena/profile.js';
import {RUSQSIEVE_BASE64 as baseline} from '../src/long-window/wasm-long-256.js';
import {RUSQSIEVE_BASE64 as candidate} from '../src/long-window/wasm-long-1024.js';
test('named wide artifact keeps a small initial memory and an explicit 1GiB unshared maximum',()=>{
 const b=Buffer.from(candidate,'base64'),r=JSON.parse(readFileSync('native/long-window/build-long-1024.json'));
 assert.equal(r.cleanBuilds,2);assert.equal(createHash('sha256').update(b).digest('hex'),r.sha256);
 const m=longMemoryContract(b,1024);assert.equal(m.maximumBytes,1024*1048576);assert.ok(m.initialBytes<=2*1048576);assert.equal(m.shared,false);
 assert.equal(r.commit,'4b150834b57636f6ebc350a81321a15c1cd901d2');assert.equal(r.upstreamSha256,'86ab9802fbd93690a053dc0630fffe33d1f3f1625d7d6345ec82d74be9d8d11c');
});
for(const route of [1,2,3,4])test('wide quota refuses a tiny allocation route without changing live bytes: '+route,async()=>{
 const a=await graphApi(candidate),before=a.codex_mem_live();assert.equal(a.codex_la_probe(route),1);assert.equal(a.codex_mem_live(),before);assert.equal(a.codex_la_refusals(),1);assert.equal(a.codex_mem_failures(),1);assert.equal(a.codex_la_active(),0);
});
for(const input of ['8156172677439289108635319830552518815109','8505664162359734566676378490297194387200285122470917324701475577'])test('wide cap preserves all packets, columns, counters and full extraction: '+input.length+'digits',async()=>{
 const a=new PackedSession(await graphApi(baseline),input),b=new PackedSession(await graphApi(candidate),input);
 try{
  let usable=0;
  for(let f=0;f<1024&&usable<a.target;f++){const p=a.packet(f);assert.deepEqual(b.packet(f),p);usable=a.submit(p);assert.equal(b.submit(p),usable);}
  assert.ok(usable>=a.target);assert.deepEqual(a.columns(),b.columns());assert.deepEqual(a.counters(),b.counters());assert.deepEqual(a.profile(),b.profile());
  const x=a.extract(),y=b.extract();assert.equal(x.status,1);assert.equal(y.status,1);assert.equal(y.divisor,x.divisor);
  const n=BigInt(input),d=BigInt(y.divisor);assert.ok(d>1n&&d<n);assert.equal(n%d,0n);assert.equal(b.memory().failures,0);
 }finally{a.close();b.close();}
 const fresh=new PackedSession(await graphApi(candidate),input);try{assert.equal(fresh.next,0);assert.equal(fresh.api.codex_lpmap_field(fresh.session,0),0);}finally{fresh.close();}
});
