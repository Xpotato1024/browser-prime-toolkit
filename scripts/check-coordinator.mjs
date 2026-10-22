// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const plan=read('bench/staged-coordinator-plan.json'),prior=read('docs/benchmarks/staged-resources-stage21/run.json');
assert.ok(prior.completedAt);assert.equal(prior.measuredHead,plan.prerequisiteCore);assert.equal(prior.fixedFamilyProof.verified,true);assert.equal(prior.familyProof.verified,true);
for(const repeat of [1,2]){
 const r=read('docs/benchmarks/staged-resources-stage21/w4-r'+repeat+'.json').records[0],a=r.outcome.ownerActivity.owners;
 assert.ok(r.handoff.globalCapacityIdleMs>=plan.signal.minimumGlobalCapacityIdleMs);assert.ok(a[0].assignedRatio>=plan.signal.minimumCoordinatorAssignedRatio);assert.ok(a.slice(1).reduce((n,x)=>n+x.assignedRatio,0)/3<=plan.signal.maximumHelperAverageAssignedRatio);
}
assert.equal(plan.requestBudgetMs,360000);assert.deepEqual(plan.trials.map(x=>[x.coordinator,x.repeat]),[['combined',1],['dedicated',1],['dedicated',2],['combined',2]]);
execFileSync(process.execPath,[new URL('generate-coordinator-runner.mjs',import.meta.url).pathname,'--check'],{stdio:'pipe'});
console.log('Coordinator signal/prerequisite, four-slot role budget and source-derived host-only changes verified');
