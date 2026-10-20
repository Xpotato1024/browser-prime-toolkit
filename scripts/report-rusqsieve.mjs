// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'..'),dir='docs/benchmarks/staged-rusqsieve-stage17',ev='docs/benchmarks/archive/validation-logs/staged-rusqsieve-stage17';
const read=p=>readFileSync(join(root,p)),json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const plan=json('bench/staged-rusqsieve-plan.json'),run=json(dir+'/run-all.json'),build=json('native/rusqsieve/staged-build.json');
assert.equal(run.plan,plan.id);assert.equal(run.planSha256,sha(read('bench/staged-rusqsieve-plan.json')));assert.equal(plan.trials.length,14);assert.equal(run.trials.length,14);assert.ok(run.completedAt);
assert.deepEqual(run.trials.map(t=>t.id),plan.trials.map(t=>t.id));assert.ok(run.trials.every(t=>t.exitCode===0&&!t.signal&&!t.error));
assert.equal(build.cleanBuilds,2);assert.equal(build.version,'0.5.0');assert.equal(build.sha256,'b792d521fe6c64ce238e1c8b43ac5567de9ad27ce1c4da799be64c69fa0fa53f');
const manifest=json(ev+'/manifest.json');assert.equal(manifest.measuredHead,run.measuredHead);
for(const[p,h]of Object.entries(manifest.files))assert.equal(sha(read(ev+'/'+p)),h,'Evidence '+p);
// Commit blobs are immutable; cache only those hashes, never current working-tree reads.
const committed=new Map();
function bound(r){
 assert.equal(r.measuredHead,run.measuredHead);
 for(const[p,h]of Object.entries(r.sourceFiles)){assert.equal(sha(read(p)),h,'Current source '+p);if(!committed.has(p))committed.set(p,sha(execFileSync('git',['show',run.measuredHead+':'+p],{cwd:root,maxBuffer:8*1024*1024})));assert.equal(committed.get(p),h,'Measured commit '+p);}
 for(const a of r.initialAssets){assert.ok(!/oracle|manifest/.test(a.path));assert.equal(read(a.path.slice(1)).length,a.bytes);assert.equal(sha(read(a.path.slice(1))),a.sha256);}
 assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
 assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
 assert.equal(r.ownership.live,0);assert.equal(r.ownership.liveSources,0);assert.ok(r.ownership.maxLive<=2&&r.ownership.maxLiveSources<=2);
 assert.equal(r.assetBoundarySelfTest.length,6);assert.ok(r.assetBoundarySelfTest.every(t=>t.status===404));
}
for(const n of ['one','two']){const r=json(ev+'/browser-'+n+'-latest-head.json');bound(r);assert.equal(r.records[0].tests.length,12);assert.ok(r.records[0].tests.every(t=>t.pass));assert.equal(r.records[0].performanceMeasurement,false);}
const simd=json(ev+'/simd-inspection.json');assert.equal(simd.wasmSha256,build.sha256);assert.ok(simd.simdInstructionOccurrences>0);assert.equal(Object.values(simd.opcodes).reduce((a,b)=>a+b,0),simd.simdInstructionOccurrences);
const catalog=[...json('bench/staged-rsa/catalog.json'),...json('bench/staged-full/catalog.json').cases],rows=[];
assert.deepEqual(readdirSync(join(root,dir)).filter(p=>p.endsWith('.json')&&p!=='run-all.json').sort(),plan.trials.map(t=>t.id+'.json').sort());
for(const t of plan.trials){
 const file=dir+'/'+t.id+'.json',r=json(file);bound(r);assert.equal(r.mode,'rusqsieve-measurement');assert.equal(r.variant,t.variant);assert.equal(r.caseId,t.case);assert.equal(r.budgetMs,t.budgetMs);
 const c=catalog.find(c=>c.id===t.case);assert.ok(c);assert.equal(r.records.length,1);const rec=r.records[0],o=rec.outcome;
 assert.equal(rec.input,c.input);assert.equal(rec.bits,c.bits);assert.equal(rec.digits,c.digits);assert.equal(rec.knownFactorsUsed,false);assert.equal(o.input,c.input);
 const workers=t.variant.startsWith('two')?2:1;assert.equal(o.workers,workers);assert.ok(o.peakOwners<=workers);assert.equal(o.maximumWasmBytes,workers*268435456);assert.equal(o.allWorkersDisposed,true);assert.equal(o.allWorkerSourcesReleased,true);assert.deepEqual(o.retirementErrors,[]);
 assert.equal(o.shareContext,t.variant.endsWith('drop'));assert.equal(o.retainLocal,t.variant.endsWith('retain'));assert.equal(o.transportCapBytes,33554432);assert.ok(o.peakTransportBytes<=33554432);
 assert.equal(o.target,o.factorBaseSize+64);assert.equal(o.familyBudget,c.bits<=288?100000:250000);assert.ok(o.familiesSubmitted<=o.familiesIssued&&o.familiesIssued<=o.familyBudget&&o.familiesIssued-o.familiesSubmitted<=workers*2);
 for(const key of ['familiesSubmitted','familiesIssued','polynomialsSubmitted','rawRelationsSubmitted','bytesSubmitted'])assert.ok(Number.isSafeInteger(o[key])&&o[key]>=0);
 assert.ok(o.requestWallMs>=0&&o.requestWallMs<t.budgetMs+1000);assert.ok(o.events.length<=256);assert.ok(o.phaseMemory.length<=8);
 for(const m of o.memoryByOwner){assert.ok(m.peakLinearBytes<=268435456&&m.peakRequestedBytes<=m.peakLinearBytes);}
 for(const e of o.phaseMemory){if(e.type==='released'){assert.ok(e.after.liveRequested<=e.before.liveRequested);assert.equal(e.after.linearBytes,e.before.linearBytes);}}
 let product=BigInt(o.remaining);for(const f of o.factors){assert.ok(['probable','proven'].includes(f.certainty));assert.ok(BigInt(f.value)>1n);product*=BigInt(f.value);}assert.equal(product,BigInt(c.input));
 const complete=['factorized','probable'].includes(o.kind)&&o.remaining==='1';if(complete){assert.equal(o.factors.length,2);assert.ok(o.requestWallMs<t.budgetMs);assert.ok(o.phaseMemory.some(e=>e.type==='extracted'&&e.status===1));}
 if(t.stage==='control'){assert.ok(complete);assert.equal(rec.oracleCheckedAfterRetirement,true);}
 rows.push({id:t.id,stage:t.stage,variant:t.variant,case:t.case,workers,budgetMs:t.budgetMs,kind:o.kind,reason:o.reason,complete,requestWallMs:o.requestWallMs,initializationMs:o.initializationMs,familiesIssued:o.familiesIssued,familiesSubmitted:o.familiesSubmitted,polynomialsSubmitted:o.polynomialsSubmitted,rawRelationsSubmitted:o.rawRelationsSubmitted,bytesSubmitted:o.bytesSubmitted,relations:o.relations,target:o.target,factorBaseSize:o.factorBaseSize,phaseMemory:o.phaseMemory,memoryByOwner:o.memoryByOwner,peakTransportBytes:o.peakTransportBytes,sampledRam:r.sampledRam,file,sha256:sha(read(file)),logSha256:sha(read(dir+'/'+t.id+'.log'))});
}
const get=id=>rows.find(r=>r.id===id),readyLive=id=>get(id).phaseMemory.find(e=>e.type==='ready'&&e.owner===0).memory.liveRequested;
const memoryFindings={rsa60InitialCoordinator:{copy:readyLive('rsa100-60s-two-copy'),shared:readyLive('rsa100-60s-two-drop'),saved:readyLive('rsa100-60s-two-copy')-readyLive('rsa100-60s-two-drop')},control64RequestedPeak:{copy:get('control-64-one-copy').memoryByOwner[0].peakRequestedBytes,shared:get('control-64-one-drop').memoryByOwner[0].peakRequestedBytes,retain:get('control-64-one-retain').memoryByOwner[0].peakRequestedBytes},rsa600SubmittedPolynomials:{one:get('rsa100-600s-one-drop').polynomialsSubmitted,two:get('rsa100-600s-two-drop').polynomialsSubmitted}};
const summary={plan:plan.id,measuredHead:run.measuredHead,upstream:plan.upstream,buildSha256:build.sha256,rawTrials:14,memoryFindings,rows,completeRsa100:rows.filter(r=>r.case==='RSA-100'&&r.complete).map(r=>r.id),interpretation:plan.interpretation};
const output=(p,x)=>{const s=typeof x==='string'?x:JSON.stringify(x,null,2)+'\n';if(process.argv.includes('--check'))assert.equal(read(p).toString(),s);else writeFileSync(join(root,p),s);};
output('docs/benchmarks/llm01-rusqsieve-summary.json',summary);
const table=rows.map(r=>`| ${r.id} | ${(r.requestWallMs/1000).toFixed(3)} | ${r.kind}/${r.reason??'—'} | ${r.familiesSubmitted}/${r.familiesIssued} | ${r.relations}/${r.target} | ${r.memoryByOwner.map(m=>m.peakLinearBytes).join('+')} | ${r.memoryByOwner.map(m=>m.peakRequestedBytes).join('+')} | ${(r.sampledRam.peakPssBytes/1048576).toFixed(1)} |`).join('\n');
output('docs/benchmarks/llm01-rusqsieve.md',`# rusqsieve 0.5.0 SIMD: fixed browser comparison

Static disassembly of the pinned artifact confirms SIMD opcodes; this is not an isolated SIMD speed comparison.

The fixed 14 trials used commit \`${run.measuredHead}\`, the reviewed 0.5.0 source and two identical clean builds. RSA-100 completed in these conditions: ${summary.completeRsa100.join(', ')||'none'}. No completion time is extrapolated from incomplete collection.

| Trial | Request wall s | Outcome | Submitted/issued families | Usable/target relations | Observed linear max bytes per owner | Observed requested heap max bytes per owner | Sampled Chrome PSS MiB |
| --- | ---: | --- | ---: | ---: | --- | --- | ---: |
${table}

The initial RSA-100 coordinator requested heap fell from ${memoryFindings.rsa60InitialCoordinator.copy} to ${memoryFindings.rsa60InitialCoordinator.shared} bytes with sharing. However the 64-digit whole-request heap high-water was ${memoryFindings.control64RequestedPeak.copy} bytes for both copy and sharing; retain used ${memoryFindings.control64RequestedPeak.retain}. Sharing did not improve every measured quantity: the 60-second shared run submitted10 families versus12 for copy. These are retained negative/limited results, not a general throughput win.

All ten 40/64-digit controls passed exact factor-product and post-retirement oracle checks before RSA trials started. Probable-prime status remains probable. The adapter makes one typed extraction attempt and does not silently add upstream rho/ECM or native-thread algorithms.

copy versus drop isolates sharing the immutable same-WASM factor base/context. copy versus retain isolates dropping the local context before extraction. drop versus retain changes both settings and is not an isolated retention comparison. Fixed ordering and one observation per condition limit interpretation. Family counts are not C checkpoint work or CPU instructions. Conditions with different family counts are not equal-work speed comparisons.

Each actual owner has unshared bounded-growth memory: initial17pages and maximum256MiB, at most two owners and512MiB total linear-memory maximum. Requested-live/peak excludes allocator metadata, fragmentation, stack/static and JS/Chrome. Per-owner maxima are observed high-water snapshots, not simultaneous whole-system peaks; an interrupted native call may have undelivered telemetry. Freeing contexts does not shrink linear memory. Sampled Chrome-tree PSS/RSS is separate, and summed RSS can count shared pages repeatedly. No capacity was increased as a memory optimization.

All measured requests ran after asset-server shutdown with CDP offline/cache disabled and zero network requests; positive audit controls passed afterward. Every owner and Blob source was retired/released. All original raw, logs, source hashes and negative outcomes remain preserved.

[Raw invocation](staged-rusqsieve-stage17/run-all.json), [summary](llm01-rusqsieve-summary.json), and [contract/TDD evidence](archive/validation-logs/staged-rusqsieve-stage17/manifest.json) are verified by this generated report. These measurements preceded the separate public-repository/CI authorization. Current verification is tracked by the PR checks; this report does not authorize Ready/merge/release/deployment or site integration.
`);
console.log('Verified14 SIMD browser trials, source/commit/artifact binding, memory/lifecycle and raw/log evidence');
