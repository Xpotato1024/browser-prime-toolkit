// SPDX-License-Identifier: AGPL-3.0-only
// Metadata-only continuation; frozen measured files remain unchanged.
import assert from 'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';
const read=p=>readFileSync(p,'utf8'),write=(p,s)=>{if(process.argv.includes('--check'))assert.equal(read(p),s,p);else writeFileSync(p,s);};
function rep(s,a,b){assert.equal(s.split(a).length,2,a);return s.replace(a,b);}
const original=read('scripts/report-sustained.mjs'),start=original.indexOf('assert.equal(run.plan,plan.id)'),end=original.indexOf('const MiB=1048576');
let validation=original.slice(start,end);
validation=rep(validation,"assert.notEqual(complete,Boolean(run.stoppedAt));","assert.ok(!(complete&&run.stoppedAt));");
validation=rep(validation," for(const row of run[phase]){"," for(const row of run[phase]){\n  const dir=row.evidenceDir??LEGACY, evidenceHead=row.evidenceHead??OLD_HEAD;assert.ok([LEGACY,CURRENT].includes(dir));assert.equal(evidenceHead,dir===LEGACY?OLD_HEAD:run.measuredHead);");
validation=rep(validation,"assert.equal(r.measuredHead,run.measuredHead);","assert.equal(r.measuredHead,evidenceHead);");
validation=rep(validation,"  for(const[p,h]of Object.entries(r.sourceFiles)){if(!cache.has(p)){const actual=sha(read(p));assert.equal(actual,sha(execFileSync('git',['show',run.measuredHead+':'+p],{maxBuffer:16*1024*1024})),p);cache.set(p,actual);}assert.equal(cache.get(p),h,'Every receipt source '+p);}",
"  for(const[p,h]of Object.entries(r.sourceFiles)){const key=evidenceHead+':'+p;if(!cache.has(key)){const actual=sha(read(p));assert.equal(actual,sha(execFileSync('git',['show',key],{maxBuffer:16*1024*1024})),p);cache.set(key,actual);}assert.equal(cache.get(key),h,'Every receipt source '+p);}");
validation=rep(validation,"  const record={...row,...r.records[0],sampledRam:r.sampledRam,ramTimeline:r.ramTimeline,ramOriginMs:r.ramOriginMs};",
"  assert.equal(r.records.length,1);assert.equal(r.records[0].cancelAfterMs,row.cancelAfterMs??null);const record={...trialRecord(row,r.records[0],expectedInput),sampledRam:r.sampledRam,ramTimeline:r.ramTimeline,ramOriginMs:r.ramOriginMs};");
const header=original.slice(0,original.indexOf("const dir="));
const prelude=[
"import{trialRecord,uniqueTrials,verifyBytes}from'./sustained-trial-record.mjs';",
"export const LEGACY='docs/benchmarks/staged-sustained-stage23',CURRENT='docs/benchmarks/staged-sustained-stage24',OLD_HEAD='2a88e59a5740d204dda40c474fa4959db454062d';",
"export const SOURCE_PATHS=['scripts/sustained-trial-record.mjs','scripts/sustained-continuation-proof.mjs','scripts/generate-sustained-continuation.mjs','scripts/benchmark-sustained-continuation.mjs','scripts/report-sustained-closure.mjs','test/sustained-trial-record.test.js','docs/contracts/sustained-continuation.md'];",
"const read=p=>readFileSync(p),sha=b=>createHash('sha256').update(b).digest('hex'),plan=JSON.parse(read('bench/staged-sustained-plan.json')),expectedInput=JSON.parse(read('bench/staged-rsa/catalog.json')).find(r=>r.id===plan.case).input;",
"export function historicalRun(){",
" const bytes=read(LEGACY+'/run.json');verifyBytes(bytes,'62681bc52b71dfb302999ff16d7d16f200e90c40cd3afbc067a506febee30683');const old=JSON.parse(bytes);assert.equal(old.measuredHead,OLD_HEAD);assert.ok(old.stoppedAt&&!old.completedAt&&old.stopReason.includes('ids.has'));",
" assert.deepEqual(['preflight','controls','coordinator','sustained','cancels','extension'].map(k=>old[k].length),[5,3,4,0,0,0]);return{old,sha256:sha(bytes)};",
"}",
"export function validateCampaign(run){",
" const cache=new Map(),{old,sha256}=historicalRun();assert.equal(run.sourceRun.sha256,sha256);assert.equal(run.sourceRun.path,LEGACY+'/run.json');assert.equal(run.sourceRun.measuredHead,OLD_HEAD);assert.equal(run.sourceRun.stopReason,old.stopReason);",
" for(const phase of ['preflight','controls','coordinator']){",
"  assert.equal(run[phase].length,old[phase].length);",
"  run[phase].forEach((r,i)=>{const{evidenceDir,evidenceHead,...row}=r;assert.equal(evidenceDir,LEGACY);assert.equal(evidenceHead,OLD_HEAD);assert.deepEqual(row,old[phase][i]);});",
" }",
" assert.deepEqual(run.preflight.map(r=>[r.coordinator,r.workers,r.budgetMs]),[['combined',2,30000],['combined',4,30000],['dedicated',2,30000],['dedicated',3,30000],['dedicated',4,30000]]);",
" assert.deepEqual(run.controls.map(r=>[r.coordinator,r.workers,r.fixedFamilies,r.budgetMs]),[['combined',2,4,60000],['combined',4,4,60000],['dedicated',4,4,60000]]);",
" assert.deepEqual(Object.keys(run.continuationSourceFiles).sort(),[...SOURCE_PATHS].sort());",
" for(const[p,h]of Object.entries(run.continuationSourceFiles)){verifyBytes(read(p),h);verifyBytes(execFileSync('git',['show',run.measuredHead+':'+p],{maxBuffer:16*1024*1024}),h);}",
" for(const phase of ['preflight','controls','coordinator','sustained','cancels','extension'])for(const row of run[phase]){",
"  assert.equal(row.phase,phase);assert.ok(row.hostBefore.availableMiB>=4096);",
"  const variants={2:'two-drop',3:'three-drop',4:'four-drop'};",
"  const suffix='/'+row.evidenceDir+'/'+row.id+'.json';assert.ok(row.args[8].endsWith(suffix));",
"  const args=['scripts/verify-sustained.mjs','--coordinator',row.coordinator,'--engine',variants[row.workers],'--budget-ms',String(row.budgetMs),'--out',row.args[8]];",
"  if(phase!=='preflight')args.push('--case',plan.case);if(row.fixedFamilies)args.push('--fixed-families','4');if(row.cancelAfterMs)args.push('--cancel-after-ms',String(row.cancelAfterMs));assert.deepEqual(row.args,args);",
" }",
].join('\n')+'\n';
write('scripts/sustained-continuation-proof.mjs',header+prelude+validation+"\nuniqueTrials(all);return{all,groups,complete};\n}\n");
let report=original.slice(end);
report=rep(report,"'\`。plan \`'+run.plan","'\`、旧core \`'+OLD_HEAD+'\`。plan \`'+run.plan");
report=rep(report,"out+=complete?","out+='Stage23は4集約試行の取得後、入力IDが試行IDを上書きした集計不具合で停止しました。旧manifest/raw/log/計算sourceは保持し、Stage24は識別子を分離して残予定だけ実行しました。旧系列を完了扱いにせず、両headのsource/hashを検証しています。\\n\\n';\nout+=complete?");
report=rep(report,"const r of run[phase])out+=","const r of run[phase]){const dir=r.evidenceDir;out+=");
report=report.replaceAll("'[raw](staged-sustained-stage23/'","'[raw]('+dir.slice('docs/benchmarks/'.length)+'/'").replaceAll("'[log](staged-sustained-stage23/'","'[log]('+dir.slice('docs/benchmarks/'.length)+'/'");
report=rep(report,"+'.log)\\n';","+'.log)\\n';}");
report=rep(report,"[manifest](staged-sustained-stage23/run.json)","[旧manifest](staged-sustained-stage23/run.json) と [継続manifest](staged-sustained-stage24/run.json)");
write('scripts/report-sustained-closure.mjs',header+"import{validateCampaign,OLD_HEAD,CURRENT}from'./sustained-continuation-proof.mjs';\nconst read=p=>readFileSync(p),run=JSON.parse(read(CURRENT+'/run.json')),target='docs/benchmarks/llm01-sustained.md';const{all,groups,complete}=validateCampaign(run);\n"+report);
let driver=read('scripts/benchmark-sustained.mjs');
driver=rep(driver,"const root=","import{trialRecord,exclusiveOutput}from'./sustained-trial-record.mjs';import{validateCampaign,historicalRun,LEGACY,CURRENT,OLD_HEAD,SOURCE_PATHS}from'./sustained-continuation-proof.mjs';\nconst root=");
driver=rep(driver,"['status','--porcelain']","['status','--porcelain','--untracked-files=no']");
driver=rep(driver,"const dir=join(root,'docs/benchmarks/staged-sustained-stage23');assert.ok(!existsSync(dir),'No overwrite/retry');mkdirSync(dir);","const dir=join(root,CURRENT);assert.ok(!existsSync(dir),'No overwrite/retry');");
const initStart=driver.indexOf('const run={'),initEnd=driver.indexOf('const save=',initStart);assert.ok(initStart>0&&initEnd>initStart);
const init=[
"const{old,sha256}=historicalRun(),run={plan:plan.id,planSha256:sha(read('bench/staged-sustained-plan.json')),measuredHead:head,startedAt:new Date().toISOString(),sourceRun:{path:LEGACY+'/run.json',sha256,measuredHead:OLD_HEAD,stoppedAt:old.stoppedAt,stopReason:old.stopReason},continuationSourceFiles:Object.fromEntries(SOURCE_PATHS.map(p=>[p,sha(read(p))])),preflight:old.preflight.map(r=>({...r,evidenceDir:LEGACY,evidenceHead:OLD_HEAD})),controls:old.controls.map(r=>({...r,evidenceDir:LEGACY,evidenceHead:OLD_HEAD})),coordinator:old.coordinator.map(r=>({...r,evidenceDir:LEGACY,evidenceHead:OLD_HEAD})),sustained:[],cancels:[],extension:[],hostStart:snapshot(),familyProof:old.familyProof,fixedFamilyProof:old.fixedFamilyProof};",
"const historical=validateCampaign(run),all=[...historical.all],expectedInput=JSON.parse(read('bench/staged-rsa/catalog.json')).find(r=>r.id===plan.case).input;",
"run.coordinatorDecision=pairedDecision(historical.groups.coordinator,{baseline:'combined',candidate:'dedicated',label:r=>r.coordinator});exclusiveOutput(dir);",
].join('\n')+'\n';
driver=driver.slice(0,initStart)+init+driver.slice(initEnd);
driver=rep(driver,"const row={...t,phase,args","const row={...t,evidenceDir:CURRENT,evidenceHead:head,phase,args");
driver=rep(driver," const record={...t,...receipt.records[0]};"," const record=trialRecord(t,receipt.records[0],expectedInput);");
const tryStart=driver.indexOf("try{\n for(const [coordinator"),sustainedStart=driver.indexOf(" const sustained=plan.sustainedTrials",tryStart);assert.ok(tryStart>0&&sustainedStart>tryStart);
driver=driver.slice(0,tryStart)+"try{\n save();\n"+driver.slice(sustainedStart);
write('scripts/benchmark-sustained-continuation.mjs',driver);
console.log('Generated metadata-only continuation/proof/closure; frozen Stage23 sources unchanged');
