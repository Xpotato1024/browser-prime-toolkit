import test from 'node:test';
import assert from 'node:assert/strict';
import {RSA_PROFILE} from '../src/full-siqs/profile.js';
test('full native loop checkpoints use a safe finite budget sized for long trials',()=>{
 assert.equal(RSA_PROFILE.operationBudget,1000000000000);
 assert.ok(Number.isSafeInteger(RSA_PROFILE.operationBudget));
});
