// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {runRusqsieve} from '../src/long-window/runner.js';
import {selectResourcePlan} from '../src/long-window/policy.js';
import {longWorkerSource} from '../src/long-window/worker-source.js';
import {optimizedWorkerSource} from '../src/optimized/worker-source.js';
const input='8156172677439289108635319830552518815109';
async function run({transform=s=>s,workers=2,timeBudgetMs=30000,signal,onProgress}={}){
 const active=new Set(),exits=[],commands=[];let released=0,created=0;
 const createWorker=(index,cap)=>{
  const source=transform((process.env.PRIME_LONG_WORKER_RED==='1'?optimizedWorkerSource:longWorkerSource)(cap),index);
  const prefix="const{parentPort}=require('node:worker_threads');globalThis.onmessage=null;globalThis.postMessage=(data,transfer=[])=>parentPort.postMessage(data,transfer);parentPort.on('message',data=>globalThis.onmessage({data}));\n";
  const w=new Worker(prefix+source,{eval:true});active.add(w);created++;
  const a={onmessage:null,onerror:null,onmessageerror:null,postMessage(d,transfer=[]){commands.push({owner:index,type:d.type});w.postMessage(d,transfer);},terminate(){exits.push(w.terminate());},releaseSource(){released++;}};
  w.on('message',data=>a.onmessage?.({data}));w.on('error',e=>a.onerror?.(e));w.on('messageerror',e=>a.onmessageerror?.(e));w.on('exit',()=>active.delete(w));
  return a;
 };
 const resourcePlan=selectResourcePlan({workers,memoryMiB:512,outstandingSlots:8,timeBudgetMs});
 const r=await runRusqsieve(input,{resourcePlan,createWorker,signal,onProgress});
 await Promise.all(exits);assert.equal(active.size,0);assert.equal(exits.length,created);assert.equal(released,created);
 assert.ok(r.allWorkersDisposed&&r.allWorkerSourcesReleased);return {...r,commands};
}
test('real Worker preflight refusal retires every owner and preserves ResourceLimit',async()=>{
 const r=await run({transform:s=>s.replace("if(d.type==='extract'){","if(d.type==='extract'){api.codex_la_lower_limits(1,208*1048576);")});
 assert.equal(r.reason,'native-memory-budget');assert.equal(r.extractionStatus,5);assert.equal(r.nativeQuota.preflightRefused,1);
 assert.equal(r.nativeQuota.active,0);assert.equal(r.nativeQuota.refusals,0);assert.deepEqual(r.factors,[]);
});
test('real Worker allocation abort uses scalar flag and retires without reusing Native',async()=>{
 const r=await run({transform:s=>s.replace('api.qs_coord_extract(session)','(api.codex_la_abort_probe(),0)')});
 assert.equal(r.reason,'native-memory-budget');assert.equal(r.nativeQuota.active,1);assert.equal(r.nativeQuota.refusals,1);
 assert.equal(r.fatal.memory.allocationFailures,1);assert.ok(r.nativeQuota.stages.some(x=>x[0]===99));
 assert.deepEqual(r.factors,[]);assert.equal(r.commands.filter(x=>x.type==='extract').length,1);
});
test('extract trap without quota evidence stays unknown; next request uses fresh Native',async()=>{
 const failed=await run({transform:s=>s.replace("if(d.type==='extract'){","if(d.type==='extract'){throw new WebAssembly.RuntimeError('unknown-extract-probe');")});
 assert.equal(failed.reason,'fatal-unknown');assert.equal(failed.nativeQuota.refusals,0);
 const fresh=await run();assert.ok(['factorized','probable'].includes(fresh.kind));assert.equal(fresh.remaining,'1');
 assert.equal(fresh.factors.reduce((n,f)=>n*BigInt(f.value),1n),BigInt(input));assert.equal(fresh.nativeQuota.active,0);
});
test('five-owner cancellation and noncooperative deadline retire every owner',async()=>{
 const a=new AbortController();
 const cancelled=await run({workers:5,signal:a.signal,onProgress:()=>a.abort()});assert.equal(cancelled.kind,'cancelled');
 const deadline=await run({workers:5,timeBudgetMs:100,transform:()=>"onmessage=()=>{while(true){}};"});
 assert.equal(deadline.kind,'timeout');assert.equal(deadline.reason,'time-budget');
});

for(const [name,replacement] of [['missing','nativeQuota'],['null','memory:null,nativeQuota'],['zero','memory:{...stats,allocationFailures:0},nativeQuota']])test('quota classification rejects '+name+' allocation evidence',async()=>{
 const r=await run({transform:s=>s.replace('api.qs_coord_extract(session)','(api.codex_la_abort_probe(),0)').replace('memory:stats,nativeQuota',replacement)});
 assert.equal(r.reason,'protocol-failure');assert.deepEqual(r.factors,[]);
});
