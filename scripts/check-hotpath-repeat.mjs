// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {longMemoryContract} from '../native/long-window/memory-contract.mjs';
import {REPEAT_GATES} from './hotpath-repeat-stats.mjs';
const read=p=>readFileSync(p),sha=b=>createHash('sha256').update(b).digest('hex'),p=JSON.parse(read('bench/staged-hotpath-repeat-plan.json'));
assert.equal(p.id,'llm01-hotpath-repeat-stage44');assert.equal(p.baselineHead,'ad8885768236f4b718171bb8aa971d242b1f477e');
assert.equal(p.successfulReferenceHead,'d1e0b865d14b702bd633fd739e05b2d3c772a1c1');
assert.deepEqual(p.gates,REPEAT_GATES);assert.equal(p.limits.maxTrials,32);assert.equal(p.limits.totalCampaignMs,2880000);
assert.equal(p.limits.childBudgetMs,90000);assert.equal(p.limits.childTimeoutMs,112000);assert.equal(p.limits.reservePerChildMs,30000);
assert.equal(p.limits.families,4);assert.equal(p.limits.workers,1);assert.equal(p.limits.nativeHardmaxMiB,1024);
assert.equal(p.limits.manualBudgetMiB,1536);assert.equal(p.limits.slots,8);assert.equal(p.limits.transportMiB,64);assert.equal(p.limits.credit,2);
assert.equal(p.limits.startAvailableMiB,4096);assert.equal(p.limits.stopAvailableMiB,4096);assert.equal(p.limits.chromePssStopMiB,1536);
const expected=[['resieve1','ABBA'],['prefix','BAAB'],['resieve1','BAAB'],['prefix','ABBA'],['prefix','ABBA'],['resieve1','BAAB'],['prefix','BAAB'],['resieve1','ABBA']];
assert.deepEqual(p.blocks,expected.map(([candidate,order],i)=>({id:i+1,candidate,order})));assert.equal(p.trials.length,32);
const profiles={resieve1:'resieve-followup',prefix:'resieve-prefix'};
for(const[bIndex,b]of p.blocks.entries()){
 const rows=p.trials.slice(bIndex*4,bIndex*4+4);
 assert.deepEqual(rows.map(t=>t.graph),[...b.order].map(x=>x==='A'?'baseline':b.candidate));
 rows.forEach((t,i)=>{assert.equal(t.id,'b'+String(b.id).padStart(2,'0')+'-s'+(i+1)+'-'+t.graph);assert.equal(t.block,b.id);assert.equal(t.position,i+1);assert.equal(t.order,b.order);assert.equal(t.candidate,b.candidate);assert.equal(t.profile,profiles[b.candidate]);assert.equal(t.budgetMs,90000);});
}
const receipts={baseline:'native/long-window/build-long-1024.json',resieve1:'native/resieve-followup/build-resieve1-1024.json',prefix:'native/resieve-prefix/build-prefix-1024.json'};
const baseline=JSON.parse(read(receipts.baseline));
assert.deepEqual(Object.keys(p.artifacts).sort(),Object.keys(receipts).sort());
for(const[k,path]of Object.entries(receipts)){
 const r=JSON.parse(read(path)),text=read(p.artifacts[k].path).toString(),match=/export const RUSQSIEVE_BASE64=("[^"]+");/.exec(text);assert.ok(match);
 const bytes=Buffer.from(JSON.parse(match[1]),'base64');assert.equal(sha(bytes),r.sha256);assert.equal(sha(bytes),p.artifacts[k].sha256);
 assert.equal(r.cleanBuilds,2);assert.equal(r.commit,baseline.commit);assert.equal(r.image,baseline.image);assert.deepEqual(r.args,baseline.args);
 assert.deepEqual(longMemoryContract(bytes,1024),r.memory);assert.ok(r.memory.initialBytes<=2*1048576);
 assert.ok(!WebAssembly.Module.exports(new WebAssembly.Module(bytes)).some(e=>/oracle|collection/.test(e.name)),'Only existing uninstrumented performance exports');
 for(const[path,h]of Object.entries(r.sourceHashes))assert.equal(sha(read(path)),h,path);
 if(k!=='baseline'){assert.deepEqual(Object.keys(r.compiledSources),Object.keys(baseline.compiledSources));assert.deepEqual(Object.keys(r.compiledSources).filter(x=>r.compiledSources[x]!==baseline.compiledSources[x]),['src/src/engine.rs']);}
}
for(const reuse of Object.values(p.reusedValidation)){
 const bytes=read(reuse.index);assert.equal(sha(bytes),reuse.indexSha256);
 const index=JSON.parse(bytes);for(const[k,h]of Object.entries(reuse.entries))assert.equal(index.files[k].originalSha256,h);
}
console.log('Two existing exact artifacts/proofs reused;32 balanced trials,48-minute ceiling,0.5% effect/reference/order/PSS gates fixed');

for(const name of ['resieve-followup','resieve-prefix'])assert.ok(read('scripts/verify-'+name+'.mjs').toString().includes('assert.equal(budgetMs,90000);'),'Reuse existing pre-browser budget contract');
assert.equal(p.limits.maxTotalHarnessLaunches,33);assert.equal(p.limits.priorPreconditionRefusals,1);
