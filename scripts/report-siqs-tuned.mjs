import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {mergeRelationStreams,notificationAccounting,planLanes} from '../src/siqs-tuned/contracts.js';
const root=resolve(import.meta.dirname,'..'),dir='docs/benchmarks/staged-siqs-opt-stage15',ev='docs/benchmarks/archive/validation-logs/staged-siqs-opt-stage15';
const read=p=>readFileSync(join(root,p)),json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const plan=json('bench/staged-siqs-opt-plan.json'),run=json(dir+'/run-all.json'),builds={base:json('native/siqs-lab/staged-build.json'),lto:json('native/siqs-tuned/staged-build.json')};
assert.equal(run.plan,plan.id);assert.equal(run.planSha256,sha(read('bench/staged-siqs-opt-plan.json')));assert.match(run.measuredHead,/^[a-f0-9]{40}$/);
assert.equal(plan.trials.length,28);assert.equal(run.trials.length,28);assert.deepEqual(run.trials.map(t=>t.id),plan.trials.map(t=>t.id));assert.ok(run.trials.every(t=>t.exitCode===0&&!t.signal&&!t.error));
assert.deepEqual(builds.base.patched,builds.lto.patched);assert.deepEqual(builds.base.upstreams,builds.lto.upstreams);
const manifest=json(ev+'/manifest.json');assert.equal(manifest.measuredHead,run.measuredHead);
for(const[p,h]of Object.entries(manifest.files))assert.equal(sha(read(ev+'/'+p)),h,'Evidence '+p);
for(const engine of ['base','lto']){
 const r=json(ev+'/browser-'+engine+'-head.json');assert.equal(r.measuredHead,run.measuredHead);assert.equal(r.engine,engine);assert.equal(r.mode,'siqs-tuned-contracts');
 assert.equal(r.records[0].tests.length,12);assert.ok(r.records[0].tests.every(t=>t.pass));assert.equal(r.records[0].performanceMeasurement,false);
 assert.equal(r.ownership.live,0);assert.equal(r.quiet.networkRequests,0);assert.equal(r.quiet.httpRequests,0);assert.equal(r.quiet.badEvents,0);
 for(const[p,h]of Object.entries(r.sourceFiles))assert.equal(sha(read(p)),h,'Contract source '+p);
}
const catalog=JSON.parse(read('bench/staged-rsa/catalog.json')),c=catalog.find(x=>x.id==='RSA-100'),rows=[];
const graphData=g=>Object.fromEntries(Object.entries(g).filter(([k])=>!['bytes','verified'].includes(k)));
const decode=x=>{assert.ok(x&&Number.isInteger(x.bytes)&&x.bytes>=0&&x.bytes<=16777216);const b=Buffer.from(x.base64,'base64');assert.equal(b.length,x.bytes);assert.equal(b.toString('base64'),x.base64);return b;};
assert.deepEqual(readdirSync(join(root,dir)).filter(p=>p.endsWith('.json')&&p!=='run-all.json').sort(),plan.trials.map(t=>t.id+'.json').sort());
for(const t of plan.trials){
 const file=dir+'/'+t.id+'.json',r=json(file);assert.equal(r.mode,'siqs-tuned-measurement');assert.equal(r.engine,t.engine);assert.equal(r.measuredHead,run.measuredHead);
 assert.equal(r.trialId,t.id);assert.equal(r.caseId,t.case);assert.equal(r.variant,t.variant);assert.equal(r.seed,t.seed);assert.equal(r.budgetMs,t.budgetMs);assert.equal(r.memoryMode,'on');
 for(const[p,h]of Object.entries(r.sourceFiles))assert.equal(sha(read(p)),h,'Measured source '+p);
 for(const a of r.initialAssets){assert.ok(!/oracle|manifest/.test(a.path));assert.equal(read(a.path.slice(1)).length,a.bytes);assert.equal(sha(read(a.path.slice(1))),a.sha256);}
 assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
 assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
 assert.equal(r.assetBoundarySelfTest.length,6);assert.ok(r.assetBoundarySelfTest.every(x=>x.status===404));assert.equal(r.ownership.live,0);assert.ok(r.ownership.maxLive<=t.workers);assert.ok(r.sampledRam.samples>0);
 assert.equal(r.records.length,1);const record=r.records[0],o=record.outcome;
 assert.equal(record.engine,t.engine);assert.equal(record.input,c.input);assert.equal(record.bits,c.bits);assert.equal(record.digits,c.digits);assert.equal(record.knownFactorsUsed,false);
 assert.deepEqual(record.options,{variant:t.variant,timeBudgetMs:t.budgetMs,seed:1,workers:t.workers,streams:2,operationBudget:t.operations,blockQuota:0});
 assert.equal(o.input,c.input);assert.equal(o.allWorkersDisposed,true);assert.ok(o.peakWorkers<=t.workers);assert.ok(o.peakWasmBytes<=t.workers*268435456);
 assert.equal(o.serializedBufferCap,67108864);assert.ok(o.elapsedMs>=0&&o.elapsedMs<t.budgetMs+1000);assert.ok(o.chargedOperations<=t.operations);
 const collectionBudget=Math.floor(t.operations*4/5);assert.deepEqual(o.plan,{...planLanes({workers:t.workers,operationBudget:t.operations,timeBudgetMs:t.budgetMs}),streams:2,lanes:planLanes({workers:t.workers,operationBudget:collectionBudget,timeBudgetMs:t.budgetMs}).lanes,collectionBudget});
 const collectors=[],phases=[];let charged=0;
 for(const x of o.records){
  const p=x.packet,s=p.stats;assert.equal(p.version,15);assert.equal(p.phase,x.phase);assert.ok(p.operations<=x.allowance&&s.work<=p.operations);charged+=p.operations;
  if(p.meta.fbSize){assert.equal(p.meta.build,builds[t.engine].wasmSha256);assert.equal(p.meta.input,c.input);assert.equal(p.meta.parameters,'0');}
  if(s.notifications?.observedPeriodic!=null)assert.deepEqual(notificationAccounting({work:s.work,stride:o.settings.stride,periodic:s.notifications.observedPeriodic,flush:s.notifications.observedFlush,deliveries:s.notifications.observedDeliveries,clockCalls:s.notifications.clockCalls,probeClockCalls:s.probeClockCalls}),s.notifications);
  if(s.phaseWork)assert.equal(s.phaseWork.reduce((a,b)=>a+b,0),s.work);
  if(p.divisor!==null){const d=BigInt(p.divisor);assert.ok(d>1n&&d<BigInt(c.input)&&BigInt(c.input)%d===0n);}
  const bytes=p.buffer?decode(p.buffer):null;
  if(p.headerPrefix){assert.equal(p.normal,false);assert.equal(p.buffer,null);assert.equal(decode(p.headerPrefix).toString(),(BigInt(c.input)*BigInt(p.meta.multiplier)).toString(16));}
  if(x.phase==='collect'&&bytes)collectors.push({meta:p.meta,bytes,seed:x.seed,work:s.work,allowance:x.allowance,stop:p.stop});
  phases.push({phase:x.phase,seed:x.seed,stop:p.stop,normal:p.normal,work:s.work,graphWork:p.graphWork,nativePhase:s.phase,nnz:s.nnz,saveBytes:s.saveBytes,verifiedRelations:s.verifiedRelations,phaseWork:s.phaseWork,notifications:s.notifications,initializationMs:x.initializationMs,computeWallMs:x.computeWallMs,blocks:s.blocks,basePolynomials:s.basePolynomials,derivedPolynomials:s.derivedPolynomials});
 }
 for(const h of o.hostStops){assert.ok(Number.isSafeInteger(h.charged)&&h.charged>=0);charged+=h.charged;}assert.equal(charged,o.chargedOperations);
 let graph=null;if(collectors.length){graph=mergeRelationStreams(collectors,collectors[0].meta);if(o.merged?.graph){assert.deepEqual(graphData(o.merged.graph),graphData(graph));if(o.merged.graph.verified)assert.equal(o.merged.stats.verifiedRelations,graph.uniqueRelations);}}
 if(o.kind==='verified'){assert.equal(o.merged?.graph?.verified,true);assert.equal(o.merged.normal,true);}
 rows.push({id:t.id,stage:t.stage,engine:t.engine,variant:t.variant,workers:t.workers,budgetMs:t.budgetMs,kind:o.kind,error:o.error,elapsedMs:o.elapsedMs,chargedOperations:o.chargedOperations,hostStops:o.hostStops,graph:graph?graphData(graph):null,nativeVerified:o.merged?.graph?.verified??false,target:o.merged?.relations?.target??null,phases,sampledRam:r.sampledRam,streams:collectors.map(x=>({seed:x.seed,work:x.work,allowance:x.allowance,stop:x.stop,bytes:x.bytes.length,sha256:sha(x.bytes),localGraph:graphData(mergeRelationStreams([x],x.meta))})),file,sha256:sha(read(file)),logSha256:sha(read(dir+'/'+t.id+'.log'))});
}
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length,stats=a=>({count:a.length,min:Math.min(...a),mean:mean(a),max:Math.max(...a)});
const short=rows.filter(r=>r.stage==='short'),long=rows.filter(r=>r.stage==='long');
assert.equal(short.length,24);assert.equal(long.length,4);
const allFixedWork=short.every(r=>r.streams.length===2&&r.streams.every(s=>s.work===800000000&&s.allowance===800000000&&s.stop==='operation-budget'));
const byteEquivalence=Object.fromEntries([1,11].map(seed=>[seed,{observed:short.filter(r=>r.streams.some(s=>s.seed===seed)).length,hashes:[...new Set(short.flatMap(r=>r.streams.filter(s=>s.seed===seed).map(s=>s.sha256)))].sort()}]));
const equalBytes=allFixedWork&&Object.values(byteEquivalence).every(x=>x.observed===24&&x.hashes.length===1);
const groups=[];
for(const workers of [1,2])for(const engine of ['base','lto'])for(const variant of ['base','clock16','stride16k']){
 const rs=short.filter(r=>r.workers===workers&&r.engine===engine&&r.variant===variant);assert.equal(rs.length,2);
 const baseline=short.filter(r=>r.workers===workers&&r.engine==='base'&&r.variant==='base');
 groups.push({workers,engine,variant,wallMs:stats(rs.map(r=>r.elapsedMs)),ratioToBaseline:mean(baseline.map(r=>r.elapsedMs))/mean(rs.map(r=>r.elapsedMs)),equivalentWorkAndBytes:equalBytes,allNativeVerified:rs.every(r=>r.nativeVerified)});
}
const horizons=['base','lto'].map(engine=>{const rs=long.filter(r=>r.engine===engine);assert.equal(rs.length,2);return{engine,variant:rs[0].variant,work:stats(rs.map(r=>r.chargedOperations)),unique:stats(rs.map(r=>r.graph?.uniqueRelations??0)),full:stats(rs.map(r=>r.graph?.full??0)),partial:stats(rs.map(r=>r.graph?.partial??0)),cycles:stats(rs.map(r=>r.graph?.combined??0)),allNativeVerified:rs.every(r=>r.nativeVerified)};});
const summary={plan:plan.id,measuredHead:run.measuredHead,rawTrials:28,allFixedWork,equalBytes,byteEquivalence,fullFactorizationClaim:false,groups,horizons,rows};
const output=(p,value)=>{const text=typeof value==='string'?value:JSON.stringify(value,null,2)+'\n';if(process.argv.includes('--check'))assert.equal(read(p).toString(),text);else writeFileSync(join(root,p),text);};
output('docs/benchmarks/llm01-siqs-opt-summary.json',summary);
const secs=x=>(x/1000).toFixed(3),mib=x=>(x/1048576).toFixed(1);
let md='# Stage15 bounded RSA100 SIQS optimization\n\nMeasured head: '+run.measuredHead+'. [Frozen 28-trial plan](../../bench/staged-siqs-opt-plan.json). Historical Stage14 38 trials and all old source/artifacts remain unchanged.\n\n';
md+='The baseline and LTO artifacts use identical C patches and upstream bytes. LTO adds only -flto to existing msieve compile/link flags (-O3); GMP stays -O2. Both profiles use the same new version15 wrapper, at most 60s, fixed 256MiB WASM per owner, and the same source verification. This measures a compiler candidate, not a new factorization algorithm.\n\n';
md+='## Equal-work short comparisons\n\nAll 24 streams-pairs reach the prescribed work: '+allFixedWork+'. Each seed has identical saved bytes across every compiler, monitor, worker count and repeat: '+equalBytes+'. Every actual relation is checked again natively; verified means relation proof, not complete factorization.\n\n| Workers | Engine | Monitoring | Request s mean (min–max) | Baseline/request ratio |\n|---:|---|---|---|---:|\n';
for(const g of groups)md+='| '+g.workers+' | '+g.engine+' | '+g.variant+' | '+secs(g.wallMs.mean)+' ('+secs(g.wallMs.min)+'–'+secs(g.wallMs.max)+') | '+g.ratioToBaseline.toFixed(3)+' |\n';
md+='\nThese are two alternating-order observations per condition on one host. Initial Worker compilation, computation, proof and delivery are included in request time; source asset loading is separately recorded. Mandatory budget polling and CDP auditing remain. No statistical confidence interval or general speed guarantee is claimed.\n\n';
md+='## Four 60-second horizon trials\n\nThe fixed ABBA comparison is base/base versus LTO/stride16k. It combines compiler and callback changes; the short factorial separates their effects. Both use two streams, the same seeds 1/11, total work ceiling 1000000000000, common managed-WASM ceiling 512MiB and one initialization-inclusive 60000ms host deadline. Known C work, graph work and conservatively charged unknown terminated work remain distinct.\n\n| Trial | Request s | Charged work | Unique / full / partial / common cycles | Lane cycles sum | Target | Proof | Peak sampled PSS MiB |\n|---|---:|---:|---|---:|---:|---|---:|\n';
for(const r of long){const g=r.graph;md+='| '+r.id+' | '+secs(r.elapsedMs)+' | '+r.chargedOperations+' | '+(g?[g.uniqueRelations,g.full,g.partial,g.combined].join(' / '):'unavailable')+' | '+r.streams.reduce((s,x)=>s+x.localGraph.combined,0)+' | '+r.target+' | '+r.nativeVerified+' | '+mib(r.sampledRam.peakPssBytes)+' |\n';}
md+='\nA time-budget collection stop is censoring; later successful relation verification does not turn it into completed factorization. Raw files retain every phase, open condition, failure and host stop. Matrix work and RSA100 completion must be demonstrated, never extrapolated from relation yield.\n\n';
md+='WASM allocations are fixed/unshared with rejected growth. Combined saves remain at most16MiB/200000 records and live serialized buffers64MiB; browser RSS/PSS are sampled and include additional JS/browser overhead, not a hard whole-browser RAM cap. The optimized WASM is '+builds.lto.wasmBytes+' bytes versus '+builds.base.wasmBytes+' baseline bytes, so artifact/initialization cost is also relevant. No runtime network activity was observed; source server stopped before every calculation and detector positive controls ran afterwards.\n\n';
md+='## Raw evidence\n\n| Trial | Result | Receipt and log | SHA256 |\n|---|---|---|---|\n';
for(const r of rows)md+='| '+r.id+' | '+r.kind+' | [JSON](staged-siqs-opt-stage15/'+r.id+'.json), [log](staged-siqs-opt-stage15/'+r.id+'.log) | '+r.sha256+' |\n';
output('docs/benchmarks/llm01-siqs-opt.md',md);
console.log(JSON.stringify({rawTrials:28,equalBytes,groups,horizons}));
