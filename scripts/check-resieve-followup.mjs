// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {longMemoryContract} from '../native/long-window/memory-contract.mjs';
const read=p=>readFileSync(p),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=JSON.parse(read('native/long-window/build-long-1024.json'));
const plan=JSON.parse(read('bench/staged-resieve-followup-plan.json'));
assert.equal(plan.id,'llm01-resieve-followup-stage41');assert.equal(plan.limits.totalCampaignMs,960000);
assert.equal(plan.trials.length,8);assert.ok(plan.trials.every(t=>t.budgetMs===90000));
for(const kind of ['resieve1','rank']){
 const r=JSON.parse(read('native/resieve-followup/build-'+kind+'-1024.json'));
 const text=read('src/resieve-followup/wasm-'+kind+'-1024.js').toString(),match=/export const RUSQSIEVE_BASE64=("[^"]+");/.exec(text);
 assert.ok(match);const b=Buffer.from(JSON.parse(match[1]),'base64');assert.equal(sha(b),r.sha256);assert.equal(b.length,r.bytes);
 assert.deepEqual(longMemoryContract(b,1024),r.memory);assert.equal(r.cleanBuilds,2);assert.ok(r.memory.initialBytes<=2*1048576);
 assert.equal(r.commit,baseline.commit);assert.equal(r.image,baseline.image);assert.deepEqual(r.args,baseline.args);
 assert.equal(plan.artifacts[kind].sha256,r.sha256);
 assert.ok(!WebAssembly.Module.exports(new WebAssembly.Module(b)).some(e=>e.name==='codex_resieve_followup_oracle'),'Separate proof artifact only');
 for(const[p,h]of Object.entries(r.sourceHashes))assert.equal(sha(read(p)),h,p);
 const changed=Object.keys(baseline.compiledSources).filter(p=>baseline.compiledSources[p]!==r.compiledSources[p]);
 assert.deepEqual(changed.sort(),(kind==='rank'?['src/src/engine.rs','src/src/engine/siqs.rs']:['src/src/engine.rs']).sort());assert.equal(Object.keys(r.compiledSources).length,Object.keys(baseline.compiledSources).length);
 assert.deepEqual(plan.trials.filter(t=>t.candidate===kind).map(t=>t.graph),['baseline',kind,kind,'baseline']);
}
console.log('Two independent uninstrumented resieve candidates: pins, two clean builds, finite ABBA, exact artifact and source closure verified');
