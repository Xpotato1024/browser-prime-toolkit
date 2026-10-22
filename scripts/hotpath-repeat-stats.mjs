// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
export const REPEAT_GATES=Object.freeze({minimumTimeRatio:.995,referenceT:3.182446305,memoryRatio:1.02,minimumFasterBlocks:3,complexityAllowance:.005});
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const sd=a=>Math.sqrt(a.reduce((s,x)=>s+(x-mean(a))**2,0)/(a.length-1));
const geo=a=>Math.exp(mean(a.map(Math.log)));
function observations(a,maximum){
 assert.ok(Array.isArray(a)&&a.length===2);
 assert.ok(a.every(x=>Number.isFinite(x)&&x>0&&x<=maximum));
 return [...a];
}
function describe(a){return {count:a.length,values:a,mean:mean(a),min:Math.min(...a),max:Math.max(...a),sampleSd:sd(a),sampleCvPct:sd(a)/mean(a)*100};}
export function analyzeCandidate(input){
 assert.ok(Array.isArray(input)&&input.length===4,'Exactly four confirmation blocks');
 const ids=new Set();
 const blocks=input.map(b=>{
  assert.ok(Number.isInteger(b.id)&&b.id>=1&&b.id<=8&&!ids.has(b.id));ids.add(b.id);
  assert.ok(['ABBA','BAAB'].includes(b.order));
  const baselineMs=observations(b.baselineMs,90000),candidateMs=observations(b.candidateMs,90000);
  const baselinePssBytes=observations(b.baselinePssBytes,1536*1048576),candidatePssBytes=observations(b.candidatePssBytes,1536*1048576);
  return {id:b.id,order:b.order,baselineMs,candidateMs,baselinePssBytes,candidatePssBytes,
   timeRatio:mean(candidateMs)/mean(baselineMs),pssRatio:mean(candidatePssBytes)/mean(baselinePssBytes),
   baselineDriftPct:(baselineMs[1]/baselineMs[0]-1)*100,candidateDriftPct:(candidateMs[1]/candidateMs[0]-1)*100};
 });
 assert.equal(blocks.filter(b=>b.order==='ABBA').length,2,'Two blocks of each orientation');
 assert.equal(blocks.filter(b=>b.order==='BAAB').length,2);
 const logs=blocks.map(b=>Math.log(b.timeRatio)),meanLog=mean(logs),sampleSdLog=sd(logs),timeRatio=Math.exp(meanLog);
 // df=3, upper97.5% reference per candidate; two planned candidates.
 // Independence/normality are assumptions, not guaranteed by four serial blocks.
 const referenceUpper=Math.exp(meanLog+REPEAT_GATES.referenceT*sampleSdLog/Math.sqrt(4));
 const pssRatio=geo(blocks.map(b=>b.pssRatio)),fasterBlocks=blocks.filter(b=>b.timeRatio<1).length;
 const orientationRatios=Object.fromEntries(['ABBA','BAAB'].map(order=>[order,geo(blocks.filter(b=>b.order===order).map(b=>b.timeRatio))]));
 const passes={minimumEffect:timeRatio<=REPEAT_GATES.minimumTimeRatio,referenceUpper:referenceUpper<1,bothOrders:Object.values(orientationRatios).every(x=>x<1),consistency:fasterBlocks>=REPEAT_GATES.minimumFasterBlocks,memory:pssRatio<=REPEAT_GATES.memoryRatio};
 return {blocks,timeRatio,pssRatio,meanLog,sampleSdLog,referenceUpper,orientationRatios,fasterBlocks,passes,eligible:Object.values(passes).every(Boolean),
  baseline:describe(blocks.flatMap(b=>b.baselineMs)),candidate:describe(blocks.flatMap(b=>b.candidateMs)),
  referenceAssumptions:'Four fixed serial blocks; df3 t upper97.5% is a planning reference, not guaranteed significance or population confidence.'};
}
export function chooseCandidate(results){
 assert.deepEqual(Object.keys(results).sort(),['prefix','resieve1']);
 for(const r of Object.values(results))assert.ok(typeof r.eligible==='boolean'&&Number.isFinite(r.timeRatio)&&r.timeRatio>0);
 const eligible=Object.entries(results).filter(([,r])=>r.eligible);
 if(!eligible.length)return null;
 if(eligible.length===1)return eligible[0][0];
 const best=Math.min(...eligible.map(([,r])=>r.timeRatio));
 return results.resieve1.timeRatio<=best+REPEAT_GATES.complexityAllowance?'resieve1':'prefix';
}
export function analyzeRepeat(plan,trials){
 assert.equal(plan.id,'llm01-hotpath-repeat-stage44');
 assert.equal(plan.trials.length,32);assert.equal(trials.length,32);assert.equal(plan.blocks.length,8);
 for(let i=0;i<32;i++){
  for(const[k,v]of Object.entries(plan.trials[i]))assert.deepEqual(trials[i][k],v,'Fixed trial field '+k);
  assert.equal(trials[i].state,'completed');assert.equal(trials[i].exitCode,0);assert.equal(trials[i].signal,null);
 }
 const results=Object.fromEntries(['resieve1','prefix'].map(kind=>{
  const blocks=plan.blocks.filter(b=>b.candidate===kind).map(b=>{
   const rows=trials.filter(t=>t.block===b.id);assert.equal(rows.length,4);
   assert.deepEqual(rows.map(t=>t.graph),[...b.order].map(x=>x==='A'?'baseline':kind));
   const a=rows.filter(t=>t.graph==='baseline'),c=rows.filter(t=>t.graph===kind);
   return {id:b.id,order:b.order,baselineMs:a.map(t=>t.summary.requestWallMs),candidateMs:c.map(t=>t.summary.requestWallMs),baselinePssBytes:a.map(t=>t.summary.peakPssBytes),candidatePssBytes:c.map(t=>t.summary.peakPssBytes)};
  });
  return [kind,analyzeCandidate(blocks)];
 }));
 return {results,selection:chooseCandidate(results)};
}
