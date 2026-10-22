// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';
export function schedulerDecision(rows){
 assert.equal(rows.length,12);const keys=new Set();
 for(const r of rows){assert.ok(['batch2','batch1','credit1'].includes(r.scheduler)&&[1,2].includes(r.workers)&&[1,2].includes(r.repeat));const k=[r.scheduler,r.workers,r.repeat].join(':');assert.ok(!keys.has(k));keys.add(k);
  const o=r.outcome;assert.equal(o.kind,'timeout');assert.equal(o.reason,'time-budget');assert.equal(o.allWorkersDisposed,true);assert.equal(o.allWorkerSourcesReleased,true);assert.ok(Number.isSafeInteger(o.relations)&&o.relations>0);
 }
 const find=(s,w,r)=>rows.find(x=>x.scheduler===s&&x.workers===w&&x.repeat===r).outcome;
 const blocked=o=>o.ownerActivity.owners.reduce((n,r)=>n+r.states.blockedIdleMs,0);
 const candidates=['batch1','credit1'].map(name=>{
  const pairs=[1,2].flatMap(workers=>[1,2].map(repeat=>{
   const b=find('batch2',workers,repeat),c=find(name,workers,repeat),need=workers===2?110n:90n;
   const collectionPass=BigInt(c.relations)*100n>=BigInt(b.relations)*need,blockedDeltaMs=blocked(c)-blocked(b);
   assert.ok(Number.isFinite(blockedDeltaMs));
   return{workers,repeat,candidateUsable:c.relations,baselineUsable:b.relations,collectionPass,blockedDeltaMs,blockedPass:workers===1||blockedDeltaMs<=100};
  }));
  const two=pairs.filter(p=>p.workers===2),worst=two.reduce((a,b)=>BigInt(a.candidateUsable)*BigInt(b.baselineUsable)<=BigInt(b.candidateUsable)*BigInt(a.baselineUsable)?a:b);
  return{name,pass:pairs.every(p=>p.collectionPass&&p.blockedPass),minimumTwoOwnerRatio:{numerator:worst.candidateUsable,denominator:worst.baselineUsable},pairs};
 });
 const sorted=candidates.filter(c=>c.pass).sort((a,b)=>{const x=BigInt(a.minimumTwoOwnerRatio.numerator)*BigInt(b.minimumTwoOwnerRatio.denominator),y=BigInt(b.minimumTwoOwnerRatio.numerator)*BigInt(a.minimumTwoOwnerRatio.denominator);return x===y?['batch1','credit1'].indexOf(a.name)-['batch1','credit1'].indexOf(b.name):x>y?-1:1;});
 return{candidate:sorted[0]?.name??null,geometryAuthorized:sorted.length>0,candidates,interpretation:'Collection-only 60 second gate; no completion-time estimate; no default change'};
}
