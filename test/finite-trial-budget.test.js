// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {requireTrialWindow} from '../scripts/finite-trial-budget.mjs';
test('a detached browser trial starts only with its complete shutdown reserve',()=>{
 assert.equal(requireTrialWindow(121010,1000,()=>10),121000);
 assert.throws(()=>requireTrialWindow(121009,1000,()=>10),/retirement reserve/);
});
test('invalid and unbounded trial budgets cannot launch a child',()=>{
 for(const budget of [0,-1,3600001,Infinity,NaN])assert.throws(()=>requireTrialWindow(10000000,budget,()=>0));
 assert.throws(()=>requireTrialWindow(Infinity,1000,()=>0));
});
