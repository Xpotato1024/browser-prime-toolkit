import test from 'node:test';
import assert from 'node:assert/strict';
import {SELECTED_STAGED_MODE,selectValidatedStagedPlan} from '../src/engine/staged-selected.js';
import {runSelectedStagedRequest} from '../src/worker/staged-selected.js';
import {verifyStagedOutcome} from '../src/engine/staged-result.js';
test('training-selected entry point fixes its policy without widening input bounds',async()=>{
 assert.equal(selectValidatedStagedPlan('10403',{mode:'brent'}).mode,SELECTED_STAGED_MODE);
 assert.throws(()=>selectValidatedStagedPlan((1n<<128n).toString()),/range/);
 const result=await runSelectedStagedRequest('1',{mode:'brent'});
 assert.equal(verifyStagedOutcome(result,'1').policy,SELECTED_STAGED_MODE);
});
