// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{execFileSync}from'node:child_process';
const p=JSON.parse(readFileSync('bench/staged-sustained-plan.json'));assert.equal(p.baseline,'c1d91e7d0f9b53ea324de3df654b51c94c597288');assert.equal(p.memoryMiB,512);assert.equal(p.harness.navigationMs,30000);assert.equal(p.budget.totalMaximumMs,4260000);
assert.deepEqual(p.coordinatorTrials.map(r=>[r.coordinator,r.workers,r.repeat,r.budgetMs]),[['combined',4,1,60000],['dedicated',4,1,60000],['dedicated',4,2,60000],['combined',4,2,60000]]);
for(const[k,ms]of [['sustainedTrials',300000],['extensionTrials',600000]])assert.deepEqual(p[k].map(r=>[r.workers,r.repeat,r.budgetMs]),[[2,1,ms],[4,1,ms],[4,2,ms],[2,2,ms]]);
for(const path of ['scripts/generate-sustained-runner.mjs','scripts/generate-sustained-harness.mjs'])execFileSync(process.execPath,[path,'--check'],{stdio:'pipe'});
console.log('Sustained finite plan, derived measurement-only runtime/harness and original artifacts are fixed');
