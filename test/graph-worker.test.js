// SPDX-License-Identifier: AGPL-3.0-only
import test from'node:test';
import assert from'node:assert/strict';
import{graphWorkerSource}from'../src/graph-profile/worker-source.js';
import{workerSourceForCap}from'../src/resources/worker-sources.js';
test('graph diagnostic artifact changes only coordinator, keeps role caps and boundaries',()=>{
 for(const v of ['baseline','compact']){
  assert.equal(graphWorkerSource(64,v),workerSourceForCap(64));
  const s=graphWorkerSource(256,v);assert.doesNotThrow(()=>new Function(s));
  assert.ok(s.includes('graphSnapshot()')&&s.includes('codex_graph_profile(session)'));
  assert.ok(s.includes('OWNER_CAP_MIB=256')||s.includes('OWNER_CAP_MIB=256;')||s.includes('OWNER_CAP_MIB=256'));
  assert.ok(!/\bimport\s*(?:\(|[{*'"])/.test(s));
 }
 assert.throws(()=>graphWorkerSource(256,'other'));
 assert.throws(()=>graphWorkerSource(512,'compact'));
});
