// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {screenDecision,longDecision,eligible} from './dlp-decision.mjs';
import {trialArguments} from './dlp-series-contract.mjs';
const root=resolve(import.meta.dirname,'..'),dir='docs/benchmarks/staged-dlp-stage18',ev='docs/benchmarks/archive/validation-logs/staged-dlp-stage18';
const read=p=>readFileSync(join(root,p)),json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const plan=json('bench/staged-dlp-plan.json'),short=json(dir+'/short-run.json'),build=json('native/rusqsieve-dlp/staged-build.json'),manifest=json(ev+'/manifest.json');
assert.equal(short.plan,plan.id);assert.equal(short.stage,'short');assert.equal(short.planSha256,sha(read('bench/staged-dlp-plan.json')));assert.ok(short.completedAt);
assert.equal(manifest.measuredHead,short.measuredHead);assert.equal(build.cleanBuilds,2);assert.equal(build.sha256,'c9fc84ce31f1c8ac92cfa44e0ce77521d419abc87570d762e326974ed313bd13');assert.equal(build.bytes,417867);
for(const[p,h]of Object.entries(manifest.files))assert.equal(sha(read(ev+'/'+p)),h,'Evidence '+p);
const committed=new Map(),rows=[];
function bound(r){
 assert.equal(r.measuredHead,short.measuredHead);
 for(const[p,h]of Object.entries(r.sourceFiles)){
  assert.equal(sha(read(p)),h,'Current source '+p);
  if(!committed.has(p))committed.set(p,sha(execFileSync('git',['show',short.measuredHead+':'+p],{cwd:root,maxBuffer:8*1024*1024})));
  assert.equal(committed.get(p),h,'Measured commit '+p);
 }
 for(const a of r.initialAssets){assert.ok(!/oracle|manifest|plan/.test(a.path));assert.equal(read(a.path.slice(1)).length,a.bytes);assert.equal(sha(read(a.path.slice(1))),a.sha256);}
 assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
 assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
 assert.equal(r.ownership.live,0);assert.equal(r.ownership.liveSources,0);assert.ok(r.ownership.maxLive<=2&&r.ownership.maxLiveSources<=2);
 assert.equal(r.assetBoundarySelfTest.length,6);assert.ok(r.assetBoundarySelfTest.every(t=>t.status===404));
}
for(const p of ['baseline','half','quarter'])for(const e of ['one-drop','two-drop']){
 const r=json(ev+'/browser-'+p+'-'+e+'-measured.json');bound(r);
 assert.equal(r.mode,'dlp-contracts');assert.equal(r.profile,p);assert.equal(r.variant,e);assert.equal(r.records.length,1);
 assert.equal(r.records[0].tests.length,15);assert.ok(r.records[0].tests.every(t=>t.pass));assert.equal(r.records[0].performanceMeasurement,false);
}
function series(run,trials){
 assert.equal(run.measuredHead,short.measuredHead);assert.equal(run.planSha256,short.planSha256);assert.ok(run.completedAt);
 assert.deepEqual(run.trials.map(t=>t.id),trials.map(t=>t.id));assert.equal(run.trials.length,trials.length);
 for(let i=0;i<trials.length;i++){
  const t=trials[i],record=run.trials[i],file=dir+'/'+t.id+'.json',r=json(file);bound(r);
  for(const k of ['id','profile','workers','repeat','budgetMs'])assert.equal(record[k],t[k]);
  assert.equal(record.exitCode,0);assert.equal(record.signal,null);assert.equal(record.error,null);
  // Persisted CLI paths are recorded from the measured worktree, not this checkout.
  const originalRoot=record.args.at(-1).slice(0,-('/'+dir+'/'+t.id+'.json').length);
  assert.deepEqual(record.args,trialArguments(t,originalRoot));
  assert.equal(record.rawSha256,sha(read(file)));assert.equal(record.logSha256,sha(read(dir+'/'+t.id+'.log')));
  assert.equal(r.mode,'dlp-measurement');assert.equal(r.caseId,'RSA-100');assert.equal(r.profile,t.profile);assert.equal(r.variant,t.workers===1?'one-drop':'two-drop');assert.equal(r.budgetMs,t.budgetMs);assert.equal(r.seed,1);
  assert.equal(r.records.length,1);const rec=r.records[0],o=rec.outcome;assert.equal(rec.knownFactorsUsed,false);assert.equal(rec.input,o.input);assert.equal(rec.bits,330);assert.equal(rec.digits,100);assert.ok(eligible({...t,outcome:o}),t.id+' mandatory contracts');
  assert.equal(o.shareContext,true);assert.equal(o.retainLocal,false);assert.equal(o.transportCapBytes,33554432);assert.equal(o.familyBudget,250000);assert.ok(o.familiesSubmitted<=o.familiesIssued&&o.familiesIssued<=250000&&o.familiesIssued-o.familiesSubmitted<=t.workers*2);
  assert.ok(o.events.length<=256);assert.ok(o.phaseMemory.length<=8);
  for(const k of ['familiesSubmitted','familiesIssued','polynomialsSubmitted','rawRelationsSubmitted','bytesSubmitted'])assert.ok(Number.isSafeInteger(o[k])&&o[k]>=0);
  assert.deepEqual(o.memoryByOwner.map(m=>m.owner).sort(),Array.from({length:t.workers},(_,i)=>i));assert.deepEqual(o.wrapperTimingByOwner.map(m=>m.owner).sort(),Array.from({length:t.workers},(_,i)=>i));
  let product=BigInt(o.remaining);for(const f of o.factors){assert.ok(['probable','proven'].includes(f.certainty));assert.ok(BigInt(f.value)>1n);product*=BigInt(f.value);}assert.equal(product,BigInt(o.input));
  if(o.remaining==='1')assert.equal(rec.oracleCheckedAfterRetirement,true);
  const complete=['factorized','probable'].includes(o.kind)&&o.remaining==='1';
  rows.push({...t,kind:o.kind,reason:o.reason,complete,requestWallMs:o.requestWallMs,initializationMs:o.initializationMs,configuration:o.configuration,relations:o.relations,target:o.target,collectorStats:o.collectorStats,familiesSubmitted:o.familiesSubmitted,familiesIssued:o.familiesIssued,polynomialsSubmitted:o.polynomialsSubmitted,rawRelationsSubmitted:o.rawRelationsSubmitted,bytesSubmitted:o.bytesSubmitted,wrapperTimingByOwner:o.wrapperTimingByOwner,memoryByOwner:o.memoryByOwner,phaseMemory:o.phaseMemory,peakTransportBytes:o.peakTransportBytes,sampledRam:r.sampledRam,file,sha256:sha(read(file)),logSha256:record.logSha256,outcome:o});
 }
}
series(short,plan.trials);
const decision=screenDecision(rows,plan);assert.deepEqual(short.decision,decision);
let final={adopted:false,reason:'no-short-candidate'},long=null;
if(decision.candidate){
 long=json(dir+'/long-run.json');assert.equal(long.stage,'long');assert.deepEqual(long.screen,decision);
 const trials=plan.gate.longOrder.map((p,i)=>({id:'long-'+(i+1)+'-'+(p==='candidate'?decision.candidate:p),profile:p==='candidate'?decision.candidate:p,workers:2,repeat:i+1,budgetMs:600000}));
 series(long,trials);final=longDecision(rows.slice(12),decision.candidate,plan);assert.deepEqual(long.decision,final);
}
const expected=[...short.trials,...(long?.trials??[])].flatMap(t=>[t.id+'.json',t.id+'.log']).concat('short-run.json',...(long?['long-run.json']:[])).sort();
assert.deepEqual(readdirSync(join(root,dir)).sort(),expected);
const high=r=>r.memoryByOwner.reduce((sum,m)=>sum+m.peakRequestedBytes,0);
const memoryComparisons=[];
for(const profile of ['half','quarter'])for(const workers of [1,2])for(const repeat of [1,2]){
 const candidate=rows.find(r=>r.profile===profile&&r.workers===workers&&r.repeat===repeat&&r.budgetMs===60000),baseline=rows.find(r=>r.profile==='baseline'&&r.workers===workers&&r.repeat===repeat&&r.budgetMs===60000);
 memoryComparisons.push({profile,workers,repeat,baselineSumPerOwnerRequestedHighWater:high(baseline),candidateSumPerOwnerRequestedHighWater:high(candidate),observedRequestedBytesDifference:high(baseline)-high(candidate),baselineGraphVertices:baseline.collectorStats.vertices,candidateGraphVertices:candidate.collectorStats.vertices,baselineYield:baseline.relations,candidateYield:candidate.relations,baselineSubmittedPolynomials:baseline.polynomialsSubmitted,candidateSubmittedPolynomials:candidate.polynomialsSubmitted,equalSubmittedPolynomials:baseline.polynomialsSubmitted===candidate.polynomialsSubmitted});
}
const publicRows=rows.map(({outcome,...r})=>r),summary={plan:plan.id,measuredHead:short.measuredHead,baselineHead:plan.baseHead,buildSha256:build.sha256,rawTrials:rows.length,memoryComparisons,screen:decision,final,completeRsa100:rows.filter(r=>r.complete).map(r=>r.id),timing:{shortStartedAt:short.startedAt,shortCompletedAt:short.completedAt,shortHarnessWallMs:Date.parse(short.completedAt)-Date.parse(short.startedAt),longStartedAt:long?.startedAt??null,longCompletedAt:long?.completedAt??null,longHarnessWallMs:long?Date.parse(long.completedAt)-Date.parse(long.startedAt):null,requestCalculationMs:rows.reduce((n,r)=>n+r.requestWallMs,0),maximumAuthorizedCalculationMs:3120000,preparation:manifest.preparation},rows:publicRows};
const output=(p,x)=>{const s=typeof x==='string'?x:JSON.stringify(x,null,2)+'\n';if(process.argv.includes('--check'))assert.equal(read(p).toString(),s);else writeFileSync(join(root,p),s);};
output('docs/benchmarks/llm01-dlp-summary.json',summary);
const fmt=n=>(n/1000).toFixed(3),mi=n=>(n/1048576).toFixed(1);
const table=rows.map(r=>'| '+[r.id,fmt(r.requestWallMs),r.kind+'/'+(r.reason??''),r.relations+'/'+r.target,r.collectorStats.full+'+'+r.collectorStats.cycles,r.collectorStats.slp+'/'+r.collectorStats.dlp,r.collectorStats.vertices+'/'+r.collectorStats.treeEdges,r.polynomialsSubmitted,r.memoryByOwner.map(m=>m.peakRequestedBytes).join('+'),r.memoryByOwner.map(m=>m.peakLinearBytes).join('+'),mi(r.sampledRam.peakPssBytes)].join(' | ')+' |').join('\n');
const timingTable=rows.flatMap(r=>r.wrapperTimingByOwner.map(t=>'| '+r.id+' | '+t.owner+' | '+['prepareMs','sieveMs','copyFreeMs','framingMs','submitMs','observeMs','extractMs'].map(k=>fmt(t.timings[k])).join(' | ')+' |')).join('\n');
const md=[
 '# DLP cutoff: fixed browser evaluation',
 '',
 'The fixed measurement head is '+short.measuredHead+'. The original b2e38bb4 baseline, its raw data and source remain unchanged. This series compares three separately instrumented profiles with the same compiler and safety limits. The binary is '+build.bytes+' bytes, SHA-256 '+build.sha256+', reproduced by two clean builds.',
 '',
 'Screen: '+decision.reason+'; long candidate: '+(decision.candidate??'none')+'. Final evaluation: '+final.reason+'; adopted for evaluation: '+final.adopted+'. RSA-100 completed in these trials: '+(summary.completeRsa100.join(', ')||'none')+'. This does not select or release a product engine.',
 '',
 '| Trial | Request s | Outcome | Usable/target | Full+cycles | SLP/DLP ingested | Vertices/tree edges | Submitted polynomials | Requested peak bytes per owner | Linear peak bytes per owner | Chrome PSS MiB |',
 '| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |',
 table,
 '',
 'Selection uses only acknowledged contiguous submitted-prefix usable columns: full+cycles. Raw rows, total DLPs and work interrupted before delivery do not qualify. Both two-Worker repeat ratios must reach1.15 and both one-Worker ratios0.90; ranking uses exact integer cross-products. The conditional long ABBA gate requires both candidate yields at least1.15 times the maximum baseline long yield. The summary preserves all paired ratios and decisions.',
 '',
 'B=3250000, half-interval524288, single large-prime145B, threshold offset-23 and2048-pattern families are fixed. Baseline/half/quarter accept product limits1035B²/512B²/256B². The existing threshold formula automatically derives lp_bits54/53/52; this coupled effect is part of each DLP condition. There is no independent threshold sweep.',
 '',
 'Each short profile/worker combination has only two fixed-order observations on one PC. Early graph growth is nonlinear and a short screen does not establish long-horizon performance. '+(long?'Only the screen winner entered the four predeclared600-second two-Worker ABBA trials.':'No profile passed the short gate, so all600-second comparisons remain unmeasured and the series closes without adoption.')+' No RSA completion time is extrapolated. Preparation, controls, reviews and CI are separate from the maximum52-minute numeric allocation.',
 '',
 'Timing: short '+short.startedAt+' to '+short.completedAt+(long?'; long '+long.startedAt+' to '+long.completedAt:'')+'. Summed bounded request time is '+fmt(summary.timing.requestCalculationMs)+' seconds. See the evidence manifest for separately recorded preparation timing.',
 '',
 '## Last-delivered cumulative wrapper phases',
 '',
 'Values below are seconds. Native sieve includes serialization; submit includes native graph ingestion. These wrappers do not isolate filter, Lanczos or individual CPU instructions. An interrupted call can leave undelivered timing or graph data. The coordinator submit counters correspond to acknowledged input prefixes.',
 '',
 '| Trial | Owner | Prepare | Sieve/serialize | Copy/free | Framing | Submit/graph | Observe | Extract |',
 '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
 timingTable,
 '',
 'Each owner uses unshared bounded-growth WASM memory, initial17pages and maximum256MiB. At most two owners give a512MiB total linear-memory cap. Requested allocator peaks exclude metadata, fragmentation, stack/static and JS/Chrome; per-owner high-water values need not be simultaneous. Freeing memory does not shrink the linear buffer. Chrome-tree sampled PSS/RSS is a separate whole-process observation, and summed RSS may count shared pages repeatedly. No capacity increase is called a resource saving.',
 '',
 'All measured runs shut down the asset server, disable cache and go CDP-offline before calculation; observed calculation communication is zero and positive detector controls pass afterward. Every Worker and Blob source is retired/released. Any completed factorization retains independent factor-product/MR checks and probable status. Native RSA packet tests cover all three actual330-bit configurations and collector conservation before measurement.',
 '',
 '[All short invocations](staged-dlp-stage18/short-run.json)'+(long?', [long ABBA](staged-dlp-stage18/long-run.json)':'')+', [summary](llm01-dlp-summary.json), [contract](../contracts/dlp-evaluation.md), [TDD/evidence](../operations/stage18-tdd-evidence.md) and [hashed validation manifest](archive/validation-logs/staged-dlp-stage18/manifest.json) preserve failures and negative outcomes. The generator verifies current sources against immutable measured Git blobs, raw/log hashes, all safety boundaries and the exact gate. Ready, merge, release, deployment and site integration remain separate.',
 ''
].join('\n');
output('docs/benchmarks/llm01-dlp.md',md);
console.log('Verified'+rows.length+' fixed DLP browser trials, exact gate, original baseline, source/commit/raw/log/memory/lifecycle evidence');
