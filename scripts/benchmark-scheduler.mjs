// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';import {execFileSync,spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {sameFamilies} from './scheduler-packets.mjs';import {schedulerDecision} from './scheduler-decision.mjs';
const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(join(root,p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(process.argv.length,2);
const plan=JSON.parse(read('bench/staged-scheduler-plan.json')),head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','Commit clean measured tree first');
const dir=join(root,'docs/benchmarks/staged-scheduler-stage19');assert.ok(!existsSync(dir));mkdirSync(dir);
const run={plan:plan.id,planSha256:sha(read('bench/staged-scheduler-plan.json')),measuredHead:head,startedAt:new Date().toISOString(),preflight:[],controls:[],trials:[]};
const records=[],controls=[];
const preflight=Object.keys(plan.modes).flatMap(scheduler=>[1,2].map(workers=>({id:'contracts-'+scheduler+'-w'+workers,scheduler,workers,budgetMs:30000,preflight:true})));
for(const t of [...preflight,...plan.controls,...plan.trials]){
 assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}).trim(),'','Tracked sources stay frozen');assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),head);
 const file=join(dir,t.id+'.json'),args=['scripts/verify-scheduler.mjs','--case',plan.case,'--scheduler',t.scheduler,'--engine',t.workers===2?'two-drop':'one-drop','--budget-ms',String(t.budgetMs),'--out',file];
 if(t.preflight){const i=args.indexOf('--case');args.splice(i,2);}
 if(t.fixedFamilies)args.push('--fixed-families',String(t.fixedFamilies));
 const fd=openSync(join(dir,t.id+'.log'),'wx');let result;try{result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,PRIME_MEASURED_HEAD:head},stdio:['ignore',fd,fd],timeout:t.budgetMs+60000});}finally{closeSync(fd);}
 const row={...t,args,exitCode:result.status,signal:result.signal,error:result.error?.message??null,rawSha256:existsSync(file)?sha(readFileSync(file)):null,logSha256:sha(readFileSync(join(dir,t.id+'.log')))};
 (t.preflight?run.preflight:t.fixedFamilies?run.controls:run.trials).push(row);writeFileSync(join(dir,'run.json'),JSON.stringify(run,null,2)+'\n');console.log(JSON.stringify(row));
 if(result.status!==0||result.signal||result.error)throw Error('Harness failure; preserve evidence and stop without retry');
 if(t.preflight)continue;
 const receipt=JSON.parse(readFileSync(file)),record=receipt.records[0];assert.equal(receipt.measuredHead,head);assert.equal(receipt.scheduler,t.scheduler);
 if(t.fixedFamilies){controls.push(record);sameFamilies(controls,{fixed:true});if(controls.length===6){run.fixedFamilyProof=sameFamilies(controls,{fixed:true});writeFileSync(join(dir,'run.json'),JSON.stringify(run,null,2)+'\n');}}
 else{assert.equal(controls.length,6);records.push({...t,...record});sameFamilies([...controls,...records]);}
}
run.completedAt=new Date().toISOString();run.familyProof=sameFamilies([...controls,...records]);run.decision=schedulerDecision(records);
writeFileSync(join(dir,'run.json'),JSON.stringify(run,null,2)+'\n');console.log(JSON.stringify(run.decision));
