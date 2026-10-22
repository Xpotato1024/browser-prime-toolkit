// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {WIDE_LIMITS,validateWideTimings,validateWideQuotaTelemetry} from '../src/wide-window/budget.js';
const timing=()=>Object.fromEntries(['prepareMs','sieveMs','copyFreeMs','framingMs','submitMs','observeMs','extractMs'].map(k=>[k,0]));
test('wide timing remains finite and monotone under the one-hour aggregate contract',()=>{
 const t=timing();t.sieveMs=3500000;validateWideTimings(t);
 assert.throws(()=>validateWideTimings({...t,sieveMs:WIDE_LIMITS.maxMs+1}));
 assert.throws(()=>validateWideTimings({...t,sieveMs:NaN}));
 assert.throws(()=>validateWideTimings({...t,sieveMs:1},t));
 assert.throws(()=>validateWideTimings({...t,extractMs:200000}));
});
test('wide quota metadata admits named role bounds and rejects oversized or malformed observations',()=>{
 const row=[1,0,0,0,1,2,65536,640*1048576,832*1048576,0,0,0],q={extracting:true,active:0,refusals:0,preflightRefused:0,stages:[row]};
 assert.equal(validateWideQuotaTelemetry(q),q);
 for(const [index,value]of [[6,2*1024*1048576],[7,640*1048576+1],[8,832*1048576+1],[4,-1],[6,65537]]){
  const r=[...row];r[index]=value;assert.throws(()=>validateWideQuotaTelemetry({...q,stages:[r]}));
 }
 assert.throws(()=>validateWideQuotaTelemetry({...q,stages:Array(25).fill(row)}));assert.throws(()=>validateWideQuotaTelemetry({...q,unknown:true}));
});
