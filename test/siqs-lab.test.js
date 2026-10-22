import test from 'node:test';
import assert from 'node:assert/strict';
import {planLanes,mergeRelationStreams,notificationAccounting} from '../src/siqs-lab/contracts.js';

test('lab budgets are shared across sequential and concurrent lanes',()=>{
 for(const workers of [1,2]){
  const p=planLanes({workers,operationBudget:1001,timeBudgetMs:1000});
  assert.equal(p.lanes.reduce((s,x)=>s+x.operationBudget,0),1001);
  assert.equal(p.concurrentWasmBytes,workers*268435456);
  assert.deepEqual(p.lanes.map(x=>x.seed),[1,11]);
 }
 for(const workers of [0,3,4])assert.throws(()=>planLanes({workers,operationBudget:1000,timeBudgetMs:1000}));
 assert.throws(()=>planLanes({workers:2,operationBudget:1e12+1,timeBudgetMs:1000}));
});
test('derived periodic count is distinguished from observed flushes and clocks',()=>{
 const r=notificationAccounting({work:109872280576, stride:1024, periodic:107297149,flush:19,deliveries:107297168,clockCalls:100,probeClockCalls:20});
 assert.equal(r.derivedPeriodic,107297149);assert.equal(r.observedDeliveries,107297168);
 assert.throws(()=>notificationAccounting({work:1024,stride:1024,periodic:0,flush:0,deliveries:0,clockCalls:0,probeClockCalls:0}));
});
const meta={input:'77',multiplier:1,fbSize:10,parameters:'base',build:'fixed'};
const stream=lines=>({meta,bytes:new TextEncoder().encode('4d\n'+lines.join('\n')+'\n')});
test('partial relations join one graph across A contexts and duplicate lanes',()=>{
 const a=stream(['A 2 3','R 1 0 2 L b d']);
 const b=stream(['A 2 4','R 2 0 3 L d 11','R 3 0 4 L b 11']);
 const r=mergeRelationStreams([a,b,a],meta);
 assert.equal(r.rawRelations,4);assert.equal(r.uniqueRelations,3);assert.equal(r.duplicates,1);
 assert.equal(r.full,0);assert.equal(r.partial,3);assert.equal(r.combined,1);
 assert.equal(r.total,1);assert.equal(r.polynomials,2);
});
test('polynomial identity, bounds and compatibility are required before merge',()=>{
 const a=stream(['A 2 3','R 1 0 2 L b d']);
 assert.throws(()=>mergeRelationStreams([{...a,meta:{...meta,input:'91'}}],meta));
 assert.throws(()=>mergeRelationStreams([{...a,meta:{...meta,parameters:'lp75'}}],meta));
 for(const lines of [['R 1 0 2 L b d'],['A 3 2','R 1 0 2 L b d'],['A 2 3','R 1 0 a L b d'],['A 2 3','R 1 0 2 L d b']])assert.throws(()=>mergeRelationStreams([stream(lines)],meta));
 assert.throws(()=>mergeRelationStreams([a,stream(['A 2 3','R 1 0 3 L b d'])],meta),/Conflicting/);
 assert.throws(()=>mergeRelationStreams([a],meta,{maxBytes:4}));
});
