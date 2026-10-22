// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateInput,validatePacket,validateMemory} from '../src/rusqsieve/contracts.js';
test('rusqsieve rejects noncanonical and out-of-profile inputs before allocation',()=>{
 for(const n of ['','0','1','01','+2','2.0',' 2','9'.repeat(101),'1e100'])assert.throws(()=>validateInput(n));
 assert.equal(validateInput('1522605027922533360535618378132637429718068114961380688657908494580122963258952897654000350692006139').bits,330);
});
const packet=()=>{const b=new Uint8Array(40),v=new DataView(b.buffer);b.set([81,83,86,49]);v.setUint16(4,10,true);v.setUint16(6,1,true);v.setUint32(8,28,true);v.setUint32(12,1,true);v.setUint32(16,20,true);v.setBigUint64(20,3n,true);v.setBigUint64(28,0n,true);v.setUint32(36,0,true);return b;};
test('strict ABI6 framing requires exact issued families and complete nested consumption',()=>{
 const b=packet();assert.equal(validatePacket(b,{first:3,count:1,target:100}).families,1);
 for(let n=0;n<b.length;n++)assert.throws(()=>validatePacket(b.subarray(0,n),{first:3,count:1,target:100}));
 assert.throws(()=>validatePacket(new Uint8Array([...b,0]),{first:3,count:1,target:100}));
 assert.throws(()=>validatePacket(b,{first:4,count:1,target:100}));
 const bad=packet();bad[6]=2;assert.throws(()=>validatePacket(bad,{first:3,count:1,target:100}));
});

test('memory telemetry keeps requested sizes separate and rejects nonfinite/over-cap claims',()=>{
 const m={linearBytes:1114112,liveRequested:1,peakRequested:2,allocationFailures:0,lastFailed:0};assert.equal(validateMemory(m),m);
 for(const bad of [{...m,linearBytes:536870912},{...m,liveRequested:3},{...m,peakRequested:NaN},{...m,allocationFailures:-1}])assert.throws(()=>validateMemory(bad));
});
