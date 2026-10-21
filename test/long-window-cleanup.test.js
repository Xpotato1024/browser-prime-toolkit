// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
const legacy=async({retireChrome,clearWatchdog,stopMemory,closeTransport})=>{clearWatchdog();await stopMemory();await retireChrome();await closeTransport();};
const {createChromeRetirement,cleanupLongHarness}=process.env.PRIME_LONG_CLEANUP_RED==='1'?{cleanupLongHarness:legacy}:await import('../scripts/long-window-cleanup.mjs');
test('observer shutdown rejection still retires owned Chrome and closes transport',async()=>{
 const calls=[];
 await assert.rejects(cleanupLongHarness({retireChrome:async()=>{calls.push('retire');},clearWatchdog:()=>calls.push('clear'),stopMemory:async()=>{calls.push('memory');throw Error('observer-failed');},closeTransport:async()=>{calls.push('transport');}}),/observer-failed/);
 assert.deepEqual(calls,['retire','clear','memory','transport']);
});
if(createChromeRetirement){
 test('owned group is retired even after leader exits',async()=>{
  const calls=[];let alive=true;
  const retire=createChromeRetirement(()=>({pid:123,exitCode:0}),{platform:'linux',kill:(pid,signal)=>{calls.push([pid,signal]);if(signal==='SIGTERM')alive=false;if(!alive&&signal===0)throw Object.assign(Error('gone'),{code:'ESRCH'});}});
  await retire();await retire();assert.ok(calls.some(x=>x[0]===-123&&x[1]==='SIGTERM'));assert.equal(calls.filter(x=>x[1]==='SIGTERM').length,1);
 });
 test('unresponsive owned group receives bounded SIGKILL escalation',async()=>{
  const calls=[];let alive=true,time=0;
  const retire=createChromeRetirement(()=>({pid:456,exitCode:0}),{platform:'linux',now:()=>time,wait:async ms=>{time+=ms;},kill:(pid,signal)=>{calls.push([pid,signal]);if(signal==='SIGKILL')alive=false;if(!alive&&signal===0)throw Object.assign(Error('gone'),{code:'ESRCH'});}});
  await retire();assert.deepEqual(calls.filter(x=>typeof x[1]==='string'),[[-456,'SIGTERM'],[-456,'SIGKILL']]);assert.ok(time>=2000&&time<=4000);
 });
}
