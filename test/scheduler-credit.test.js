// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import test from 'node:test';
import assert from 'node:assert/strict';
import {CreditLedger,schedulerProfile} from '../src/rusqsieve-scheduler/credits.js';
const packet=(n=32)=>({buffer:new ArrayBuffer(n),stats:{relations:1,polynomials:2048}});
test('only frozen scheduler names and one/two owners allocate credit',()=>{
 for(const x of ['__proto__','constructor','other',1,null])assert.throws(()=>schedulerProfile(x));
 for(const w of [0,3,1.5])assert.throws(()=>new CreditLedger(w,'credit1',250000));
});
test('batch2 preserves original two-family acknowledgement barrier',()=>{
 const l=new CreditLedger(2,'batch2',250000),a=l.issue(0),b=l.issue(1);
 assert.deepEqual([a.first,a.count,b.first,b.count],[0,2,2,2]);
 l.returned(1,b,packet());assert.equal(l.issue(1),null);assert.equal(l.beginSubmission(),null);
 l.returned(0,a,packet());assert.equal(l.beginSubmission().first,0);l.ack(a.jobId);
 assert.equal(l.issue(0).first,4);assert.equal(l.beginSubmission().first,2);l.ack(b.jobId);
 assert.equal(l.submitted,4);assert.equal(l.peakOutstanding,4);
});
test('credit1 starts the waiting producer while the coordinator still has older work',()=>{
 const l=new CreditLedger(2,'credit1',250000),a=l.issue(0),b=l.issue(1);
 l.returned(0,a,packet());l.beginSubmission();l.ack(a.jobId);const c=l.issue(0);
 l.returned(1,b,packet());const d=l.issue(1);assert.equal(d.first,3);
 assert.equal(l.issue(1),null);l.returned(0,c,packet());assert.equal(l.beginSubmission().first,1);l.ack(b.jobId);
 assert.equal(l.active[1].jobId,d.jobId,'old ack must preserve the newer active producer job');
 assert.equal(l.owned[1],1);assert.equal(l.submitted,2);assert.ok(l.issued-l.submitted<=4);
});
test('batch1 does not grant ahead credit',()=>{
 const l=new CreditLedger(2,'batch1',250000),a=l.issue(0),b=l.issue(1);
 l.returned(1,b,packet());assert.equal(l.issue(1),null);l.returned(0,a,packet());l.beginSubmission();l.ack(a.jobId);
 assert.equal(l.issue(1),null);l.beginSubmission();l.ack(b.jobId);assert.equal(l.issue(1).count,1);
});
test('duplicate, unissued, wrong-owner and out-of-prefix acknowledgements fail closed',()=>{
 const l=new CreditLedger(2,'credit1',250000),a=l.issue(0);
 assert.throws(()=>l.returned(1,a,packet()));assert.throws(()=>l.ack(a.jobId));
 l.returned(0,a,packet());assert.throws(()=>l.returned(0,a,packet()));l.beginSubmission();
 assert.throws(()=>l.ack(99));assert.equal(l.submitted,0);l.ack(a.jobId);assert.throws(()=>l.ack(a.jobId));
});
test('finite family and byte credits reject before mutation, including transferred buffers',()=>{
 const l=new CreditLedger(2,'batch2',4),a=l.issue(0);l.returned(0,a,packet(16777216));
 const b=l.issue(1);assert.equal(l.issue(0),null);l.returned(1,b,packet(16777216));
 assert.equal(l.transport,33554432);const x=l.beginSubmission();
 structuredClone(x.buffer,{transfer:[x.buffer]});l.ack(x.jobId);assert.equal(l.transport,16777216);
 l.beginSubmission();l.ack(b.jobId);assert.equal(l.transport,0);assert.equal(l.issue(0),null);
 const bad=new CreditLedger(1,'batch1',2),j=bad.issue(0);assert.throws(()=>bad.returned(0,j,packet(16777217)));
 assert.equal(bad.transport,0);assert.equal(bad.active[0].first,0);
});

test('ahead computation reserves every outstanding packet within32MiB before dispatch',()=>{
 const l=new CreditLedger(2,'credit1',4),a=l.issue(0),b=l.issue(1);
 assert.equal(a.packetBytes,8388608);assert.equal(l.reservedBytes,16777216);
 assert.throws(()=>l.returned(0,a,packet(8388609)));assert.equal(l.transport,0);
 l.returned(0,a,packet());l.returned(1,b,packet());l.issue(0);l.issue(1);
 assert.equal(l.reservedBytes,33554432);assert.equal(l.peakReserved,33554432);
 assert.equal(l.issue(0),null);assert.equal(l.issue(1),null);
});

test('producer metadata cannot overwrite issued prefix, owner or byte reservation',()=>{
 const l=new CreditLedger(2,'credit1',4),a=l.issue(0);
 const item=l.returned(0,a,{...packet(),first:999,count:99,owner:1,jobId:88,packetBytes:0});
 assert.deepEqual([item.first,item.count,item.owner,item.jobId,item.packetBytes],[0,1,0,0,8388608]);
 const newer=l.issue(0);assert.equal(l.beginSubmission().first,0);l.ack(a.jobId);
 assert.equal(l.active[0].jobId,newer.jobId);assert.equal(l.owned[0],1);
 assert.equal(l.reservedBytes,8388608);assert.equal(l.submitted,1);
});
