// SPDX-License-Identifier: AGPL-3.0-only
import test from'node:test';import assert from'node:assert/strict';import{summarizeCpuProfile}from'../scripts/graph-cpu-summary.mjs';
const node=(id,name,children=[])=>({id,callFrame:{functionName:name,url:'wasm://local'},children});
test('sampling separates self and inclusive observations',()=>{
 const r=summarizeCpuProfile({nodes:[node(1,'root',[2]),node(2,'caller',[3]),node(3,'hot')],samples:[3,3,3,2],startTime:0,endTime:4000});
 assert.equal(r.sampleCount,4);assert.equal(r.top.find(r=>r.functionName==='hot').selfPercent,75);assert.equal(r.top.find(r=>r.functionName==='caller').inclusivePercent,100);assert.ok(r.top.length<=64);
});
test('unknown samples and cyclic parent links fail closed',()=>{
 for(const p of [{nodes:[node(1,'root')],samples:[2]},{nodes:[node(1,'a',[2]),node(2,'b',[1])],samples:[1]}])assert.throws(()=>summarizeCpuProfile({...p,startTime:0,endTime:1000}));
});

test("actual capture over 25 seconds fails closed",()=>{assert.throws(()=>summarizeCpuProfile({nodes:[node(1,"root")],samples:[1],startTime:0,endTime:25000001}));});
