import test from 'node:test';
import assert from 'node:assert/strict';
import {refinementTiers} from '../../scripts/practical-plan.mjs';
test('two-digit refinements cover all three time thresholds with fixed inputs',()=>{
 const row=(digits,counts)=>({digits,solvedByBudget:counts.map((solved,i)=>({budgetMs:[3000,30000,180000][i],solved}))});
 assert.deepEqual(refinementTiers([row(24,[4,4,4]),row(28,[0,4,4]),row(32,[0,0,3]),row(34,[0,0,0])]),[26,30]);
 assert.deepEqual(refinementTiers([row(24,[4,4,4]),row(26,[1,4,4]),row(28,[0,4,4])]),[]);
});
