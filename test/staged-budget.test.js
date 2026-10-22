import test from 'node:test';
import assert from 'node:assert/strict';
import {Budget,normalizeOptions} from '../src/engine/options.js';
import {makeStagePool} from '../src/engine/staged-budget.js';
import {selectStagedPlan} from '../src/engine/staged-plan.js';
function setup(){let time=0;const root=new Budget(normalizeOptions({algorithm:'siqs',operationBudget:100,timeBudgetMs:1000}),()=>time,()=>{});return{root,advance:ms=>time+=ms};}
test('stage grants share global operations across calls and retain budget identity',()=>{
 const s=setup(),p=makeStagePool(s.root,'brent',{operations:5,timeMs:20});let identity;
 s.root.tick();p.run(b=>{identity=b;b.tick();b.tick();s.advance(4);});
 s.root.tick();p.run(b=>{assert.equal(b,identity);b.tick();b.tick();b.tick();assert.throws(()=>b.tick(),/operation-budget/);});
 assert.equal(s.root.operations,7);assert.equal(p.stats().operations,5);assert.equal(p.available(),false);
});
test('stage clock spending does not reset; root expiry remains distinguishable',()=>{
 const s=setup(),p=makeStagePool(s.root,'ecm',{operations:50,timeMs:20});
 p.run(b=>{b.tick();s.advance(12);});p.run(b=>{s.advance(9);assert.throws(()=>b.tick(),/time-budget/);});
 assert.ok(p.stats().elapsedMs>=21);assert.equal(p.available(),false);
 s.advance(1000);assert.throws(()=>s.root.tick(),/time-budget/);
});
test('finite plans reject larger inputs and account for all backend memories',()=>{
 const small=selectStagedPlan('10403',{mode:'p64'});assert.equal(small.workers,1);assert.equal(small.linearMemoryBytes,0);
 const a=selectStagedPlan((1n<<80n).toString(),{mode:'p64'}),b=selectStagedPlan(((1n<<80n)-1n).toString(),{mode:'p80'});
 assert.equal(a.linearMemoryBytes,134217728);assert.equal(b.linearMemoryBytes,0);
 assert.throws(()=>selectStagedPlan((1n<<128n).toString()),/range/);
 assert.throws(()=>selectStagedPlan('10403',{mode:'unknown'}),/mode/);
});
