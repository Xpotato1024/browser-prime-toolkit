// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
export function safeOutcome(o){
 return Boolean(o&&o.kind==='timeout'&&o.reason==='time-budget'&&o.allWorkersDisposed===true&&o.allWorkerSourcesReleased===true&&o.peakTransportBytes<=33554432&&[2,4].includes(o.workers)&&o.maximumWasmBytes===(256+64*(o.workers-1))*1048576&&!o.fatal&&o.relations===o.collectorStats?.usable&&Number.isSafeInteger(o.relations)&&o.relations>=0);
}
export function pairedDecision(records,{baseline,candidate,label}){
 assert.equal(records.length,4);const ids=new Set(),pairs=[];
 for(const r of records){assert.ok(!ids.has(r.id));ids.add(r.id);assert.ok([1,2].includes(r.repeat));assert.ok([baseline,candidate].includes(label(r)));assert.equal(r.workers,r.outcome.workers);}
 for(const repeat of [1,2]){
  const select=v=>{const a=records.filter(r=>r.repeat===repeat&&label(r)===v);assert.equal(a.length,1);return a[0];};
  const b=select(baseline),c=select(candidate);assert.ok(Number.isSafeInteger(b.outcome.relations)&&b.outcome.relations>0);assert.ok(Number.isSafeInteger(c.outcome.relations)&&c.outcome.relations>=0);
  const safe=safeOutcome(b.outcome)&&safeOutcome(c.outcome),qualifies=safe&&BigInt(c.outcome.relations)*100n>=BigInt(b.outcome.relations)*110n;
  pairs.push({repeat,baselineUsable:b.outcome.relations,candidateUsable:c.outcome.relations,safe,qualifies});
 }
 return{baseline,candidate,minimumRatio:'110/100',pairs,qualifies:pairs.every(p=>p.qualifies),automaticAdoption:false,claim:'collection yield only'};
}
export function grownCancelSafe(r){
 const o=r?.outcome,t=r?.progressTimeline;
 if(!o||!Array.isArray(t)||t.length<2||r.cancelAfterMs!==120000||!Number.isFinite(r.cancelToRetirementMs)||r.cancelToRetirementMs<0||r.cancelToRetirementMs>2000||!Number.isFinite(r.cancelRequestedAtMs)||r.cancelRequestedAtMs<119000||r.cancelRequestedAtMs>121000||o.kind!=='cancelled'||!o.allWorkersDisposed||!o.allWorkerSourcesReleased||!Number.isSafeInteger(o.familiesSubmitted)||o.familiesSubmitted<4||!Number.isFinite(o.requestWallMs)||o.requestWallMs<119000||o.requestWallMs>122000||o.fatal)return false;
 const first=t[0]?.collectorStats,last=t.at(-1)?.collectorStats,keys=['ingested','vertices','treeEdges','cycles'];
 if(!first||!last||!o.collectorStats||!keys.every(k=>Number.isSafeInteger(first[k])&&first[k]>=0&&Number.isSafeInteger(last[k])&&last[k]>=0&&last[k]===o.collectorStats[k]))return false;
 return last.ingested>first.ingested&&['vertices','treeEdges','cycles'].some(k=>last[k]>first[k]);
}
export function extensionGate({records,cancels,availableMiB,now}){
 const reasons=[];let decision;
 try{decision=pairedDecision(records,{baseline:'2',candidate:'4',label:r=>String(r.workers)});if(!decision.qualifies)reasons.push('paired-300s-gain-or-safety');}catch{reasons.push('missing-or-invalid-300s-data');}
 const cancelSafe=Array.isArray(cancels)&&cancels.length===2&&[2,4].every(w=>cancels.filter(r=>r.workers===w).length===1)&&cancels.every(grownCancelSafe);
 if(!cancelSafe)reasons.push('grown-cancel-safety');
 if(!records.every(r=>{const p=r.outcome.memoryByOwner.find(m=>m.owner===0)?.peakLinearBytes;return Number.isInteger(p)&&p>0&&p<=192*1048576;}))reasons.push('coordinator-linear-headroom');
 if(!Number.isFinite(availableMiB)||availableMiB<4096)reasons.push('available-host-memory');
 if(!Number.isFinite(Date.parse(now))||Date.parse(now)>=Date.parse('2026-10-20T20:30:00Z'))reasons.push('extension-start-window');
 return{eligible:reasons.length===0,reasons,availableMiB,checkedAt:now,decision:decision??null};
}
