// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePacket} from '../src/rusqsieve/contracts.js';
function packet(){const b=new Uint8Array(61),v=new DataView(b.buffer);b.set([81,83,86,49]);v.setUint16(4,10,true);v.setUint16(6,1,true);v.setUint32(8,49,true);v.setUint32(12,1,true);v.setUint32(16,41,true);v.setBigUint64(20,3n,true);v.setBigUint64(28,1n,true);v.setUint32(36,1,true);v.setUint16(40,1,true);b[42]=1;v.setUint32(45,2,true);v.setUint32(49,9,true);v.setUint16(53,1,true);v.setUint32(55,0,true);v.setUint16(59,2,true);return b;}
test('upstream nonascending powers are accepted; duplicates and FB boundary are rejected',()=>{
 const b=packet(),issued={first:3,count:1,target:10};assert.equal(validatePacket(b,issued).relations,1);
 const duplicate=packet();new DataView(duplicate.buffer).setUint32(55,9,true);assert.throws(()=>validatePacket(duplicate,issued));
 const overflow=packet();new DataView(overflow.buffer).setUint32(49,10,true);assert.throws(()=>validatePacket(overflow,issued));
});
