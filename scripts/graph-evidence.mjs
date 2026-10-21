// SPDX-License-Identifier: AGPL-3.0-only
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';import{join}from'node:path';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';
import{validateStreamRecord}from'./sustained-proof.mjs';
import{validateStreamRecord as validateManyRecord}from'./graph-multicore-proof.mjs';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function historicalHashes(head,paths){
 assert.match(head,/^[a-f0-9]{40}$/);
 const names=[...new Set(paths)];for(const p of names)assert.match(p,/^(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9_./-]+$/);
 const out=execFileSync('git',['cat-file','--batch'],{input:names.map(p=>head+':'+p+'\n').join(''),maxBuffer:64*1048576}),result=new Map();let offset=0;
 for(const p of names){const end=out.indexOf(10,offset);assert.ok(end>offset);const header=out.subarray(offset,end).toString();assert.match(header,/^[a-f0-9]{40} blob [0-9]+$/);const n=Number(header.split(' ')[2]);assert.ok(Number.isSafeInteger(n)&&n>=0&&end+2+n<=out.length);const b=out.subarray(end+1,end+1+n);assert.equal(out[end+1+n],10);result.set(p,sha(b));offset=end+2+n;}
 assert.equal(offset,out.length);return result;
}
export function validateCampaign(dir,{requireComplete=true}={}){
 const run=JSON.parse(readFileSync(join(dir,'run.json')));assert.match(run.head,/^[a-f0-9]{40}$/);
 if(requireComplete)assert.ok(run.completedAt&&!run.stoppedAt);
 const many=run.plan.includes('multicore')||run.plan.includes('builtin')||run.plan.includes('dedicated')||run.plan.includes('integrated');const records=[],sources=new Map();
 for(const row of run.trials){
  assert.equal(row.state,'completed');assert.equal(row.exitCode,0);assert.ok(row.availableMiB>=4096);
  const raw=readFileSync(join(dir,row.id+'.json')),log=readFileSync(join(dir,row.id+'.log'));assert.equal(sha(raw),row.sha256);assert.equal(raw.length,row.bytes);assert.ok(raw.length<=1048576);assert.equal(sha(log),row.logSha256);
  const r=JSON.parse(raw);assert.equal(r.measuredHead,run.head);assert.equal(r.graphVariant,row.graph);assert.equal(r.budgetMs,row.budgetMs);if(many){assert.equal(r.variant,row.engine);assert.equal(r.slots,row.slots);if(row.coordinator)assert.equal(r.coordinator,row.coordinator);assert.ok([4,8].includes(r.slots));}
  assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
  assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
  assert.ok(r.sampledRam.peakPssBytes<1536*1048576);
  for(const[p,h]of Object.entries({...r.sourceFiles,...r.graphSourceFiles})){assert.match(h,/^[a-f0-9]{64}$/);if(sources.has(p))assert.equal(sources.get(p),h);sources.set(p,h);}
  for(const a of r.initialAssets){assert.equal(sources.get(a.path.slice(1)),a.sha256);}
  assert.equal(r.records.length,1);const record=r.records[0];
  if(record.outcome){(many?validateManyRecord:validateStreamRecord)(record);const o=record.outcome;assert.equal(o.allWorkersDisposed,true);assert.equal(o.allWorkerSourcesReleased,true);assert.ok(o.maximumWasmBytes<=(many?576:448)*1048576);assert.ok(o.peakTransportBytes<=(many?64:32)*1048576);assert.ok(o.creditState.peakOutstanding<=(many?8:4));assert.ok(o.memoryByOwner.every(x=>x.last.allocationFailures===0));assert.ok(record.graphSnapshots.length<=256);
   assert.ok(['timeout','incomplete','factorized','probable',...(run.plan.includes('integrated')?['cancelled']:[])].includes(o.kind));assert.ok(!record.resourceStop);
  }else assert.ok(record.tests.every(t=>t.pass));
  records.push({row,receipt:r,record});
 }
 const hashes=historicalHashes(run.head,[...sources.keys()]);for(const[p,h]of sources)assert.equal(hashes.get(p),h,'Pinned historical source '+p);
 const planPath=run.plan.includes('dedicated')?'bench/staged-graph-dedicated-plan.json':run.plan.includes('integrated')?'bench/staged-graph-integrated-plan.json':run.plan.includes('multicore')?'bench/staged-graph-multicore-plan.json':run.plan.includes('builtin')?'bench/staged-graph-builtin-plan.json':run.plan.includes('full-control')?'bench/staged-graph-full-plan.json':run.plan.includes('packed')?'bench/staged-graph-arena-plan.json':run.plan.includes('release')?'bench/staged-graph-release-plan.json':'bench/staged-graph-plan.json';
 const driverPath=planPath.replace('bench/staged-graph-','scripts/benchmark-graph-').replace('-plan.json','.mjs').replace('scripts/benchmark-graph-plan.json','scripts/benchmark-graph-profile.mjs');
 const driver=run.plan.includes('dedicated')||run.plan.includes('integrated')?'scripts/benchmark-graph-followup.mjs':planPath==='bench/staged-graph-plan.json'?'scripts/benchmark-graph-profile.mjs':driverPath;
 const hashes2=historicalHashes(run.head,[planPath,driver]);assert.equal(hashes2.get(planPath),run.planSha256);assert.equal(hashes2.get(driver),run.driverSha256);
 const plan=JSON.parse(execFileSync('git',['show',run.head+':'+planPath],{encoding:'utf8'}));assert.equal(plan.id,run.plan);assert.deepEqual(run.trials.map(r=>({id:r.id,graph:r.graph,budgetMs:r.budgetMs,...(r.case?{case:r.case}:{}),...(r.fixedFamilies?{fixedFamilies:r.fixedFamilies}:{}),...(r.engine?{engine:r.engine}:{}),...(r.slots?{slots:r.slots}:{}),...(r.coordinator?{coordinator:r.coordinator}:{}),...(r.cancelAfterMs?{cancelAfterMs:r.cancelAfterMs}:{}),...(r.memoryMiB?{memoryMiB:r.memoryMiB}:{})})),plan.trials.map(r=>({id:r.id,graph:r.graph,budgetMs:r.budgetMs,...(r.case?{case:r.case}:{}),...(r.fixedFamilies?{fixedFamilies:r.fixedFamilies}:{}),...(r.engine?{engine:r.engine}:{}),...(r.slots?{slots:r.slots}:{}),...(r.coordinator?{coordinator:r.coordinator}:{}),...(r.cancelAfterMs?{cancelAfterMs:r.cancelAfterMs}:{}),...(r.memoryMiB?{memoryMiB:r.memoryMiB}:{})})));
 assert.ok(plan.trials.reduce((n,r)=>n+r.budgetMs,0)<=plan.limits.totalCalculationMs);
 return{run,records};
}
export function compareAccepted(records,family){
 const views=records.map(({record:r})=>{assert.ok(r.outcome.familiesSubmitted>=family);return{
  packets:r.familyDigests.filter(x=>x.family<family).map(x=>[x.family,x.sha256]),
  columns:r.graphColumns.find(x=>x.family===family)?.sha256,
  progress:r.progressTimeline.find(x=>x.families===family),
 };});
 assert.ok(views[0].columns);for(const v of views){assert.equal(v.packets.length,family);assert.deepEqual(v.packets,views[0].packets);assert.equal(v.columns,views[0].columns);assert.deepEqual(v.progress.collectorStats,views[0].progress.collectorStats);}
 return views;
}
export const median=a=>{const s=[...a].sort((x,y)=>x-y);return s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2;};
