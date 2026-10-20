// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validatePacket,packetEnvelope} from '../src/rusqsieve/contracts.js';
export function digestPackets(packets,outcome){
 assert.equal(outcome.allWorkersDisposed,true);assert.equal(outcome.allWorkerSourcesReleased,true);
 assert.ok(Array.isArray(packets)&&packets.length<=1024);
 let total=0;const rows=[],seen=new Set();
 for(const p of packets){
  assert.ok(typeof p.base64==='string'&&p.base64.length<=11184812);
  const bytes=Buffer.from(p.base64,'base64');assert.equal(bytes.toString('base64'),p.base64);
  total+=bytes.length;assert.ok(total<=8388608);
  validatePacket(bytes,{first:p.first,count:p.count,target:outcome.factorBaseSize});
  const b=packetEnvelope(bytes,10),v=new DataView(b.buffer,b.byteOffset,b.byteLength);let o=4;
  for(let i=0;i<p.count;i++){
   const len=v.getUint32(o,true);o+=4;const family=p.first+i;
   assert.ok(!seen.has(family));seen.add(family);
   rows.push({family,bytes:len,sha256:createHash('sha256').update(b.subarray(o,o+len)).digest('hex'),
    polynomials:Number(v.getBigUint64(o+8,true)),rawRelations:v.getUint32(o+16,true),acknowledged:family<outcome.familiesSubmitted});o+=len;
  }
 }
 assert.equal(total,outcome.auditBytes);rows.sort((a,b)=>a.family-b.family);
 for(let i=0;i<outcome.familiesSubmitted;i++)assert.equal(rows[i]?.family,i,'Accepted prefix captured');
 const accepted=rows.filter(r=>r.acknowledged);
 assert.equal(accepted.reduce((n,r)=>n+r.polynomials,0),outcome.polynomialsSubmitted);
 assert.equal(accepted.reduce((n,r)=>n+r.rawRelations,0),outcome.rawRelationsSubmitted);
 return rows;
}
export function sameFamilies(records,{fixed=false}={}){
 const expected=new Map(),prefixes=new Map();
 for(const record of records){
  const rows=record.familyDigests;
  assert.ok(rows.length>0);
  if(fixed){assert.equal(record.outcome.reason,'fixed-family-bound');assert.equal(record.outcome.familiesSubmitted,4);assert.deepEqual(rows.map(r=>r.family),[0,1,2,3]);}
  for(const e of record.outcome?.events??[])if(e.type==='submitted'){const snapshot={relations:e.relations,collectorStats:e.collectorStats};if(prefixes.has(e.families))assert.deepEqual(snapshot,prefixes.get(e.families),'Native accepted-prefix counters '+e.families);else prefixes.set(e.families,snapshot);}
  for(const row of rows){const value={...row};delete value.acknowledged;
   if(expected.has(row.family))assert.deepEqual(value,expected.get(row.family),'Deterministic native family '+row.family);
   else expected.set(row.family,value);
  }
 }
 if(fixed){const x=records[0].outcome;for(const r of records)for(const key of ['collectorStats','relations','polynomialsSubmitted','rawRelationsSubmitted','bytesSubmitted'])if(key!=='bytesSubmitted')assert.deepEqual(r.outcome[key],x[key],key);}
 return{families:expected.size,records:records.length,acceptedPrefixes:prefixes.size,verified:true};
}
