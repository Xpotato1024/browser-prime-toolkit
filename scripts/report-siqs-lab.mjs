import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {mergeRelationStreams,notificationAccounting,planLanes} from '../src/siqs-lab/contracts.js';
const root=resolve(import.meta.dirname,'..'),dir='docs/benchmarks/staged-siqs-lab-stage14';
const read=p=>readFileSync(join(root,p)),json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const plan=json('bench/siqs-lab-plan.json'),run=json(dir+'/run-all.json'),build=json('native/siqs-lab/staged-build.json');
assert.equal(run.planSha256,sha(read('bench/siqs-lab-plan.json')));
assert.equal(run.plan,plan.id);assert.equal(run.stage,'all');assert.equal(run.trials.length,38);
assert.ok(run.trials.every(t=>t.exitCode===0&&!t.signal&&!t.error));
assert.deepEqual(run.trials.map(t=>t.id),plan.trials.map(t=>t.id));
assert.match(run.measuredHead,/^[a-f0-9]{40}$/);
const catalog=[...json('bench/staged-rsa/catalog.json'),...json('bench/staged-full/catalog.json').cases];
const buffer=x=>{assert.ok(x&&Number.isInteger(x.bytes)&&x.bytes<=16777216);const b=Buffer.from(x.base64,'base64');assert.equal(b.length,x.bytes);assert.equal(b.toString('base64'),x.base64);return b;};
const normaliseGraph=g=>Object.fromEntries(Object.entries(g).filter(([k])=>!['bytes','verified'].includes(k)));
const evidenceDir='docs/benchmarks/archive/validation-logs/staged-siqs-lab-stage14',evidence=json(evidenceDir+'/manifest.json');
assert.equal(evidence.measuredHead,run.measuredHead);
for(const[p,h]of Object.entries(evidence.files))assert.equal(sha(read(evidenceDir+'/'+p)),h,'TDD evidence '+p);
const contract=json(evidenceDir+'/browser-core-head.json');assert.equal(contract.measuredHead,run.measuredHead);assert.equal(contract.mode,'siqs-lab-contracts');
assert.equal(contract.records[0].tests.length,11);assert.ok(contract.records[0].tests.every(t=>t.pass));assert.equal(contract.records[0].performanceMeasurement,false);
assert.equal(contract.ownership.live,0);assert.equal(contract.quiet.networkRequests,0);assert.equal(contract.quiet.httpRequests,0);assert.equal(contract.quiet.badEvents,0);
for(const[p,h]of Object.entries(contract.sourceFiles))assert.equal(sha(read(p)),h,'Contract source '+p);
const rows=[],heads=new Set();
assert.deepEqual(readdirSync(join(root,dir)).filter(p=>p.endsWith('.json')&&p!=='run-all.json').sort(),plan.trials.map(t=>t.id+'.json').sort());
for(const t of plan.trials){
 const file=dir+'/'+t.id+'.json',r=json(file),record=r.records[0],o=record.outcome,c=catalog.find(c=>c.id===t.case);
 assert.equal(r.mode,'siqs-lab-measurement');assert.equal(r.trialId,t.id);assert.equal(r.caseId,t.case);
 assert.equal(r.variant,t.variant);assert.equal(r.seed,t.seed);assert.equal(r.budgetMs,t.budgetMs);assert.equal(r.memoryMode,t.memory);
 heads.add(r.measuredHead);assert.equal(r.measuredHead,run.measuredHead);
 assert.equal(record.input,c.input);assert.equal(record.id,c.id);assert.equal(record.bits,c.bits);assert.equal(record.digits,c.digits);
 assert.equal(c.input.length,c.digits);assert.equal(BigInt(c.input).toString(2).length,c.bits);assert.equal(record.knownFactorsUsed,false);
 assert.deepEqual(record.options,{variant:t.variant,timeBudgetMs:t.budgetMs,seed:t.seed,workers:t.workers,streams:t.streams,operationBudget:t.operations,blockQuota:0});
 for(const[p,h]of Object.entries(r.sourceFiles))assert.equal(sha(read(p)),h,'Measured source '+p);
 for(const a of r.initialAssets){assert.ok(!/oracle|manifest/.test(a.path));assert.equal(read(a.path.slice(1)).length,a.bytes);assert.equal(sha(read(a.path.slice(1))),a.sha256);}
 assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
 assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
 assert.equal(r.assetBoundarySelfTest.length,6);assert.ok(r.assetBoundarySelfTest.every(x=>x.status===404));
 assert.equal(r.ownership.live,0);assert.ok(r.ownership.maxLive<=t.workers);
 if(t.memory==='on')assert.ok(r.sampledRam.samples>0&&r.sampledRam.peakPssBytes>0);else assert.equal(r.sampledRam,null);
 assert.equal(o.input,c.input);assert.equal(o.allWorkersDisposed,true);assert.ok(o.peakWorkers<=t.workers);
 assert.ok(o.peakWasmBytes<=t.workers*268435456);assert.equal(o.serializedBufferCap,67108864);
 assert.ok(o.elapsedMs>=0&&o.elapsedMs<t.budgetMs+1000);assert.ok(o.chargedOperations<=t.operations);
 assert.deepEqual(o.plan, {...planLanes({workers:t.workers,operationBudget:t.operations,timeBudgetMs:t.budgetMs}),streams:t.streams,
  lanes:t.streams===2?planLanes({workers:t.workers,operationBudget:Math.floor(t.operations*4/5),timeBudgetMs:t.budgetMs}).lanes:[{seed:t.seed,operationBudget:Math.floor(t.operations*4/5)}],collectionBudget:Math.floor(t.operations*4/5)});
 let charged=0;const collectors=[],summaries=[];
 for(const entry of o.records){
  const p=entry.packet,s=p.stats;assert.equal(p.phase,entry.phase);assert.ok(p.operations<=entry.allowance&&s.work<=p.operations);
  charged+=p.operations;
  if(p.meta.fbSize){assert.equal(p.meta.build,build.wasmSha256);assert.equal(p.meta.input,c.input);}
  if(s.notifications?.observedPeriodic!=null)assert.deepEqual(notificationAccounting({work:s.work,stride:o.settings.stride,periodic:s.notifications.observedPeriodic,
   flush:s.notifications.observedFlush,deliveries:s.notifications.observedDeliveries,clockCalls:s.notifications.clockCalls,probeClockCalls:s.probeClockCalls}),s.notifications);
  if(s.phaseWork)assert.equal(s.phaseWork.reduce((a,b)=>a+b,0),s.work);
  if(s.timers)for(const v of s.timers){assert.ok(v.ms>=0&&v.throughSnapshotMs>=v.ms&&Number.isInteger(v.calls));assert.equal(typeof v.open,'boolean');}
  if(p.divisor!==null){const d=BigInt(p.divisor);assert.ok(d>1n&&d<BigInt(c.input)&&BigInt(c.input)%d===0n);}
  const b=p.buffer?buffer(p.buffer):null;
  if(p.headerPrefix){assert.equal(p.normal,false);assert.equal(p.buffer,null);assert.equal(buffer(p.headerPrefix).toString(),(BigInt(c.input)*BigInt(p.meta.multiplier)).toString(16));}
  if(entry.phase==='collect'&&b)collectors.push({meta:p.meta,bytes:b,seed:entry.seed,stop:p.stop,work:s.work,allowance:entry.allowance});
  summaries.push({phase:entry.phase,seed:entry.seed,allowance:entry.allowance,work:s.work,graphWork:p.graphWork,stop:p.stop,normal:p.normal,
   initializationMs:entry.initializationMs,computeWallMs:entry.computeWallMs,blocks:s.blocks,basePolynomials:s.basePolynomials,derivedPolynomials:s.derivedPolynomials,
   phaseWork:s.phaseWork,notifications:s.notifications,probeClockCalls:s.probeClockCalls,timers:s.timers,fbSize:p.meta.fbSize,multiplier:p.meta.multiplier,verifiedRelations:s.verifiedRelations});
 }
 for(const h of o.hostStops){assert.ok(Number.isSafeInteger(h.charged)&&h.charged>=0);charged+=h.charged;}
 assert.equal(charged,o.chargedOperations);
 let graph=null;
 if(collectors.length){
  graph=mergeRelationStreams(collectors,collectors[0].meta);
  if(o.merged?.graph){assert.deepEqual(normaliseGraph(o.merged.graph),normaliseGraph(graph));if(o.merged.graph.verified)assert.equal(o.merged.stats.verifiedRelations,graph.uniqueRelations);}
 }
 if(o.kind==='verified'){assert.equal(o.merged?.graph?.verified,true);assert.equal(o.merged.normal,true);}
 rows.push({id:t.id,stage:t.stage,caseId:t.case,variant:t.variant,seed:t.seed,workers:t.workers,streams:t.streams,budgetMs:t.budgetMs,memory:t.memory,
  kind:o.kind,error:o.error,elapsedMs:o.elapsedMs,chargedOperations:o.chargedOperations,hostStops:o.hostStops,graph:graph?normaliseGraph(graph):null,
  nativeVerified:o.merged?.graph?.verified??false,fbSize:o.merged?.meta?.fbSize??summaries[0]?.fbSize,target:o.merged?.relations?.target??null,
  sampledRam:r.sampledRam,phases:summaries,streamsEvidence:collectors.map(x=>({seed:x.seed,bytes:x.bytes.length,sha256:sha(x.bytes),work:x.work,allowance:x.allowance,stop:x.stop,localGraph:normaliseGraph(mergeRelationStreams([x],x.meta))})),
  file,sha256:sha(read(file)),logSha256:sha(read(dir+'/'+t.id+'.log'))});
}
assert.equal(heads.size,1);
const pools=[];
for(const c of ['RSA-100','full-balanced-96-1']){
 const rs=rows.filter(r=>r.stage==='pool'&&r.caseId===c),a=rs.filter(r=>r.workers===1),b=rs.filter(r=>r.workers===2);
 assert.equal(a.length,2);assert.equal(b.length,2);
 const completeWork=rs.every(r=>r.streamsEvidence.length===2&&r.streamsEvidence.every(s=>s.work===s.allowance&&s.stop==='operation-budget'));
 if(completeWork)for(const seed of [1,11])assert.equal(new Set(rs.map(r=>r.streamsEvidence.find(s=>s.seed===seed).sha256)).size,1,'Equal-work deterministic stream bytes');
 pools.push({caseId:c,completeWork,oneMs:a.map(r=>r.elapsedMs),twoMs:b.map(r=>r.elapsedMs),ratioOfMean:(a.reduce((s,r)=>s+r.elapsedMs,0)/2)/(b.reduce((s,r)=>s+r.elapsedMs,0)/2)});
}
const summary={planId:plan.id,measuredHead:run.measuredHead,rawTrials:rows.length,fullFactorizationClaim:false,
 periodic107297149:'historical floor(109872280576/1024), plus uncounted flushes; current raw has independent counters',
 stopCounts:Object.fromEntries([...new Set(rows.map(r=>r.kind))].map(k=>[k,rows.filter(r=>r.kind===k).length])),pools,rows};
