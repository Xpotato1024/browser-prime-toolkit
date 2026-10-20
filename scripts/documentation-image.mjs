// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
export function documentationImage(path,bytes) {
 if(!/^docs\/benchmarks\/.+\.png$/.test(path))return false;
 assert.ok(bytes.length>=45,'Truncated documentation PNG '+path);
 assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Documentation PNG signature '+path);
 assert.equal(bytes.readUInt32BE(8),13);assert.equal(bytes.toString('ascii',12,16),'IHDR');
 assert.ok(bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(16)<=16384);assert.ok(bytes.readUInt32BE(20)>0&&bytes.readUInt32BE(20)<=16384);
 assert.ok(bytes.subarray(-12).equals(Buffer.from([0,0,0,0,73,69,78,68,174,66,96,130])),'Documentation PNG end '+path);
 return true;
}
