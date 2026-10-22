// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWideMemory} from '../src/wide-window/memory.js';
import {validateMemory} from '../src/rusqsieve/contracts.js';
const memory=linearBytes=>({linearBytes,liveRequested:1,peakRequested:2,allocationFailures:0,lastFailed:0});
test('wide role memory accepts exact hardcaps without changing ordinary telemetry',()=>{
 for(const cap of [64,1024])assert.equal(validateWideMemory(memory(cap*1048576),cap).linearBytes,cap*1048576);
 assert.throws(()=>validateMemory(memory(257*1048576)));
 assert.throws(()=>validateWideMemory(memory(64*1048576),256));
});
test('wide role telemetry rejects malformed or impossible requested memory',()=>{
 for(const value of [null,memory(1024*1048576+65536),memory(1114111),memory(257*1048576+1),{...memory(257*1048576),peakRequested:NaN},{...memory(257*1048576),liveRequested:3},{...memory(257*1048576),peakRequested:258*1048576},{...memory(257*1048576),lastFailed:4294967296}])assert.throws(()=>validateWideMemory(value,1024));
});
