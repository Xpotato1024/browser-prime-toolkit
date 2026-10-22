// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateSelectedContractTests,SELECTED_CONTRACT_NAMES} from '../scripts/selected-wide-proof.mjs';
const good=()=>SELECTED_CONTRACT_NAMES.map(name=>({name,pass:true}));
test('all22 ordered selected contracts are accepted',()=>assert.equal(validateSelectedContractTests(good()),true));
test('missing, duplicated or renamed safety contract cannot be padded by a fresh success',()=>{
 for(const mutate of [r=>r.splice(6,1),r=>r[6]={...r[21]},r=>r[6].name='unknown-pass']){
  const rows=good();mutate(rows);assert.throws(()=>validateSelectedContractTests(rows));
 }
});
test('changed order, failed pass or error payload is rejected',()=>{
 for(const mutate of [r=>[r[6],r[7]]=[r[7],r[6]],r=>r[6].pass=false,r=>r[6].error='failure']){
  const rows=good();mutate(rows);assert.throws(()=>validateSelectedContractTests(rows));
 }
});
