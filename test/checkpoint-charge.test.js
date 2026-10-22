import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCheckpointCharger} from '../src/engine/checkpoint-charge.js';
import {Budget,normalizeOptions} from '../src/engine/options.js';
function setup(max=1000,timeBudgetMs=1000){let now=0,reads=0,pulses=0;const budget=new Budget(normalizeOptions({operationBudget:max,timeBudgetMs}),()=>{reads++;return now;},()=>pulses++);const charge=makeCheckpointCharger(budget);return{budget,charge,set:t=>now=t,get reads(){return reads;},get pulses(){return pulses;}};}
test('logical operations keep the original cap regardless of batching',()=>{
 for(const max of [0,1,63,64,65,127,128,129]){
  const s=setup(max);let used=0;
  while(used<max){const count=Math.min(64,max-used);s.charge.charge(count,1);used+=count;}
  assert.equal(s.budget.operations,max);assert.throws(()=>s.charge.charge(1,1),/operation-budget/);
  assert.equal(s.budget.operations,max);
 }
});
test('phase change, bounded clock gap, finish and shared prework are accounted',()=>{
 const s=setup();s.budget.tick();assert.equal(s.budget.operations,1);
 s.charge.charge(1,1);const first=s.reads;
 for(let i=0;i<63;i++)s.charge.charge(1,1);
 assert.equal(s.reads,first);s.charge.charge(1,1);assert.equal(s.reads,first+1);
 s.charge.charge(1,2);assert.equal(s.reads,first+2);
 s.charge.finish();assert.equal(s.reads,first+3);assert.equal(s.budget.operations,67);
 assert.ok(s.charge.stats().maxClockGap<=64);
});
test('deadline and pulse remain live; unnotified remainder can sync without a clock',()=>{
 const s=setup(1000,10);s.charge.charge(1,1);s.set(11);
 for(let i=0;i<63;i++)s.charge.charge(1,1);
 assert.throws(()=>s.charge.charge(1,1),/time-budget/);assert.equal(s.budget.operations,65);
 const p=setup();p.set(150);p.charge.charge(64,1);assert.equal(p.pulses,1);
 p.charge.charge(7,2,false);assert.equal(p.budget.operations,71);
 for(const n of [-1,65,1.1,NaN])assert.throws(()=>p.charge.charge(n,1),/checkpoint/);
});

test('short native phase-tail imports force a deadline check before another native batch',()=>{
  const b=new Budget(normalizeOptions({operationBudget:1000,timeBudgetMs:1000}),()=>0,()=>{});
  const c=makeCheckpointCharger(b);c.charge(64,1,true,true);
  c.charge(1,1,true,true);assert.equal(c.stats().clockReads,2);
  c.charge(64,2,true,true);assert.equal(c.stats().maxClockGap,64);
});
