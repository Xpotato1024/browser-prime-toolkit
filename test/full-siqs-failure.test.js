import test from 'node:test';
import assert from 'node:assert/strict';
import {BudgetExceeded} from '../src/engine/options.js';
import {failFullNative} from '../src/full-siqs/failure.js';
test('unknown native trap and invalid algebra keep fatal identity after compute expiry',()=>{
 for(const reason of [0,5,6]){
  const trap=new WebAssembly.RuntimeError('unreachable');
  let accounted=false;
  assert.throws(()=>failFullNative(trap,{reason,abortReason:null,account(){accounted=true;throw new BudgetExceeded('time-budget');}}),e=>e===trap);
  assert.equal(accounted,true);
 }
});
test('recognized native stops preserve their explicit reason',()=>{
 for(const [reason,abortReason,expected]of [[2,null,'operation-budget'],[3,null,'algorithm-resource'],[4,null,'algorithm-resource'],[0,'OOM','algorithm-resource']])
  assert.throws(()=>failFullNative(Error('native stop'),{reason,abortReason,account(){}}),e=>e instanceof BudgetExceeded&&e.reason===expected);
});
