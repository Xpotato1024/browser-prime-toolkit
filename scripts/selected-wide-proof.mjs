// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
export const SELECTED_CONTRACT_NAMES=Object.freeze([
 "profile-before-worker",
 "configuration-forgery-retired",
 "counter-forgery-retired",
 "unsupported-before-worker",
 "budget-before-worker",
 "cancel-during-sieve",
 "noncooperative-deadline",
 "worker-cap-before-allocation",
 "bounded-known-allocator-refusal",
 "unknown-trap-is-not-oom",
 "forged-native-frame-retired",
 "stale-generation-ignored",
 "proper-divisor-independent-check",
 "noncooperative-extraction-deadline",
 "native-preflight-budget-retired",
 "native-abort-budget-retired",
 "unknown-extract-trap-retired",
 "quota-evidence-missing-retired",
 "quota-evidence-null-retired",
 "quota-evidence-zero-retired",
 "fresh-full-64-path",
 "fresh-full-path"
]);
export function validateSelectedContractTests(tests){
 assert.ok(Array.isArray(tests));assert.deepEqual(tests.map(t=>t.name),SELECTED_CONTRACT_NAMES,'All22 contracts in fixed order, without missing/duplicate/replaced tests');
 assert.ok(tests.every(t=>t.pass===true&&!('error'in t)),'Every named contract must succeed');return true;
}
