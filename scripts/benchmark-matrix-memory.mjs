// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,realpathSync} from 'node:fs';
import {resolve,dirname,join,sep} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {captureSourceGuard,checkSourceGuard} from './source-guard.mjs';
const root=resolve(import.meta.dirname,'..'),out=resolve(process.argv[2]),planPath=join(root,'bench/staged-matrix-memory-plan.json'),plan=JSON.parse(readFileSync(planPath)),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(process.version,'v24.19.0');assert.equal(plan.id,'llm01-matrix-memory-stage39');
const key=p=>{const r=realpathSync(p);return /^\/mnt\/[a-z]\//i.test(r)?r.toLowerCase():r;},parent=key(dirname(out)),rk=key(root);
assert.ok(parent!==rk&&!parent.startsWith(rk+sep));assert.ok(!existsSync(out),'Exclusive campaign');
assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}),'');
const guard=captureSourceGuard(root),head=guard.head;
assert.equal(plan.trials.reduce((n,t)=>n+t.budgetMs+plan.limits.reservePerChildMs,0),plan.limits.totalCampaignMs);
mkdirSync(out);const run={plan:plan.id,head,nodeVersion:process.version,planSha256:sha(readFileSync(planPath)),driverSha256:sha(readFileSync(new URL(import.meta.url))),sourceGuard:{version:guard.version,files:guard.files,treeSha256:guard.treeSha256},startedAt:new Date().toISOString(),trials:[]};
let created=false;const save=()=>{writeFileSync(join(out,'run.json'),JSON.stringify(run,null,2)+'\n',created?{}:{flag:'wx'});created=true;};save();const deadline=performance.now()+plan.limits.totalCampaignMs;
try{
 for(const t of plan.trials){
  checkSourceGuard(guard);assert.ok(deadline-performance.now()>=t.budgetMs+plan.limits.reservePerChildMs,'Child retirement reserve');
  const availableMiB=Number(/^MemAvailable:\s+(\d+)/m.exec(readFileSync('/proc/meminfo','utf8'))[1])/1024;assert.ok(availableMiB>=plan.limits.startAvailableMiB);
  const output=join(out,t.id+'.json'),args=['--max-old-space-size=128','scripts/matrix-memory-trial.mjs',t.variant,t.caseId,output];
  const row={...t,args,availableMiB,state:'running',startedAt:new Date().toISOString()};run.trials.push(row);save();console.log('Start',t.id,row.startedAt);
  const result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,PRIME_MEASURED_HEAD:head},encoding:'utf8',maxBuffer:4194304,timeout:t.budgetMs,killSignal:'SIGKILL'});
  const log=(result.stdout??'')+(result.stderr??'');writeFileSync(join(out,t.id+'.log'),log,{flag:'wx'});
  Object.assign(row,{state:result.status===0?'completed':'failed',exitCode:result.status,signal:result.signal,finishedAt:new Date().toISOString(),logBytes:Buffer.byteLength(log),logSha256:sha(log)});
  for(const suffix of ['json','json.failed.json'])if(existsSync(join(out,t.id+'.'+suffix))){const b=readFileSync(join(out,t.id+'.'+suffix));assert.ok(b.length<=plan.limits.maxReceiptBytes);row[suffix==='json'?'receipt':'failure']={bytes:b.length,sha256:sha(b)};}
  save();checkSourceGuard(guard);assert.equal(result.status,0,'Original child log retained: '+t.id);const r=JSON.parse(readFileSync(output));assert.equal(r.measuredHead,head);assert.ok(r.disposed);row.summary={families:r.families,wallMs:r.requestWallMs,peakRequested:r.after.peak,linear:r.after.linear};save();console.log('Done',t.id,JSON.stringify(row.summary));
 }
 assert.ok(performance.now()<=deadline);run.completedAt=new Date().toISOString();save();
}catch(error){run.stoppedAt=new Date().toISOString();run.error=String(error.stack??error);save();throw error;}