const output=(p,value)=>{const text=typeof value==='string'?value:JSON.stringify(value,null,2)+'\n';if(process.argv.includes('--check'))assert.equal(read(p).toString(),text);else writeFileSync(join(root,p),text);};
output('docs/benchmarks/llm01-siqs-lab-summary.json',summary);
const show=x=>(x/1000).toFixed(3),integer=x=>x==null?'—':String(x);
let md='# LLM-01 bounded SIQS lab\n\nMeasured implementation: '+run.measuredHead+'. Frozen plan: [38 trials](../../bench/siqs-lab-plan.json). All runtime source hashes, initial asset hashes, common graph counts and raw conditions are checked by scripts/report-siqs-lab.mjs.\n\n';
md+='These are short diagnostic observations on one host, not factorization completion benchmarks. The status verified means all imported relations passed the native polynomial verification; it does not mean N was factored. No complete-factorization or RSA100 ETA is claimed.\n\n';
md+='## Monitoring controls\n\n| Trial | Collector compute s | Request s | C periodic | Flush | JS deliveries | JS clocks | Probe clocks | Relations / full / partial / cycles |\n|---|---:|---:|---:|---:|---:|---:|---:|---|\n';
for(const r of rows.filter(r=>r.stage==='meter')){const p=r.phases.find(p=>p.phase==='collect'),n=p?.notifications,g=r.graph;md+='| '+r.id+' | '+show(p?.computeWallMs??0)+' | '+show(r.elapsedMs)+' | '+integer(n?.observedPeriodic)+' | '+integer(n?.observedFlush)+' | '+integer(n?.observedDeliveries)+' | '+integer(n?.clockCalls)+' | '+integer(p?.probeClockCalls)+' | '+(g?[g.uniqueRelations,g.full,g.partial,g.combined].join(' / '):'unavailable')+' |\n';}
md+='\nCounters, coarse phase probes and RAM sampling have separate controls. Mandatory finite-work polling and CDP quiet-runtime auditing remain common costs. Two seeds with one repeat are diagnostic evidence, not a robust statistical speedup estimate. Compare collector work and saved bytes before interpreting time differences. Inclusive timers overlap; throughSnapshotMs includes any open, censored timer. Do not sum them.\n\n';
md+='## Coarse phase probes\n\n| Trial / phase timer | Closed ms | Through snapshot ms | Calls | Open at stop |\n|---|---:|---:|---:|---|\n';
for(const r of rows.filter(r=>r.stage==='meter'&&r.variant==='probes'))for(const p of r.phases.filter(p=>p.phase==='collect'))for(const v of p.timers)md+='| '+r.id+' / '+v.name+' | '+v.ms.toFixed(3)+' | '+v.throughSnapshotMs.toFixed(3)+' | '+v.calls+' | '+v.open+' |\n';
md+='\nThe sieving-inclusive timer covers do_sieving_internal only; factor-base initialization and later matrix phases are outside it. Residual-split covers the explicitly instrumented SQUFOF call, not every large-prime decision. Unreached matrix phases cannot be profiled from these short collection trials.\n\n';
md+='## Parameter controls\n\n| Trial | Request s | Work | FB size | Unique / full / partial / cycles | Target | Native verified |\n|---|---:|---:|---:|---|---:|---|\n';
for(const r of rows.filter(r=>r.stage==='parameter')){const g=r.graph;md+='| '+r.id+' | '+show(r.elapsedMs)+' | '+r.chargedOperations+' | '+integer(r.fbSize)+' | '+(g?[g.uniqueRelations,g.full,g.partial,g.combined].join(' / '):'unavailable')+' | '+integer(r.target)+' | '+r.nativeVerified+' |\n';}
md+='\nEach parameter changes one setting. Wall/work ceilings are equal; instrumented work is not an equal primitive-operation count across parameter choices. Relation yield, target size, matrix readiness and memory must be considered together. Losing candidates and failures remain in raw files.\n\n';
md+='## Shared two-stream collection\n\n| Input | One Worker request s | Two Workers request s | Mean request ratio | Equal-work byte identity |\n|---|---|---|---:|---|\n';
for(const p of pools)md+='| '+p.caseId+' | '+p.oneMs.map(show).join(', ')+' | '+p.twoMs.map(show).join(', ')+' | '+p.ratioOfMean.toFixed(3)+' | '+p.completeWork+' |\n';
md+='\nBoth controls run seeds 1 and 11 with the same aggregate allowance and host deadline. Collectors retire before one fresh merger; every unique imported relation is verified natively and one common large-prime graph is rebuilt. Lane cycle counts are never added. Equal-work hashes above are checked across both repeats and worker counts; time-censored runs cannot establish this comparison.\n\n';
md+='WASM is fixed at 256MiB per instance, at most 512MiB concurrently. Combined source records are capped at 16MiB/200000 relations; live serialized buffers at 64MiB. Chrome-tree RSS/PSS are sampled, include other overhead and are not a hard whole-browser cap. No network activity occurred after initial assets in any trial; detector positive controls ran afterwards.\n\n';
md+='The 96-digit balanced input is a fixed constructive corpus case, not a representative distribution; prior p−1 construction bias remains. RSA100 and this case cannot establish general maximum digits. Stage13 used different memory/save bounds, so old/new speed ratios are not inferred. Alpertron, native YAFU and GNFS remain separate alternatives with no browser performance comparison here.\n\n';
md+='## Raw evidence\n\n| Trial | Status | Raw | SHA256 |\n|---|---|---|---|\n';
for(const r of rows)md+='| '+r.id+' | '+r.kind+' | [JSON](staged-siqs-lab-stage14/'+r.id+'.json), [log](staged-siqs-lab-stage14/'+r.id+'.log) | '+r.sha256+' |\n';
output('docs/benchmarks/llm01-siqs-lab.md',md);
console.log(JSON.stringify({rawTrials:rows.length,stopCounts:summary.stopCounts,pools}));
