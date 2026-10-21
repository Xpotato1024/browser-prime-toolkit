// SPDX-License-Identifier: AGPL-3.0-only
import assert from'node:assert/strict';
import{captureSourceGuard,checkSourceGuard}from'./source-guard.mjs';
import{readFileSync,writeFileSync,mkdirSync,existsSync,realpathSync}from'node:fs';
import{execFileSync,spawnSync}from'node:child_process';
import{createHash}from'node:crypto';
import{resolve,join,dirname,sep}from'node:path';
const root=resolve(import.meta.dirname,'..'),out=process.argv[2];assert.ok(out&&resolve(out)!==root);
const planPath=join(root,'bench/staged-lp-map-plan.json'),plan=JSON.parse(readFileSync(planPath)),head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}),'');
assert.equal(process.version,'v24.19.0');
const sha=b=>createHash('sha256').update(b).digest('hex');
const key=p=>{const r=realpathSync(p);return /^\/mnt\/[a-z]\//i.test(r)?r.toLowerCase():r;};const parent=key(dirname(resolve(out))),rk=key(root);assert.ok(parent!==rk&&!parent.startsWith(rk+sep),'Output outside repository');assert.ok(!existsSync(out),'Never reuse any campaign directory');
mkdirSync(out);
const guard=captureSourceGuard(root);assert.equal(guard.head,head);
const windows=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',"$v=Get-CimInstance Win32_OperatingSystem;[pscustomobject]@{availableMiB=[math]::Round($v.FreePhysicalMemory/1024,2);totalMiB=[math]::Round($v.TotalVisibleMemorySize/1024,2)}|ConvertTo-Json -Compress"],{encoding:'utf8'}).trim());assert.ok(windows.availableMiB>=plan.limits.startWindowsAvailableMiB,'Windows RAM precondition');
const manifest={windowsMemory:windows,nodeVersion:process.version,sourceGuard:{version:guard.version,files:guard.files,treeSha256:guard.treeSha256},plan:plan.id,planSha256:sha(readFileSync(planPath)),driverSha256:sha(readFileSync(new URL(import.meta.url))),head,startedAt:new Date().toISOString(),trials:[]};
let manifestCreated=false;const save=()=>{writeFileSync(join(out,'run.json'),JSON.stringify(manifest,null,2)+'\n',manifestCreated?{}:{flag:'wx'});manifestCreated=true;};
save();
try{
 let total=0;
 for(const t of plan.trials){
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),head,'Pinned source unchanged');
  const mem=readFileSync('/proc/meminfo','utf8'),availableMiB=Number(/^MemAvailable:\s+(\d+)/m.exec(mem)[1])/1024;
  assert.ok(availableMiB>=plan.limits.startAvailableMiB,'Host RAM precondition');
  total+=t.budgetMs;assert.ok(total<=plan.limits.totalCalculationMs,'Finite campaign budget');
  checkSourceGuard(guard);
  const receipt=join(out,t.id+'.json'),args=['scripts/verify-lp-map.mjs','--graph',t.graph,'--engine',t.engine,'--slots',String(t.slots),'--coordinator',t.coordinator,'--budget-ms',String(t.budgetMs),'--out',receipt];
  if(t.memoryMiB)args.push('--memory-mib',String(t.memoryMiB));
  if(t.cancelAfterMs)args.push('--cancel-after-ms',String(t.cancelAfterMs));
  if(t.case)args.push('--case',t.case);if(t.fixedFamilies)args.push('--fixed-families',String(t.fixedFamilies));
  const row={...t,availableMiB,args,startedAt:new Date().toISOString(),state:'running'};manifest.trials.push(row);save();
  console.log('Start',t.id,new Date().toISOString());
  const result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,PRIME_MEASURED_HEAD:head},encoding:'utf8',maxBuffer:1048576,timeout:t.budgetMs+120000});
  const log=(result.stdout??'')+(result.stderr??'');writeFileSync(join(out,t.id+'.log'),log,{flag:'wx'});
  row.exitCode=result.status;row.finishedAt=new Date().toISOString();row.state=result.status===0?'completed':'failed';row.logSha256=sha(log);
  if(existsSync(receipt)){const b=readFileSync(receipt);row.bytes=b.length;assert.ok(row.bytes<=plan.limits.maxReceiptBytes,'Finite raw receipt');row.sha256=sha(b);}
  save();assert.equal(result.status,0,t.id+' failed; original log retained');
  const r=JSON.parse(readFileSync(receipt));checkSourceGuard(guard,r);assert.ok(r.records[0].outcome?.maximumWasmBytes<=plan.limits.maxWasmMiB*1048576||!r.records[0].outcome);assert.equal(r.measuredHead,head);assert.equal(r.graphVariant,t.graph);assert.equal(r.variant,t.engine);assert.equal(r.slots,t.slots);assert.equal(r.coordinator,t.coordinator);assert.equal(r.selectedMemoryMiB,t.memoryMiB??(t.engine==='six-drop'?768:512));assert.equal(r.quiet.networkRequests,0);
  row.summary=r.records[0].outcome?{kind:r.records[0].outcome.kind,reason:r.records[0].outcome.reason,families:r.records[0].outcome.familiesSubmitted,usable:r.records[0].outcome.relations,wallMs:r.records[0].outcome.requestWallMs,peakPssBytes:r.sampledRam.peakPssBytes}:r.records[0];
  save();console.log('Done',t.id,JSON.stringify(row.summary));
 }
 manifest.completedAt=new Date().toISOString();save();
}catch(e){manifest.stoppedAt=new Date().toISOString();manifest.error=String(e.stack??e);save();throw e;}
