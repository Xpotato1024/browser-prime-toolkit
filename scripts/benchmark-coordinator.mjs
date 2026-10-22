// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';import {readFileSync,writeFileSync,mkdirSync,existsSync,openSync,closeSync} from 'node:fs';import {resolve,join} from 'node:path';import {execFileSync,spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {sameFamilies} from './scheduler-packets.mjs';import {coordinatorDecision} from './coordinator-decision.mjs';
const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(join(root,p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(process.argv.length,2);execFileSync(process.execPath,['scripts/check-coordinator.mjs'],{cwd:root,stdio:'pipe'});
const plan=JSON.parse(read('bench/staged-coordinator-plan.json')),head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','Commit clean measured tree first');
const dir=join(root,'docs/benchmarks/staged-coordinator-stage22');assert.ok(!existsSync(dir),'No overwrite/retry');mkdirSync(dir);
const run={plan:plan.id,planSha256:sha(read('bench/staged-coordinator-plan.json')),measuredHead:head,startedAt:new Date().toISOString(),preflight:[],controls:[],trials:[]},controls=[],records=[];
const jobs=[{id:'contracts-combined-w4',coordinator:'combined',workers:4,preflight:true,budgetMs:30000},...[2,3,4].map(workers=>({id:'contracts-dedicated-w'+workers,coordinator:'dedicated',workers,preflight:true,budgetMs:30000})),...['combined','dedicated'].map(coordinator=>({id:'fixed-'+coordinator,coordinator,workers:4,fixedFamilies:4,budgetMs:60000})),...plan.trials];
const variants={2:'two-drop',3:'three-drop',4:'four-drop'};
for(const t of jobs){
 assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}).trim(),'');assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),head);
 const file=join(dir,t.id+'.json'),log=join(dir,t.id+'.log'),args=['scripts/verify-coordinator.mjs','--coordinator',t.coordinator,'--engine',variants[t.workers],'--budget-ms',String(t.budgetMs),'--out',file];
 if(!t.preflight)args.push('--case',plan.case);if(t.fixedFamilies)args.push('--fixed-families','4');
 const fd=openSync(log,'wx');let result;try{result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,PRIME_MEASURED_HEAD:head},stdio:['ignore',fd,fd],timeout:t.budgetMs+60000});}finally{closeSync(fd);}
 const row={...t,args,exitCode:result.status,signal:result.signal,error:result.error?.message??null,rawSha256:existsSync(file)?sha(readFileSync(file)):null,logSha256:sha(readFileSync(log))};(t.preflight?run.preflight:t.fixedFamilies?run.controls:run.trials).push(row);writeFileSync(join(dir,'run.json'),JSON.stringify(run,null,2)+'\n');console.log(JSON.stringify(row));
 if(result.status!==0||result.signal||result.error)throw Error('Harness failure; preserve and stop without retry');if(t.preflight)continue;
 const receipt=JSON.parse(readFileSync(file)),record=receipt.records[0];assert.equal(receipt.measuredHead,head);assert.equal(receipt.coordinator,t.coordinator);assert.equal(record.outcome.workers,4);assert.equal(record.outcome.coordinatorCompute,t.coordinator==='combined');
 if(t.fixedFamilies){controls.push({...t,...record});sameFamilies(controls,{fixed:true});}else{assert.ok(record.outcome.reason==='time-budget'||['factorized','probable'].includes(record.outcome.kind));records.push({...t,...record});sameFamilies(records);}
 if(controls.length===2&&!run.fixedFamilyProof){const reference=JSON.parse(read('docs/benchmarks/staged-resources-stage21/fixed-w4.json')).records[0];run.fixedFamilyProof=sameFamilies([...controls,reference],{fixed:true});writeFileSync(join(dir,'run.json'),JSON.stringify(run,null,2)+'\n');}
}
run.completedAt=new Date().toISOString();run.familyProof=sameFamilies(records);run.decision=coordinatorDecision(records);writeFileSync(join(dir,'run.json'),JSON.stringify(run,null,2)+'\n');console.log(JSON.stringify(run.decision));
