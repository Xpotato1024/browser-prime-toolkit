// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {LongMemorySampler} from '../scripts/long-window-memory.mjs';
test('observer failure stops calculation but retains the prior RAM evidence and failure reason',async()=>{
 let failureCalls=0,fail=false;
 const read=async p=>{
  if(p==='/proc/1/task/1/children')return '';
  if(p==='/proc/1/smaps_rollup')return 'Rss: 100 kB\nPss: 50 kB\n';
  if(p==='/proc/meminfo'){if(fail)throw Object.assign(Error('observer read failed'),{code:'ENOENT'});return 'MemAvailable: 5120000 kB\n';}
  throw Error(p);
 };
 const s=new LongMemorySampler(1,{read,list:async()=>['1'],windowsDirectory:null,onFailure:async()=>{failureCalls++;}});
 await s.sample();fail=true;await s.start();
 await new Promise(r=>setTimeout(r,20));
 await s.stop();
 const summary=s.summary();assert.equal(failureCalls,1);assert.equal(summary.observerFailure.code,'ENOENT');assert.match(summary.observerFailure.message,/observer read failed/);
 assert.equal(summary.minAvailableMiB,5000);assert.equal(summary.peakRssBytes,102400);assert.equal(s.running,false);
});
