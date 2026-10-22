// SPDX-License-Identifier: AGPL-3.0-only
import assert from'node:assert/strict';
import{readFileSync,writeFileSync,mkdirSync,existsSync}from'node:fs';
import{execFileSync,spawnSync}from'node:child_process';
import{createHash}from'node:crypto';
import{resolve,join}from'node:path';
const root=resolve(import.meta.dirname,'..'),out=process.argv[2];assert.ok(out&&resolve(out)!==root);
const planPath=join(root,'bench/staged-graph-builtin-plan.json'),plan=JSON.parse(readFileSync(planPath)),head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}),'');
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.ok(!existsSync(join(out,'run.json')),'Never overwrite original campaign');
mkdirSync(out,{recursive:true});
const manifest={plan:plan.id,planSha256:sha(readFileSync(planPath)),driverSha256:sha(readFileSync(new URL(import.meta.url))),head,startedAt:new Date().toISOString(),trials:[]};
const save=()=>writeFileSync(join(out,'run.json'),JSON.stringify(manifest,null,2)+'\n');
save();
try{
 let total=0;
 for(const t of plan.trials){
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),head,'Pinned source unchanged');
  const mem=readFileSync('/proc/meminfo','utf8'),availableMiB=Number(/^MemAvailable:\s+(\d+)/m.exec(mem)[1])/1024;
  assert.ok(availableMiB>=plan.limits.startAvailableMiB,'Host RAM precondition');
  total+=t.budgetMs;assert.ok(total<=plan.limits.totalCalculationMs,'Finite campaign budget');
  const receipt=join(out,t.id+'.json'),args=['scripts/verify-graph-builtin.mjs','--graph',t.graph,'--engine',t.engine,'--slots',String(t.slots),'--budget-ms',String(t.budgetMs),'--out',receipt];
  if(t.case)args.push('--case',t.case);if(t.fixedFamilies)args.push('--fixed-families',String(t.fixedFamilies));
  const row={...t,availableMiB,args,startedAt:new Date().toISOString(),state:'running'};manifest.trials.push(row);save();
  console.log('Start',t.id,new Date().toISOString());
  const result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,PRIME_MEASURED_HEAD:head},encoding:'utf8',maxBuffer:1048576,timeout:t.budgetMs+120000});
  const log=(result.stdout??'')+(result.stderr??'');writeFileSync(join(out,t.id+'.log'),log);
  row.exitCode=result.status;row.finishedAt=new Date().toISOString();row.state=result.status===0?'completed':'failed';row.logSha256=sha(log);
  if(existsSync(receipt)){const b=readFileSync(receipt);row.bytes=b.length;row.sha256=sha(b);}
  save();assert.equal(result.status,0,t.id+' failed; original log retained');
  const r=JSON.parse(readFileSync(receipt));assert.equal(r.measuredHead,head);assert.equal(r.graphVariant,t.graph);assert.equal(r.variant,t.engine);assert.equal(r.slots,t.slots);assert.equal(r.quiet.networkRequests,0);
  row.summary=r.records[0].outcome?{kind:r.records[0].outcome.kind,reason:r.records[0].outcome.reason,families:r.records[0].outcome.familiesSubmitted,usable:r.records[0].outcome.relations,wallMs:r.records[0].outcome.requestWallMs,peakPssBytes:r.sampledRam.peakPssBytes}:r.records[0];
  save();console.log('Done',t.id,JSON.stringify(row.summary));
 }
 manifest.completedAt=new Date().toISOString();save();
}catch(e){manifest.stoppedAt=new Date().toISOString();manifest.error=String(e.stack??e);save();throw e;}
