import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupplementSplit } from '../src/engine/supplement.js';
import { factorInteger } from '../src/engine/factor.js';
import { Budget, BudgetExceeded, normalizeOptions } from '../src/engine/options.js';
const options={algorithm:'gmp-ecm',seed:1,timeBudgetMs:10000,operationBudget:50000000};
test('p−1 bounded base finds favorable factor and reports no proper gcd=n factor',async()=>{
  const split=await createSupplementSplit({method:'pm1',base:2});
  const yes=factorInteger(1009n*1000003n,options,{splitAdvanced:split});
  assert.equal(yes.status,'complete');assert.deepEqual(yes.factors.map(f=>f.value),['1009','1000003']);
  const no=factorInteger(1009n*1013n,options,{splitAdvanced:split});
  assert.equal(no.status,'incomplete');assert.equal(no.reason,'algorithm-exhausted');
  assert.equal(split.stats().poisoned,false);
});
test('same 32 sigma schedule partitions without overlap and rejects bad lanes',async()=>{
  const one=await createSupplementSplit(),a=await createSupplementSplit({lane:0,workers:2}),b=await createSupplementSplit({lane:1,workers:2});
  const n=(1n<<127n)-1n;
  const run=s=>{const budget=new Budget(normalizeOptions({...options,timeBudgetMs:10000}),()=>0,()=>{});s(n,budget,options);return s.stats();};
  const full=run(one),left=run(a),right=run(b);
  assert.deepEqual(left.sigma,right.sigma);assert.deepEqual(left.sigma,full.sigma);
  assert.equal(new Set(full.sigma).size,32);assert.equal(full.usedMask,4294967295);
  assert.equal((left.usedMask&right.usedMask)>>>0,0);assert.equal((left.usedMask|right.usedMask)>>>0,4294967295);
  assert.equal(left.curves,16);assert.equal(right.curves,16);
  await assert.rejects(createSupplementSplit({lane:2,workers:2}),/partition/);
});
test('zero operation budget stops normally and leaves reusable instance',async()=>{
  const split=await createSupplementSplit();const b={tick(){throw new BudgetExceeded('operation-budget');}};
  assert.throws(()=>split(10403n,b,options),/operation-budget/);
  assert.equal(split.stats().poisoned,false);
  assert.equal(factorInteger(10403n,options,{splitAdvanced:split}).status,'complete');
});
test('fatal stage2 trap retires the supplementary instance',async()=>{
  const split=await createSupplementSplit();
  split.configureAudit({trap:1});
  assert.throws(()=>factorInteger(392318858461667547569595655490009919272404068553904357377n,options,{splitAdvanced:split}));
  assert.equal(split.stats().poisoned,true);
  assert.throws(()=>factorInteger(10403n,options,{splitAdvanced:split}),/retired/);
});
test('a job reserves each curve before success, across residual calls',async()=>{
  for(const workers of [1,2])for(let lane=0;lane<workers;lane++){
    const split=await createSupplementSplit({workers,lane});
    const budget=new Budget(normalizeOptions(options),()=>0,()=>{});
    let previous=0,previousCurves=0;
    for(let i=0;i<40;i++){
      split(10403n,budget,options);const now=split.stats();
      const bits=now.usedMask.toString(2).replaceAll('0','').length;
      assert.equal(now.curves,bits,'no duplicate sigma on the same budget');
      assert.ok(now.curves>=previousCurves&&now.curves<=32/workers);
      assert.equal((previous&now.usedMask)>>>0,previous);
      previous=now.usedMask;previousCurves=now.curves;
    }
    assert.equal(previousCurves,32/workers);
  }
});
