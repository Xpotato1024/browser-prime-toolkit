// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {longMemoryContract} from '../native/long-window/memory-contract.mjs';
import {RUSQSIEVE_BASE64} from '../src/matrix-memory/wasm-1024.js';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(p);
const r=JSON.parse(read('native/matrix-memory/build-matrix-1024.json')),old=JSON.parse(read('native/long-window/build-long-1024.json')),b=Buffer.from(RUSQSIEVE_BASE64,'base64');
assert.equal(r.graphVariant,'matrix-1024');assert.equal(r.cleanBuilds,2);assert.equal(r.bytes,439882);assert.equal(r.sha256,'ecbcf8878302be7c743b487572dd24927b9bb10ba466775aed7d727f56142b52');
assert.equal(sha(b),r.sha256);assert.deepEqual(longMemoryContract(b,1024),r.memory);assert.ok(r.memory.initialBytes<=2*1048576);
for(const k of ['commit','upstreamSha256','image','compiler','target','simd','args','dlpProfiles'])assert.deepEqual(r[k],old[k]);
for(const[p,h]of Object.entries(r.sourceHashes))assert.equal(sha(read(p)),h,p);
assert.deepEqual(Object.keys(r.compiledSources),Object.keys(old.compiledSources));
assert.deepEqual(Object.keys(r.compiledSources).filter(p=>r.compiledSources[p]!==old.compiledSources[p]),['src/src/f2/mod.rs']);
const plan=JSON.parse(read('bench/staged-matrix-memory-plan.json'));assert.equal(plan.id,'llm01-matrix-memory-stage39');assert.equal(plan.trials.length,8);
assert.equal(plan.trials.reduce((n,t)=>n+t.budgetMs+plan.limits.reservePerChildMs,0),360000);
for(const c of plan.cases)assert.deepEqual(plan.trials.filter(t=>t.caseId===c.id).map(t=>t.variant),['baseline','candidate','candidate','baseline']);
assert.equal(plan.adoption.digits64PeakRatioMax,0.9);assert.equal(plan.adoption.requestRatioMax,1.1);assert.equal(plan.adoption.nextChromeTrialsMax,1);
console.log('Only f2 lifetime code differs; source/two-clean/1GiB bounds and finite ABBA plan verified');
