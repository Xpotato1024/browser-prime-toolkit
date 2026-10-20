// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';import {execFileSync,spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {sameFamilies} from './scheduler-packets.mjs';import {geometryDecision} from './geometry-decision.mjs';
const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(join(root,p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(process.argv.length,2);
const plan=JSON.parse(read('bench/staged-geometry-plan.json')),head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const scheduler=JSON.parse(read('docs/benchmarks/staged-scheduler-stage19/run.json'));assert.ok(scheduler.completedAt);assert.equal(scheduler.decision.candidate,'credit1');execFileSync(process.execPath,['scripts/report-scheduler.mjs','--check'],{cwd:root,stdio:'pipe'});
assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','Commit clean measured tree first');
const dir=join(root,'docs/benchmarks/staged-geometry-stage20');assert.ok(!existsSync(dir));mkdirSync(dir);
const run={plan:plan.id,planSha256:sha(read('bench/staged-geometry-plan.json')),measuredHead:head,startedAt:new Date().toISOString(),preflight:[],trials:[]};
const records=[];
const preflight=Object.keys(plan.profiles).map(profile=>({id:'contracts-'+profile,profile,workers:2,budgetMs:30000,preflight:true}));
for(const t of [...preflight,...plan.trials]){
 assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}).trim(),'','Tracked sources stay frozen');assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),head);
 const file=join(dir,t.id+'.json'),args=['scripts/verify-geometry.mjs','--case',plan.case,'--profile',t.profile,'--engine',t.workers===2?'two-drop':'one-drop','--budget-ms',String(t.budgetMs),'--out',file];
 if(t.preflight){const i=args.indexOf('--case');args.splice(i,2);}
 if(t.fixedFamilies)args.push('--fixed-families',String(t.fixedFamilies));
 const fd=openSync(join(dir,t.id+'.log'),'wx');let result;try{result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,PRIME_MEASURED_HEAD:head},stdio:['ignore',fd,fd],timeout:t.budgetMs+60000});}finally{closeSync(fd);}
 const row={...t,args,exitCode:result.status,signal:result.signal,error:result.error?.message??null,rawSha256:existsSync(file)?sha(readFileSync(file)):null,logSha256:sha(readFileSync(join(dir,t.id+'.log')))};
 (t.preflight?run.preflight:run.trials).push(row);writeFileSync(join(dir,'run.json'),JSON.stringify(run,null,2)+'\n');console.log(JSON.stringify(row));
 if(result.status!==0||result.signal||result.error)throw Error('Harness failure; preserve evidence and stop without retry');
 if(t.preflight)continue;
 const receipt=JSON.parse(readFileSync(file)),record=receipt.records[0];assert.equal(receipt.measuredHead,head);assert.equal(receipt.profile,t.profile);assert.equal(receipt.scheduler,'credit1');
 records.push({...t,...record});sameFamilies(records.filter(r=>r.profile===t.profile));
}
run.completedAt=new Date().toISOString();run.familyProof=Object.fromEntries(Object.keys(plan.profiles).map(profile=>[profile,sameFamilies(records.filter(r=>r.profile===profile))]));run.decision=geometryDecision(records);
writeFileSync(join(dir,'run.json'),JSON.stringify(run,null,2)+'\n');console.log(JSON.stringify(run.decision));
