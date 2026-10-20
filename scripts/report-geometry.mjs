// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {sameFamilies} from './scheduler-packets.mjs';import {geometryDecision} from './geometry-decision.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex'),dir='docs/benchmarks/staged-geometry-stage20/',plan=JSON.parse(read('bench/staged-geometry-plan.json')),run=JSON.parse(read(dir+'run.json'));
assert.equal(run.planSha256,sha(read('bench/staged-geometry-plan.json')));assert.ok(run.completedAt);assert.equal(run.preflight.length,4);assert.equal(run.trials.length,8);
const records=[],sources=new Map();
for(const t of [...run.preflight,...run.trials]){
 assert.equal(t.exitCode,0);assert.equal(t.signal,null);assert.equal(t.error,null);assert.equal(t.rawSha256,sha(read(dir+t.id+'.json')));assert.equal(t.logSha256,sha(read(dir+t.id+'.log')));
 const receipt=JSON.parse(read(dir+t.id+'.json'));assert.equal(receipt.measuredHead,run.measuredHead);assert.equal(receipt.profile,t.profile);assert.equal(receipt.scheduler,'credit1');
 assert.deepEqual(receipt.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});assert.deepEqual(receipt.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
 for(const[p,h]of Object.entries(receipt.sourceFiles)){if(!sources.has(p))sources.set(p,sha(execFileSync('git',['show',run.measuredHead+':'+p],{cwd:root,maxBuffer:33554432})));assert.equal(sources.get(p),h,p);}
 if(t.preflight){assert.equal(receipt.records[0].tests.length,16);assert.ok(receipt.records[0].tests.every(x=>x.pass));continue;}
 const r=receipt.records[0],o=r.outcome,p=plan.profiles[t.profile];assert.equal(o.configuration.factorBaseBound,p.B);assert.equal(o.configuration.intervalHalfWidth,p.halfwidth);assert.equal(o.target,o.configuration.factorBaseSize+64);assert.equal(o.maximumWasmBytes,536870912);assert.ok(o.auditBytes<=8388608);assert.ok(o.creditState.peakReservedBytes<=33554432);assert.ok(o.peakTransportBytes<=33554432);assert.equal(o.configuration.aDistribution.samples.length,64);
 records.push({...t,...r,receipt});
}
for(const profile of Object.keys(plan.profiles))sameFamilies(records.filter(r=>r.profile===profile));
const old=JSON.parse(read('docs/benchmarks/staged-scheduler-stage19/fixed-batch2-w1.json')).records[0];sameFamilies([old,...records.filter(r=>r.profile==='b325-m524')]);
assert.deepEqual(run.decision,geometryDecision(records));
const f=x=>Number(x).toFixed(2),lines=['# LLM-01 conditional Rust geometry screen','',
'Measured core: `'+run.measuredHead+'`. [Frozen plan](../../bench/staged-geometry-plan.json); [all twelve raw/log receipts](staged-geometry-stage20/run.json). Four real-browser contract configurations precede eight60-second two-owner trials. The finite credit1 scheduler is unchanged from the successful Stage19 comparison.','',
'| Profile | B | Halfwidth | FB / target | Single / combined LP bounds | lp_bits | k / Q2 | Target A bits | A factors / variants | Sample A/targetA (min / median / max, quantized) |',
'|---|---:|---:|---|---|---:|---|---:|---|---|'];
for(const profile of Object.keys(plan.profiles)){const c=records.find(r=>r.profile===profile).outcome.configuration,a=c.aDistribution,s=a.samples.map(x=>x.ratioMilli).sort((a,b)=>a-b);lines.push('| '+[profile,c.factorBaseBound,c.intervalHalfWidth,c.factorBaseSize+' / '+(c.factorBaseSize+64),c.singleLimit+' / '+c.doubleLimit,c.lpBits,a.multiplier+' / '+a.q2,a.targetBits,a.factorCount+' / '+a.variants,[s[0],s[32],s[63]].map(x=>f(x/1000)).join(' / ')].join(' | ')+' |');}
lines.push('','A samples are deterministic families0..63. Each ratio is floor(1000*A/targetA)/1000; this is a bounded quantized sample, not a complete probability distribution. Actual pool sizes and every sample bit length/ratio remain in the receipts. B changes both accepted LP bounds and the actual target; this is a coupled geometry/LP comparison. Threshold adjustment remains-23.','',
'| Profile | Repeat | Polys | Full | SLP | DLP | Cycles | Usable / target | Progress % | Raw | Blocked idle ms | Max return→ACK ms | Chrome peak RSS MiB |',
'|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|');
for(const r of records){const o=r.outcome,c=o.collectorStats;lines.push('| '+[r.profile,r.repeat,o.polynomialsSubmitted,c.full,c.slp,c.dlp,c.cycles,o.relations+' / '+o.target,f(100*o.relations/o.target),o.rawRelationsSubmitted,f(r.handoff.blockedIdleMs),f(r.handoff.maxAcceptedWaitMs),f(r.receipt.sampledRam.peakRssBytes/1048576)].join(' | ')+' |');}
lines.push('','Provisional collection candidate: **'+(run.decision.candidate??'none')+'**. Both paired normalized-progress ratios must reach1.15; equal top ratios retain baseline. The exact integer decision and all negative results remain in the run index.','',
'Common native families and accepted-prefix graph counters match within each geometry across repeats. The unchanged geometry also matches Stage19 native family bytes/counters. Source/artifact/configuration, lifecycle, quiet-network and bounded-resource checks are tied to the measured commit.','',
'No end-to-end RSA-100 completion is established. Target normalization does not measure filtering, matrix costs or extraction near target. Assigned-job occupancy is not OS CPU utilization; active calls censor delivered native timing. ACK latency may overlap ahead calculation. Requested allocator bytes, WASM linear memory and sampled Chrome RSS/PSS remain separate;512MiB is the total WASM cap, not total browser RAM.','',
'No long trial, larger search, runtime default, site policy/integration, release or deployment is included.','');
const output=lines.join('\n'),path=new URL('../docs/benchmarks/llm01-geometry.md',import.meta.url);if(process.argv.includes('--check'))assert.equal(readFileSync(path,'utf8'),output);else writeFileSync(path,output);
console.log('Verified geometry raw/log/source/artifact/configuration, equal-family and native baseline proof, exact target-normalized gate');
