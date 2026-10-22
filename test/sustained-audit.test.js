// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';import assert from 'node:assert/strict';
import {StreamingPacketAudit} from '../src/sustained/packet-audit.js';
import {digestPackets} from '../scripts/scheduler-packets.mjs';
function frame(first,count=1){const b=Buffer.alloc(16+24*count);b.write('QSV1');b.writeUInt16LE(10,4);b.writeUInt16LE(1,6);b.writeUInt32LE(b.length-12,8);b.writeUInt32LE(count,12);for(let i=0;i<count;i++){const o=16+24*i;b.writeUInt32LE(20,o);b.writeBigUInt64LE(BigInt(first+i),o+4);b.writeBigUInt64LE(2048n,o+12);}return b;}
test('streamed SHA256 equals old body proof across batch grouping and detached transfer',async()=>{
 const a=new StreamingPacketAudit(true),b=frame(0,2);a.add({first:0,count:2},b);
 structuredClone(b.buffer,{transfer:[b.buffer]});
 const r=await a.finish();const raw=frame(0,2);
 const old=digestPackets([{first:0,count:2,base64:raw.toString('base64')}],{allWorkersDisposed:true,allWorkerSourcesReleased:true,factorBaseSize:10,familiesSubmitted:2,polynomialsSubmitted:4096,rawRelationsSubmitted:0,auditBytes:raw.length});
 assert.deepEqual(r.families.map(x=>({...x,acknowledged:true})),old);assert.equal(r.pendingBytes,0);assert.equal(a.bytes,0);assert.deepEqual(a.packets,[]);
});
function largeFrame(first){const count=32768,length=20+count*8,b=Buffer.alloc(20+length);b.write('QSV1');b.writeUInt16LE(10,4);b.writeUInt16LE(1,6);b.writeUInt32LE(b.length-12,8);b.writeUInt32LE(1,12);b.writeUInt32LE(length,16);b.writeBigUInt64LE(BigInt(first),20);b.writeBigUInt64LE(2048n,28);b.writeUInt32LE(count,36);return b;}
test('streaming releases inputs beyond old8MiB cumulative retention without losing early family hashes',async()=>{
 const a=new StreamingPacketAudit(true);let total=0;
 for(let i=0;i<40;i++){const b=largeFrame(i);a.add({first:i,count:1},b);total+=b.length;if(i%4===3)await a.flush();}
 const r=await a.finish();assert.equal(r.families.length,40);assert.equal(r.totalPacketBytes,total);assert.ok(total>8388608);assert.ok(r.peakPendingBytes<=8388608);assert.ok(r.peakPendingCalls<=4);
});
test('duplicate family and bounded digest concurrency fail closed',async()=>{
 let release;const wait=new Promise(r=>release=r),a=new StreamingPacketAudit(true,{digest:async()=>{await wait;return new Uint8Array(32).buffer;}});
 for(let i=0;i<4;i++)a.add({first:i,count:1},frame(i));
 assert.throws(()=>a.add({first:0,count:1},frame(0)),/Duplicate/);
 assert.throws(()=>a.add({first:4,count:1},frame(4)),/pending/);
 release();await a.finish();assert.throws(()=>a.add({first:5,count:1},frame(5)),/sealed/);
});
test('digest rejection is retained and cannot produce a successful proof',async()=>{
 const a=new StreamingPacketAudit(true,{digest:async()=>{throw Error('hash failure');}});
 a.add({first:0,count:1},frame(0));await assert.rejects(a.finish(),/hash failure/);
});
