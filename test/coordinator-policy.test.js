import test from 'node:test';import assert from 'node:assert/strict';
import {runRusqsieve} from '../src/coordinator/runner.js';
import {OwnerClock} from '../src/coordinator/metrics.js';
import {selectResourcePlan} from '../src/resources/policy.js';
test('dedicated coordinator requires a helper and a boolean policy before allocation',()=>{
 let created=0;const createWorker=()=>{created++;throw Error('unexpected');};
 for(const coordinatorCompute of [false,'dedicated',1,null]){
  assert.throws(()=>runRusqsieve('143',{coordinatorCompute,resourcePlan:selectResourcePlan(),createWorker}));
 }
 assert.equal(created,0);
});
test('dedicated coordinator idle is not a blocked compute owner',()=>{
 const c=new OwnerClock(4,0),owners=[{canCompute:false},...Array.from({length:3},()=>({job:null,command:null,canCompute:true}))];
 c.transition(0,owners,[0,1,1,1],2,33554432);c.finish(10);
 const rows=c.result().owners;assert.equal(rows[0].states.coordinatorIdleMs,10);assert.equal(rows[0].states.globalCapacityIdleMs,0);
 for(const r of rows.slice(1))assert.equal(r.states.globalCapacityIdleMs,10);
});
