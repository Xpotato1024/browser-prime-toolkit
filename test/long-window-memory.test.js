// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {LongMemorySampler} from '../scripts/long-window-memory.mjs';
function sampler({available=5000,windowsAvailable=6000,age=0,missing=false}={}){
 let failures=0;
 const read=async path=>{
  if(path==='/proc/1/task/1/children')return '';
  if(path==='/proc/1/smaps_rollup')return 'Rss: 100 kB\nPss: 50 kB\n';
  if(path==='/proc/meminfo')return 'MemAvailable: '+available*1024+' kB\n';
  if(path==='windows.json'){if(missing)throw Error('Missing monitor');return JSON.stringify({host:'LLM-01',checkedAt:new Date(Date.now()-age).toISOString(),availableMiB:windowsAvailable});}
  throw Error('Unexpected RAM path '+path);
 };
 const s=new LongMemorySampler(1,{read,list:async()=>['1'],windowsPath:'windows.json',onFailure:async()=>{failures++;}});
 return {s,failures:()=>failures};
}
test('resource sampler distinguishes requested metrics and detects low host availability',async()=>{
 for(const [available,windowsAvailable,reason] of [[3000,6000,'wsl-available-memory'],[5000,3000,'windows-available-memory']]){
  const {s}=sampler({available,windowsAvailable}),r=await s.sample();
  assert.equal(r.availableMiB,available);assert.equal(r.windowsAvailableMiB,windowsAvailable);assert.equal(r.stopReason,reason);
  assert.equal(r.rssBytes,100*1024);assert.equal(r.pssBytes,50*1024);assert.equal(s.intervalMs,500);
 }
});
test('missing or stale host observation fails closed and invokes stop callback',async()=>{
 for(const settings of [{age:31000},{missing:true}]){
  const {s,failures}=sampler(settings);await assert.rejects(s.sample());assert.equal(failures(),1);
 }
});
test('RAM observation retention is finite before another sample is collected',async()=>{
 const {s,failures}=sampler();s.samples=Array(5000).fill(null);
 await assert.rejects(s.sample(),/retention cap/);assert.equal(s.samples.length,5000);assert.equal(failures(),1);
});
