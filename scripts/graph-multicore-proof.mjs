// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
export function validateStreamRecord(record){
 const o=record.outcome,a=record.streamAudit,rows=record.familyDigests;
 assert.equal(o.allWorkersDisposed,true);assert.equal(o.allWorkerSourcesReleased,true);assert.equal(o.auditBytes,0);
 assert.equal(a.enabled,true);assert.equal(a.retainedRawBytes,0);assert.equal(a.pendingBytes,0);assert.ok(a.peakPendingBytes<=16777216);assert.ok(a.peakPendingCalls<=8);
 assert.ok(Array.isArray(rows)&&rows.length<=4096);assert.equal(a.packetCount,rows.length);
 let previous=-1;for(const r of rows){assert.ok(Number.isSafeInteger(r.family)&&r.family>previous);previous=r.family;assert.match(r.sha256,/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(r.bytes)&&r.bytes>=20);assert.equal(r.acknowledged,r.family<o.familiesSubmitted);}
 const accepted=rows.filter(r=>r.acknowledged);assert.equal(accepted.length,o.familiesSubmitted);for(let i=0;i<accepted.length;i++)assert.equal(accepted[i].family,i);
 assert.equal(accepted.reduce((n,r)=>n+r.polynomials,0),o.polynomialsSubmitted);assert.equal(accepted.reduce((n,r)=>n+r.rawRelations,0),o.rawRelationsSubmitted);
 assert.equal(accepted.reduce((n,r)=>n+r.bytes+20,0),o.bytesSubmitted);assert.equal(rows.reduce((n,r)=>n+r.bytes+20,0),a.totalPacketBytes);
 const t=record.progressTimeline;assert.ok(Array.isArray(t)&&t.length<=4096);assert.equal(t.length,o.familiesSubmitted);
 let at=-1;for(let i=0;i<t.length;i++){assert.equal(t[i].families,i+1);assert.ok(t[i].atMs>=at&&t[i].atMs<=o.requestWallMs+100);at=t[i].atMs;assert.equal(t[i].relations,t[i].collectorStats.usable);}
 if(t.length){assert.deepEqual(t.at(-1).collectorStats,o.collectorStats);assert.equal(t.at(-1).relations,o.relations);}
 assert.ok(Number.isFinite(record.hashFlushMs)&&record.hashFlushMs>=0&&record.hashFlushMs<=10000);
 return true;
}
