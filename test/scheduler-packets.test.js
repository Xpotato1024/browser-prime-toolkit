// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import test from 'node:test';import assert from 'node:assert/strict';
import {digestPackets,sameFamilies} from '../scripts/scheduler-packets.mjs';
function frame(first,count){const b=Buffer.alloc(16+24*count);b.write('QSV1');b.writeUInt16LE(10,4);b.writeUInt16LE(1,6);b.writeUInt32LE(b.length-12,8);b.writeUInt32LE(count,12);for(let i=0;i<count;i++){const o=16+24*i;b.writeUInt32LE(20,o);b.writeBigUInt64LE(BigInt(first+i),o+4);b.writeBigUInt64LE(2048n,o+12);}return{first,count,base64:b.toString('base64')};}
function value(packets){return{allWorkersDisposed:true,allWorkerSourcesReleased:true,factorBaseSize:10,familiesSubmitted:2,polynomialsSubmitted:4096,rawRelationsSubmitted:0,auditBytes:packets.reduce((n,p)=>n+Buffer.from(p.base64,'base64').length,0)};}
test('actual family body digests are independent of batch grouping and require retired owners',()=>{
 const a=[frame(0,2)],b=[frame(0,1),frame(1,1)],x=digestPackets(a,value(a)),y=digestPackets(b,value(b));assert.deepEqual(x,y);
 assert.throws(()=>digestPackets(a,{...value(a),allWorkersDisposed:false}));
 assert.throws(()=>digestPackets(a,{...value(a),familiesSubmitted:3}));
 assert.throws(()=>digestPackets([...a,...a],value([...a,...a])));
});
test('same-family comparison rejects byte changes even when aggregate counters agree',()=>{
 const a=[frame(0,2)],x=digestPackets(a,value(a));assert.throws(()=>sameFamilies([{familyDigests:x},{familyDigests:x.map(r=>({...r,sha256:'bad'}))}]));
});

test('matching family bytes still require identical shared accepted-prefix graph snapshots',()=>{
 const p=[frame(0,2)],familyDigests=digestPackets(p,value(p));
 const record=n=>({familyDigests,outcome:{events:[{type:'submitted',families:2,relations:1,collectorStats:{full:1,slp:2,dlp:3,cycles:n,usable:1,vertices:4,treeEdges:5,ingested:6}}]}});
 assert.throws(()=>sameFamilies([record(0),record(1)]));
 assert.equal(sameFamilies([record(0),record(0)]).acceptedPrefixes,1);
});
