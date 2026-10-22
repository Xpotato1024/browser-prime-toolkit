// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeCandidate,chooseCandidate} from '../scripts/hotpath-repeat-stats.mjs';
const sample=(ratios=[.98,.981,.979,.98],pss=1)=>ratios.map((ratio,i)=>({
 id:i+1,order:i%2?'BAAB':'ABBA',
 baselineMs:[100,103],candidateMs:[101*ratio,102*ratio],
 baselinePssBytes:[100000000,100000000],candidatePssBytes:[100000000*pss,100000000*pss]
}));
test('balanced short blocks retain a stable improvement and all raw observations',()=>{
 const r=analyzeCandidate(sample());
 assert.ok(r.eligible);assert.ok(r.timeRatio>.979&&r.timeRatio<.981);
 assert.ok(r.referenceUpper<1);assert.equal(r.fasterBlocks,4);
 assert.equal(r.baseline.count,8);assert.equal(r.candidate.count,8);assert.equal(r.blocks.length,4);
 assert.ok(r.orientationRatios.ABBA<1&&r.orientationRatios.BAAB<1);
});
test('no effect does not qualify despite zero between-block variance',()=>{
 const r=analyzeCandidate(sample([1,1,1,1]));
 assert.equal(r.eligible,false);assert.equal(r.passes.minimumEffect,false);assert.equal(r.passes.referenceUpper,false);
});
test('favorable mean with unstable blocks does not qualify',()=>{
 const r=analyzeCandidate(sample([.96,.96,1.03,.99]));
 assert.ok(r.timeRatio<.995);assert.equal(r.passes.referenceUpper,false);assert.equal(r.eligible,false);
});
test('opposite order effects cannot qualify on an averaged speedup',()=>{
 const r=analyzeCandidate(sample([.96,1.01,.96,1.01]));
 assert.ok(r.timeRatio<.995);assert.equal(r.passes.bothOrders,false);assert.equal(r.eligible,false);
});
test('PSS growth above the predeclared tradeoff rejects an otherwise stable gain',()=>{
 const r=analyzeCandidate(sample([.98,.981,.979,.98],1.025));
 assert.equal(r.passes.memory,false);assert.equal(r.eligible,false);
});
test('invalid observations, missing order, and duplicate block cannot enter analysis',()=>{
 for(const mutate of [
  x=>x.pop(),
  x=>{x[1].order='ABBA';},
  x=>{x[1].id=x[0].id;},
  x=>{x[0].candidateMs[0]=NaN;},
  x=>{x[0].candidateMs[1]=0;},
  x=>{x[0].baselinePssBytes[0]=Infinity;}
 ]){
  const x=sample();mutate(x);assert.throws(()=>analyzeCandidate(x));
 }
});
test('selection rewards the constant-only candidate within half a percentage point',()=>{
 const coefficient=analyzeCandidate(sample()),prefix=analyzeCandidate(sample([.977,.978,.976,.977]));
 assert.equal(chooseCandidate({resieve1:coefficient,prefix}),'resieve1');
 const muchFaster=analyzeCandidate(sample([.968,.969,.967,.968]));
 assert.equal(chooseCandidate({resieve1:coefficient,prefix:muchFaster}),'prefix');
 assert.equal(chooseCandidate({resieve1:analyzeCandidate(sample([1,1,1,1])),prefix}),'prefix');
 assert.equal(chooseCandidate({resieve1:analyzeCandidate(sample([1,1,1,1])),prefix:analyzeCandidate(sample([1,1,1,1]))}),null);
});
