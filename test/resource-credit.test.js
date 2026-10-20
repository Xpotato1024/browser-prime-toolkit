import test from 'node:test';import assert from 'node:assert/strict';
import {CreditLedger} from '../src/resources/credits.js';
test('four owners share four global packet slots and ack cannot erase newer active work',()=>{
 const q=new CreditLedger(4,'credit1',100),jobs=[0,1,2,3].map(i=>q.issue(i));
 assert.equal(q.reservedBytes,33554432);assert.equal(q.issue(0),null);
 for(let i=3;i>=0;i--)q.returned(i,jobs[i],{buffer:new ArrayBuffer(12),stats:{}});
 assert.equal(q.beginSubmission().first,0);q.ack(0);
 const next=q.issue(0);assert.equal(next.first,4);assert.equal(q.issue(1),null);
 assert.equal(q.beginSubmission().first,1);q.ack(1);assert.equal(q.active[0],next);
 assert.equal(q.peakOutstanding,4);assert.equal(q.peakReserved,33554432);
 assert.throws(()=>q.returned(1,jobs[1],{buffer:new ArrayBuffer(12),stats:{}}));
});
test('global capacity is finite for every supported owner count',()=>{
 for(const n of [1,2,3,4]){
  const q=new CreditLedger(n,'credit1',12);
  for(let round=0;round<12;round++){
   for(let i=0;i<n;i++){const job=q.issue(i);if(job)q.returned(i,job,{buffer:new ArrayBuffer(12),stats:{}});}
   let item;while((item=q.beginSubmission()))q.ack(item.jobId);
  }
  assert.equal(q.submitted,12);assert.equal(q.reservedBytes,0);assert.ok(q.peakOutstanding<=4);assert.ok(q.peakReserved<=33554432);
 }
});
