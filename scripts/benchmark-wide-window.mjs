// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {requireTrialWindow} from './finite-trial-budget.mjs';
import {gunzipSync} from 'node:zlib';
import {readWindowsMemorySync} from './windows-memory-receipt.mjs';
import {captureSourceGuard,checkSourceGuard} from './source-guard.mjs';
import {validateStreamRecord} from './graph-multicore-proof.mjs';
import {readFileSync,writeFileSync,mkdirSync,existsSync,realpathSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,join,dirname,sep} from 'node:path';
const root=resolve(import.meta.dirname,'..'),out=process.argv[2],planPath=join(root,'bench/staged-wide-window-plan.json');
const plan=JSON.parse(readFileSync(planPath)),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(plan.id,'llm01-wide-window-stage38');assert.equal(process.version,'v24.19.0');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}),head=git(['rev-parse','HEAD']).trim();
assert.equal(git(['status','--porcelain']),'','Commit all sources before trial');
assert.ok(out&&resolve(out)!==root);
const key=p=>{const r=realpathSync(p);return /^\/mnt\/[a-z]\//i.test(r)?r.toLowerCase():r;};
const rk=key(root),parent=key(dirname(resolve(out)));
assert.ok(parent!==rk&&!parent.startsWith(rk+sep));assert.ok(!existsSync(out),'Exclusive campaign directory');
const windowsDirectory=process.env.PRIME_WINDOWS_MEMORY_DIRECTORY;assert.ok(windowsDirectory,'Live Windows monitor directory required');
assert.ok(key(windowsDirectory)!==rk&&!key(windowsDirectory).startsWith(rk+sep),'Monitor outside repository');
const windowsStop=join(windowsDirectory,'windows-memory.stop');
const windowsSnapshot=()=>{const w=readWindowsMemorySync(windowsDirectory,{maximumSamples:391});assert.ok(w.value.availableMiB>=8192);return w;};
const initialWindows=windowsSnapshot();
mkdirSync(out);
const guard=captureSourceGuard(root);assert.equal(guard.head,head);
const manifest={plan:plan.id,planSha256:sha(readFileSync(planPath)),driverSha256:sha(readFileSync(new URL(import.meta.url))),head,nodeVersion:process.version,startedAt:new Date().toISOString(),windowsMonitor:{source:'scripts/watch-windows-memory.ps1',initial:initialWindows.value},sourceGuard:{version:guard.version,files:guard.files,treeSha256:guard.treeSha256},trials:[]};
let created=false;const save=()=>{writeFileSync(join(out,'run.json'),JSON.stringify(manifest,null,2)+'\n',created?{}:{flag:'wx'});created=true;};
save();let totalCap=0;const deadline=performance.now()+plan.limits.totalCampaignMs;
try{
 for(const t of plan.trials){
  checkSourceGuard(guard);
  const availableMiB=Number(/^MemAvailable:\s+(\d+)/m.exec(readFileSync('/proc/meminfo','utf8'))[1])/1024;
  assert.ok(Number.isFinite(availableMiB)&&availableMiB>=8192);
  const windows=windowsSnapshot();writeFileSync(join(out,t.id+'.windows.json'),windows.bytes,{flag:'wx'});
  totalCap+=t.budgetMs+120000;assert.ok(totalCap<=plan.limits.totalCampaignMs);
  const receipt=join(out,t.id+'.json'),args=['scripts/verify-wide-window.mjs','--graph','wide','--engine',t.engine,'--slots',String(t.slots),'--coordinator',t.coordinator,'--memory-mib',String(t.memoryMiB),'--budget-ms',String(t.budgetMs),'--out',receipt];
  if(t.case)args.push('--case',t.case);if(t.fixedFamilies)args.push('--fixed-families',String(t.fixedFamilies));if(t.cancelAfterMs)args.push('--cancel-after-ms',String(t.cancelAfterMs));
  const row={...t,availableMiB,windowsMemory:windows.value,windowsMemorySha256:sha(windows.bytes),args,startedAt:new Date().toISOString(),state:'running'};manifest.trials.push(row);save();
  console.log('Start',t.id,row.startedAt);
  let timeoutMs;try{timeoutMs=requireTrialWindow(deadline,t.budgetMs);}catch(error){row.state='not-started';row.finishedAt=new Date().toISOString();save();throw error;}
  const result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,PRIME_MEASURED_HEAD:head},encoding:'utf8',maxBuffer:4194304,timeout:timeoutMs});
  const log=(result.stdout??'')+(result.stderr??'');writeFileSync(join(out,t.id+'.log'),log,{flag:'wx'});
  Object.assign(row,{exitCode:result.status,finishedAt:new Date().toISOString(),state:result.status===0?'completed':'failed',logSha256:sha(log),logBytes:Buffer.byteLength(log)});
  if(existsSync(receipt)){const b=readFileSync(receipt);row.bytes=b.length;row.sha256=sha(b);assert.ok(b.length<=plan.limits.maxReceiptBytes);}
  if(existsSync(receipt+'.failed.json')){const b=readFileSync(receipt+'.failed.json');assert.ok(b.length<=16777216);row.failureBytes=b.length;row.failureSha256=sha(b);}
  save();assert.equal(result.status,0,t.id+' failed; original log retained');
  const r=JSON.parse(readFileSync(receipt));checkSourceGuard(guard,r);assert.equal(r.sampledRam.observerFailure,null,'RAM observer failed; receipt retained');
  assert.equal(r.measuredHead,head);assert.equal(r.graphVariant,'wide');assert.equal(r.budgetMs,t.budgetMs);assert.equal(r.variant,t.engine);
  assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
  assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
  const record=r.records[0],o=record.outcome;
  if(t.id==='wide-1024'){
   const base=join(root,'docs/benchmarks/staged-long-window-stage37/completed'),previousRun=JSON.parse(readFileSync(join(base,'run.json'))),previousRow=previousRun.trials.find(x=>x.id==='long-256'),index=JSON.parse(readFileSync(join(base,'evidence-index.json'))).files['long-256.json'];
   const text=readFileSync(join(base,index.file),'utf8'),packed=Buffer.from(text.replaceAll('\n',''),'base64'),raw=gunzipSync(packed,{maxOutputLength:16777216});
   assert.equal(sha(packed),index.compressedSha256);assert.equal(sha(raw),previousRow.sha256);assert.equal(sha(raw),index.originalSha256);
   const old=JSON.parse(raw).records[0];assert.ok(o.familiesSubmitted>=572,'Did not reach the predeclared common prefix');
   assert.deepEqual(record.familyDigests.filter(x=>x.family<572).map(x=>[x.family,x.sha256]),old.familyDigests.filter(x=>x.family<572).map(x=>[x.family,x.sha256]));
   assert.equal(record.graphColumns.find(x=>x.family===128).sha256,old.graphColumns.find(x=>x.family===128).sha256);
   assert.deepEqual(record.progressTimeline.find(x=>x.families===572).collectorStats,old.progressTimeline.find(x=>x.families===572).collectorStats);
   row.commonPrefix572Matched=true;
  }
  if(!o){assert.equal(record.tests.length,22);assert.ok(record.tests.every(t=>t.pass));row.summary={contracts:22};}
  else{
   validateStreamRecord(record);assert.ok(o.maximumWasmBytes<=1280*1048576);assert.equal(o.workers,5);assert.ok(o.peakTransportBytes<=64*1048576);assert.ok(o.familiesSubmitted<=4096);assert.ok(record.eventCount<=16416);
   assert.ok(['factorized','probable'].includes(o.kind)||plan.adoption.allowedLongReasons.includes(o.reason)||record.resourceStop);
   row.summary={kind:o.kind,reason:o.reason,resourceStop:record.resourceStop,families:o.familiesSubmitted,usable:o.relations,target:o.target,wallMs:o.requestWallMs,peakPssBytes:r.sampledRam.peakPssBytes,coordinator:o.memoryByOwner[0].last,nativeQuota:o.nativeQuota??null,cancelToRetirementMs:record.cancelToRetirementMs};
  }
  save();console.log('Done',t.id,JSON.stringify(row.summary));
 }
 assert.ok(performance.now()<=deadline,'Campaign deadline');manifest.completedAt=new Date().toISOString();save();
}catch(error){manifest.stoppedAt=new Date().toISOString();manifest.error=String(error.stack??error);save();throw error;}
finally{if(!existsSync(windowsStop))writeFileSync(windowsStop,'done\n',{flag:'wx'});}
