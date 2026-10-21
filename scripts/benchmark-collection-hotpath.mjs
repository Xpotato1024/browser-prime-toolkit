// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,realpathSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {resolve,join,dirname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {captureSourceGuard,checkSourceGuard} from './source-guard.mjs';
import {validateStreamRecord} from './graph-multicore-proof.mjs';
import {validateCollectionFinal} from '../src/collection-profile/bridge.js';
const root=resolve(import.meta.dirname,'..'),out=process.argv[2],planPath=join(root,'bench/staged-collection-hotpath-plan.json');
const plan=JSON.parse(readFileSync(planPath)),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(process.version,'v24.19.0');assert.equal(plan.id,'llm01-collection-hotpath-stage40');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}),head=git(['rev-parse','HEAD']).trim();
assert.equal(git(['status','--porcelain']),'','Commit all source before calculation');
const key=p=>{const r=realpathSync(p);return /^\/mnt\/[a-z]\//i.test(r)?r.toLowerCase():r;},rk=key(root),parent=key(dirname(resolve(out)));
assert.ok(out&&parent!==rk&&!parent.startsWith(rk+sep)&&!existsSync(out),'Exclusive outside-repository destination');
const base=join(root,'docs/benchmarks/staged-wide-window-stage38/completed'),oldRun=JSON.parse(readFileSync(join(base,'run.json'))),index=JSON.parse(readFileSync(join(base,'evidence-index.json'))),oldRow=oldRun.trials.find(t=>t.id==='wide-1024');
const entry=index.files['wide-1024.json'],packed=Buffer.from(readFileSync(join(base,entry.file),'utf8').replaceAll('\n',''),'base64'),raw=gunzipSync(packed,{maxOutputLength:16777216});
assert.equal(sha(packed),entry.compressedSha256);assert.equal(sha(raw),oldRow.sha256);assert.equal(sha(raw),entry.originalSha256);
const old=JSON.parse(raw).records[0];assert.equal(oldRun.head,plan.successfulReferenceHead);
mkdirSync(out);
const started=performance.now(),deadline=started+plan.limits.totalCampaignMs,guard=captureSourceGuard(root);
const manifest={plan:plan.id,head,nodeVersion:process.version,planSha256:sha(readFileSync(planPath)),driverSha256:sha(readFileSync(new URL(import.meta.url))),sourceGuard:{version:guard.version,files:guard.files,treeSha256:guard.treeSha256},startedAt:new Date().toISOString(),trials:[]};
let created=false;const save=()=>{writeFileSync(join(out,'run.json'),JSON.stringify(manifest,null,2)+'\n',created?{}:{flag:'wx'});created=true;};save();
try{
 for(const t of plan.trials){
  checkSourceGuard(guard);
  const availableMiB=Number(/^MemAvailable:\s+(\d+)/m.exec(readFileSync('/proc/meminfo','utf8'))[1])/1024;assert.ok(availableMiB>=4096);
  assert.ok(deadline-performance.now()>=t.budgetMs+30000,'Finite startup/retirement reserve');
  const output=join(out,t.id+'.json'),args=['--max-old-space-size=128','scripts/verify-collection-profile.mjs','--graph',t.graph,'--engine','one-drop','--slots','8','--budget-ms',String(t.budgetMs),'--case','RSA-100','--fixed-families','4','--out',output];
  const row={...t,availableMiB,args,state:'running',startedAt:new Date().toISOString()};manifest.trials.push(row);save();console.log('Start',t.id,row.startedAt);
  // Child owns a detached Chrome group and handles SIGTERM; its final emergency exit is bounded by 8s.
  const result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,PRIME_MEASURED_HEAD:head},encoding:'utf8',maxBuffer:4194304,timeout:t.budgetMs+22000,killSignal:'SIGTERM'});
  const log=(result.stdout??'')+(result.stderr??'');writeFileSync(join(out,t.id+'.log'),log,{flag:'wx'});
  Object.assign(row,{exitCode:result.status,signal:result.signal,error:result.error?.message??null,finishedAt:new Date().toISOString(),state:result.status===0?'completed':'failed',logBytes:Buffer.byteLength(log),logSha256:sha(log)});
  if(existsSync(output)){const b=readFileSync(output);assert.ok(b.length<=2097152);row.bytes=b.length;row.sha256=sha(b);}
  if(existsSync(output+'.failed.json')){const b=readFileSync(output+'.failed.json');assert.ok(b.length<=16777216);row.failureBytes=b.length;row.failureSha256=sha(b);}
  save();assert.equal(result.status,0,'Original failure retained: '+t.id);
  const r=JSON.parse(readFileSync(output));checkSourceGuard(guard,r);assert.equal(r.measuredHead,head);assert.equal(r.graphVariant,t.graph);
  assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
  assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
  assert.equal(r.sampledRam.observerFailure,null);assert.ok(r.sampledRam.minAvailableMiB>=4096&&r.sampledRam.peakPssBytes<1536*1048576);
  assert.equal(r.records.length,1);const record=r.records[0],o=record.outcome;validateStreamRecord(record);
  assert.equal(record.knownFactorsUsed,false);assert.equal(record.resourceStop,null);assert.equal(o.workers,1);assert.equal(o.maximumWasmBytes,1073741824);
  assert.equal(o.fixedFamilies,4);assert.equal(o.familiesSubmitted,4);assert.equal(o.polynomialsSubmitted,8192);
  assert.ok(o.allWorkersDisposed&&o.allWorkerSourcesReleased);assert.deepEqual(o.retirementErrors,[]);
  assert.ok(o.peakTransportBytes<=64*1048576&&o.creditState.peakOutstanding<=8);
  assert.deepEqual(o.configuration,old.outcome.configuration);
  assert.deepEqual(record.familyDigests.map(({family,bytes,polynomials,rawRelations,sha256,acknowledged})=>({family,bytes,polynomials,rawRelations,sha256,acknowledged})),old.familyDigests.filter(d=>d.family<4));
  assert.equal(record.graphColumns.find(x=>x.family===4).sha256,old.graphColumns.find(x=>x.family===4).sha256);
  for(let i=1;i<=4;i++)assert.deepEqual(record.progressTimeline.find(x=>x.families===i).collectorStats,old.progressTimeline.find(x=>x.families===i).collectorStats);
  const diag=r.collectionDiagnostics;assert.equal(diag.failure,null);assert.equal(diag.livePorts,0);assert.equal(diag.channels.length,1);
  const c=diag.channels[0];assert.ok(c.closed&&c.terminated);assert.equal(c.failure,null);validateCollectionFinal(c.last,t.graph);
  const frame=c.last;
  if(t.graph==='instrumented'){
   for(const id of [1,2,3,15])assert.equal(frame.rows[id][2],4,'Family phase '+id);
   for(const id of [4,5,6,7,9])assert.equal(frame.rows[id][2],8192,'Poly phase '+id);
   for(const id of [12,13])assert.equal(frame.rows[id][2],8188,'Root update phase '+id);
   assert.ok(frame.rows[8][2]>0&&frame.rows[10][2]>0);
   assert.ok(frame.rows.reduce((sum,p)=>sum+p[1],0)<=o.requestWallMs+10);
  }
  row.summary={requestWallMs:o.requestWallMs,kind:o.kind,reason:o.reason,families:o.familiesSubmitted,usable:o.relations,peakPssBytes:r.sampledRam.peakPssBytes,clockStatus:frame.status,phases:frame.rows,referencePrefix4Matched:true};
  save();console.log('Done',t.id,JSON.stringify(row.summary));
 }
 const median=a=>(a[0]+a[1])/2;
 manifest.comparisons={};
 for(const kind of ['resieve4','sparse']){
  const trials=manifest.trials.filter(t=>t.candidate===kind),baseline=trials.filter(t=>t.graph==='baseline'),candidate=trials.filter(t=>t.graph===kind);
  const timeRatio=median(candidate.map(t=>t.summary.requestWallMs))/median(baseline.map(t=>t.summary.requestWallMs));
  const pssRatio=median(candidate.map(t=>t.summary.peakPssBytes))/median(baseline.map(t=>t.summary.peakPssBytes));
  manifest.comparisons[kind]={timeRatio,pssRatio,allPrefixesMatched:true,initialGatePassed:timeRatio<=plan.gates.candidateTimeRatioMax&&pssRatio<=plan.gates.candidatePssRatioMax};
 }
 assert.ok(performance.now()<=deadline);manifest.completedAt=new Date().toISOString();save();
}catch(error){manifest.stoppedAt=new Date().toISOString();manifest.error=String(error.stack??error);save();throw error;}
