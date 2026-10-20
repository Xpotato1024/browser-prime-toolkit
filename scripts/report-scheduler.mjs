// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {sameFamilies} from './scheduler-packets.mjs';import {schedulerDecision} from './scheduler-decision.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex'),dir='docs/benchmarks/staged-scheduler-stage19/',plan=JSON.parse(read('bench/staged-scheduler-plan.json')),run=JSON.parse(read(dir+'run.json'));
assert.equal(run.planSha256,sha(read('bench/staged-scheduler-plan.json')));assert.ok(run.completedAt);assert.equal(run.controls.length,6);assert.equal(run.trials.length,12);assert.equal(run.preflight.length,6);
const records=[],controls=[];
for(const t of [...run.preflight,...run.controls,...run.trials]){
 assert.equal(t.exitCode,0);assert.equal(t.signal,null);assert.equal(t.error,null);
 assert.equal(t.rawSha256,sha(read(dir+t.id+'.json')));assert.equal(t.logSha256,sha(read(dir+t.id+'.log')));
 const receipt=JSON.parse(read(dir+t.id+'.json'));assert.equal(receipt.measuredHead,run.measuredHead);
 assert.deepEqual(receipt.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
 assert.deepEqual(receipt.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
 for(const[p,h]of Object.entries(receipt.sourceFiles))assert.equal(sha(execFileSync('git',['show',run.measuredHead+':'+p],{cwd:root,maxBuffer:33554432})),h,p);
 if(t.id.startsWith('contracts-')){assert.equal(receipt.records[0].tests.length,16);assert.ok(receipt.records[0].tests.every(x=>x.pass));continue;}
 const record=receipt.records[0];assert.equal(receipt.scheduler,t.scheduler);assert.equal(record.outcome.configuration.factorBaseBound,3250000);assert.equal(record.outcome.configuration.intervalHalfWidth,524288);assert.equal(record.outcome.maximumWasmBytes,t.workers*268435456);
 assert.ok(record.outcome.auditBytes<=8388608);assert.ok(record.outcome.creditState.peakReservedBytes<=33554432);assert.ok(record.outcome.peakTransportBytes<=33554432);
 (t.fixedFamilies?controls:records).push({...t,...record,receipt});
}
sameFamilies(controls,{fixed:true});sameFamilies([...controls,...records]);assert.deepEqual(run.decision,schedulerDecision(records));
const f=n=>Number(n).toFixed(1),mb=n=>f(n/1048576),lines=['# LLM-01 bounded scheduler comparison','',
'Measured core: `'+run.measuredHead+'`. Plan: [frozen settings](../../bench/staged-scheduler-plan.json). Six fixed-family controls and all twelve 60-second trials are retained in [run index](staged-scheduler-stage19/run.json), alongside six real-browser contract receipts.','',
'The mathematical kernel is the unchanged Stage18 baseline WASM (SHA-256 `'+plan.wasmSha256+'`). B=3,250,000; halfwidth=524,288; LP=471,250,000; combined DLP=10,932,187,500,000,000; threshold adjustment=-23; factor base=116,448; target=116,512. Only batching and finite ahead credit vary.','',
'| Mode | Owners | Repeat | Polys | Full | SLP | DLP | Cycles | Usable | Raw | Max return→ACK ms | Blocked idle ms | Assigned wall occupancy | Chrome peak RSS MiB |',
'|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|'];
for(const r of records){const o=r.outcome,c=o.collectorStats;lines.push('| '+[r.scheduler,r.workers,r.repeat,o.polynomialsSubmitted,c.full,c.slp,c.dlp,c.cycles,c.usable,o.rawRelationsSubmitted,f(r.handoff.maxAcceptedWaitMs),f(r.handoff.blockedIdleMs),o.ownerActivity.owners.map(x=>f(100*x.assignedRatio)+'%').join('/'),mb(r.receipt.sampledRam?.peakRssBytes??r.receipt.sampledRam?.peakRss??0)].join(' | ')+' |');}
lines.push('','Gate candidate: **'+(run.decision.candidate??'none')+'**. '+(run.decision.candidate?'The conditional geometry screen may proceed under a separately frozen plan.':'The geometry screen is stopped by the predeclared gate.'),'',
'All common native family bodies match SHA-256 across schedules, owner counts and repetitions. The six fixed controls accept exactly families 0–3, with identical native counters. Accepted-prefix, duplicate, transport/reservation, audit and lifecycle limits are independently checked.','',
'Assigned-job wall occupancy is not OS CPU utilization. Delivered native sieve timings censor active calls at stop; return-to-ACK wait can overlap ahead computation and is distinct from blocked idle. Chrome RSS/PSS covers the sampled process tree and differs from requested allocations and WASM linear memory. Per-owner memory and full timings remain in each raw receipt. A 512 MiB total WASM limit is not a total browser RAM cap.','',
'Every short run is a bounded collection observation, not an end-to-end RSA-100 completion or completion-time estimate. Filtering, linear algebra and extraction near the target remain unmeasured. No runtime default, site integration, release or deployment is changed.','');
const out=lines.join('\n'),path=new URL('../docs/benchmarks/llm01-scheduler.md',import.meta.url);if(process.argv.includes('--check'))assert.equal(readFileSync(path,'utf8'),out);else writeFileSync(path,out);
console.log('Verified scheduler raw/log hashes, measured source binding, quiet/lifecycle, equal-family proof and exact paired gate');
