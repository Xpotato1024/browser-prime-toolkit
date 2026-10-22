// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';import{readFileSync,writeFileSync,existsSync}from'node:fs';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';
import{sameFamilies}from'./scheduler-packets.mjs';import{validateStreamRecord}from'./sustained-proof.mjs';import{pairedDecision,extensionGate,grownCancelSafe}from'./sustained-decision.mjs';import{knownDetachedSetup}from'./resource-ui-cdp-lifecycle.mjs';
import{trialRecord,uniqueTrials,verifyBytes}from'./sustained-trial-record.mjs';
export const LEGACY='docs/benchmarks/staged-sustained-stage23',CURRENT='docs/benchmarks/staged-sustained-stage24',OLD_HEAD='2a88e59a5740d204dda40c474fa4959db454062d';
export const SOURCE_PATHS=['scripts/sustained-trial-record.mjs','scripts/sustained-continuation-proof.mjs','scripts/generate-sustained-continuation.mjs','scripts/benchmark-sustained-continuation.mjs','scripts/report-sustained-closure.mjs','test/sustained-trial-record.test.js','docs/contracts/sustained-continuation.md'];
const read=p=>readFileSync(p),sha=b=>createHash('sha256').update(b).digest('hex'),plan=JSON.parse(read('bench/staged-sustained-plan.json')),expectedInput=JSON.parse(read('bench/staged-rsa/catalog.json')).find(r=>r.id===plan.case).input;
export function historicalRun(){
 const bytes=read(LEGACY+'/run.json');verifyBytes(bytes,'62681bc52b71dfb302999ff16d7d16f200e90c40cd3afbc067a506febee30683');const old=JSON.parse(bytes);assert.equal(old.measuredHead,OLD_HEAD);assert.ok(old.stoppedAt&&!old.completedAt&&old.stopReason.includes('ids.has'));
 assert.deepEqual(['preflight','controls','coordinator','sustained','cancels','extension'].map(k=>old[k].length),[5,3,4,0,0,0]);return{old,sha256:sha(bytes)};
}
export function validateCampaign(run){
 const cache=new Map(),{old,sha256}=historicalRun();assert.equal(run.sourceRun.sha256,sha256);assert.equal(run.sourceRun.path,LEGACY+'/run.json');assert.equal(run.sourceRun.measuredHead,OLD_HEAD);assert.equal(run.sourceRun.stopReason,old.stopReason);
 for(const phase of ['preflight','controls','coordinator']){
  assert.equal(run[phase].length,old[phase].length);
  run[phase].forEach((r,i)=>{const{evidenceDir,evidenceHead,...row}=r;assert.equal(evidenceDir,LEGACY);assert.equal(evidenceHead,OLD_HEAD);assert.deepEqual(row,old[phase][i]);});
 }
 assert.deepEqual(run.preflight.map(r=>[r.coordinator,r.workers,r.budgetMs]),[['combined',2,30000],['combined',4,30000],['dedicated',2,30000],['dedicated',3,30000],['dedicated',4,30000]]);
 assert.deepEqual(run.controls.map(r=>[r.coordinator,r.workers,r.fixedFamilies,r.budgetMs]),[['combined',2,4,60000],['combined',4,4,60000],['dedicated',4,4,60000]]);
 assert.deepEqual(Object.keys(run.continuationSourceFiles).sort(),[...SOURCE_PATHS].sort());
 for(const[p,h]of Object.entries(run.continuationSourceFiles)){verifyBytes(read(p),h);verifyBytes(execFileSync('git',['show',run.measuredHead+':'+p],{maxBuffer:16*1024*1024}),h);}
 for(const phase of ['preflight','controls','coordinator','sustained','cancels','extension'])for(const row of run[phase]){
  assert.equal(row.phase,phase);assert.ok(row.hostBefore.availableMiB>=4096);
  const variants={2:'two-drop',3:'three-drop',4:'four-drop'};
  const suffix='/'+row.evidenceDir+'/'+row.id+'.json';assert.ok(row.args[8].endsWith(suffix));
  const args=['scripts/verify-sustained.mjs','--coordinator',row.coordinator,'--engine',variants[row.workers],'--budget-ms',String(row.budgetMs),'--out',row.args[8]];
  if(phase!=='preflight')args.push('--case',plan.case);if(row.fixedFamilies)args.push('--fixed-families','4');if(row.cancelAfterMs)args.push('--cancel-after-ms',String(row.cancelAfterMs));assert.deepEqual(row.args,args);
 }
assert.equal(run.plan,plan.id);assert.equal(run.planSha256,sha(read('bench/staged-sustained-plan.json')));assert.match(run.measuredHead,/^[a-f0-9]{40}$/);
for(const[phase,key]of [['coordinator','coordinatorTrials'],['sustained','sustainedTrials'],['cancels','cancelControls'],['extension','extensionTrials']]){
 const actual=run[phase].map(({id,coordinator,workers,repeat,budgetMs,cancelAfterMs})=>({id,coordinator,workers,...(repeat===undefined?{}:{repeat}),budgetMs,...(cancelAfterMs===undefined?{}:{cancelAfterMs})}));
 assert.deepEqual(actual,plan[key].slice(0,actual.length),'Predeclared ordered phase '+phase);
}
const all=[],groups={};let complete=Boolean(run.completedAt);assert.ok(!(complete&&run.stoppedAt));const ids=new Set();
for(const phase of ['preflight','controls','coordinator','sustained','cancels','extension']){
 groups[phase]=[];
 for(const row of run[phase]){
  const dir=row.evidenceDir??LEGACY, evidenceHead=row.evidenceHead??OLD_HEAD;assert.ok([LEGACY,CURRENT].includes(dir));assert.equal(evidenceHead,dir===LEGACY?OLD_HEAD:run.measuredHead);
  assert.ok(!ids.has(row.id));ids.add(row.id);assert.equal(sha(read(dir+'/'+row.id+'.log')),row.logSha256);
  if(row.exitCode!==0||row.signal||row.error){assert.ok(!complete&&run.stopReason);if(row.rawSha256)assert.equal(sha(read(dir+'/'+row.id+'.json')),row.rawSha256);else assert.equal(existsSync(dir+'/'+row.id+'.json'),false);continue;}
  const raw=read(dir+'/'+row.id+'.json');assert.equal(sha(raw),row.rawSha256);const r=JSON.parse(raw);assert.equal(r.measuredHead,evidenceHead);assert.equal(r.coordinator,row.coordinator);assert.equal(r.budgetMs,row.budgetMs);assert.equal(r.caseId,phase==='preflight'?null:plan.case);
  assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
  assert.equal(r.ownership.live,0);assert.equal(r.ownership.liveSources,0);assert.ok(r.ownership.maxLive<=row.workers);
  for(const[p,h]of Object.entries(r.sourceFiles)){const key=evidenceHead+':'+p;if(!cache.has(key)){const actual=sha(read(p));assert.equal(actual,sha(execFileSync('git',['show',key],{maxBuffer:16*1024*1024})),p);cache.set(key,actual);}assert.equal(cache.get(key),h,'Every receipt source '+p);}
  const proof=r.detachedSetupProof;for(const d of r.detachedBeforeResume)assert.ok(knownDetachedSetup(d,{detached:new Set(proof.detached),active:new Set(proof.active),workers:new Set(proof.workers)}));
  assert.ok(r.ramTimeline.length>0&&r.ramTimeline.length<=4000);assert.equal(r.sampledRam.samples,r.ramTimeline.length);assert.deepEqual(r.sampledRam.first,r.ramTimeline[0]);assert.equal(r.sampledRam.peakRssBytes,Math.max(...r.ramTimeline.map(x=>x.rssBytes)));assert.equal(r.sampledRam.peakPssBytes,Math.max(...r.ramTimeline.map(x=>x.pssBytes)));assert.ok(r.ramTimeline.every((x,i,a)=>Number.isFinite(x.atMs)&&x.rssBytes>=0&&x.pssBytes>=0&&(!i||x.atMs>=a[i-1].atMs)));
  const nav=r.startupTrace.filter(x=>x.event==='navigate-start')[0],returned=r.startupTrace.filter(x=>x.event==='navigate-returned')[0];assert.ok(nav&&returned&&returned.atMs>=nav.atMs&&returned.atMs-nav.atMs<=30100);
  if(phase==='preflight'){assert.equal(r.records[0].tests.length,16);assert.ok(r.records[0].tests.every(t=>t.pass));continue;}
  assert.equal(r.records.length,1);assert.equal(r.records[0].cancelAfterMs,row.cancelAfterMs??null);const record={...trialRecord(row,r.records[0],expectedInput),sampledRam:r.sampledRam,ramTimeline:r.ramTimeline,ramOriginMs:r.ramOriginMs};validateStreamRecord(record);assert.equal(record.cancelAfterMs,row.cancelAfterMs??null);
  const o=record.outcome;assert.equal(o.workers,row.workers);assert.equal(o.coordinatorCompute,row.coordinator==='combined');assert.equal(o.maximumWasmBytes,(256+64*(row.workers-1))*1048576);
  assert.ok(o.memoryByOwner.every(m=>m.peakLinearBytes<=o.resourcePlan.ownerCapsMiB[m.owner]*1048576));assert.ok(o.peakTransportBytes<=33554432);assert.ok(o.creditState.peakOutstanding<=4&&o.creditState.peakReservedBytes<=33554432);
  if(phase==='cancels')assert.ok(grownCancelSafe(record),'Native graph grew before cancel');groups[phase].push(record);all.push(record);
 }
}
if(all.length)assert.deepEqual(sameFamilies(all),run.familyProof);
if(run.fixedFamilyProof){const reference=JSON.parse(read('docs/benchmarks/staged-resources-stage21/fixed-w4.json')).records[0];assert.deepEqual(sameFamilies([...groups.controls,reference],{fixed:true}),run.fixedFamilyProof);}
if(run.coordinatorDecision)assert.deepEqual(pairedDecision(groups.coordinator,{baseline:'combined',candidate:'dedicated',label:r=>r.coordinator}),run.coordinatorDecision);
if(run.sustainedDecision)assert.deepEqual(pairedDecision(groups.sustained,{baseline:'2',candidate:'4',label:r=>String(r.workers)}),run.sustainedDecision);
if(run.extensionGate)assert.deepEqual(extensionGate({records:groups.sustained,cancels:groups.cancels,availableMiB:run.extensionGate.availableMiB,now:run.extensionGate.checkedAt}),run.extensionGate);
if(run.extensionDecision)assert.deepEqual(pairedDecision(groups.extension,{baseline:'2',candidate:'4',label:r=>String(r.workers)}),run.extensionDecision);
if(complete){assert.equal(run.preflight.length,5);assert.equal(groups.controls.length,3);assert.equal(groups.coordinator.length,4);assert.equal(groups.sustained.length,4);assert.equal(groups.cancels.length,2);assert.equal(groups.extension.length,run.extensionGate.eligible?4:0);assert.ok(run.fixedFamilyProof);}

uniqueTrials(all);return{all,groups,complete};
}
