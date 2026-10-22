// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';import {readFileSync,writeFileSync,mkdirSync,existsSync,openSync,closeSync} from 'node:fs';import {resolve,join} from 'node:path';import {execFileSync,spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {sameFamilies} from './scheduler-packets.mjs';import {resourceDecision} from './resource-decision.mjs';
const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(join(root,p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(process.argv.length,2);const plan=JSON.parse(read('bench/staged-resource-plan.json')),head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','Commit clean measured tree first');
const dir=join(root,'docs/benchmarks/staged-resources-stage21');assert.ok(!existsSync(dir),'No overwrite/retry');mkdirSync(dir);
const run={plan:plan.id,planSha256:sha(read('bench/staged-resource-plan.json')),measuredHead:head,startedAt:new Date().toISOString(),preflight:[],controls:[],trials:[]},controls=[],records=[];
const variants=['one-drop','two-drop','three-drop','four-drop'],jobs=[{id:'contracts-ui',ui:true,preflight:true,budgetMs:30000},...variants.map((engine,i)=>({id:'contracts-w'+(i+1),engine,workers:i+1,preflight:true,budgetMs:30000})),...variants.map((engine,i)=>({id:'fixed-w'+(i+1),engine,workers:i+1,fixedFamilies:4,budgetMs:60000})),...plan.trials.map(t=>({...t,engine:variants[t.workers-1]}))];
for(const t of jobs){
 assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}).trim(),'');assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),head);
 const file=join(dir,t.id+'.json'),log=join(dir,t.id+'.log'),args=t.ui?['scripts/verify-resource-ui.mjs','--out',file]:['scripts/verify-resources.mjs','--engine',t.engine,'--budget-ms',String(t.budgetMs),'--out',file];
 if(!t.preflight)args.push('--case',plan.case);if(t.fixedFamilies)args.push('--fixed-families','4');
 const fd=openSync(log,'wx');let result;try{result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,PRIME_MEASURED_HEAD:head,...(t.ui?{PRIME_UI_SCREENSHOTS:join(dir,'ui')}: {})},stdio:['ignore',fd,fd],timeout:t.budgetMs+60000});}finally{closeSync(fd);}
 const row={...t,args,exitCode:result.status,signal:result.signal,error:result.error?.message??null,rawSha256:existsSync(file)?sha(readFileSync(file)):null,logSha256:sha(readFileSync(log))};(t.preflight?run.preflight:t.fixedFamilies?run.controls:run.trials).push(row);writeFileSync(join(dir,'run.json'),JSON.stringify(run,null,2)+'\n');console.log(JSON.stringify(row));
 if(result.status!==0||result.signal||result.error)throw Error('Harness failure; preserve and stop without retry');
 if(t.preflight)continue;
 const receipt=JSON.parse(readFileSync(file)),record=receipt.records[0];assert.equal(receipt.measuredHead,head);assert.equal(record.outcome.workers,t.workers);assert.equal(receipt.profile,'baseline');assert.equal(receipt.scheduler,'credit1');
 if(t.fixedFamilies){controls.push({...t,...record});sameFamilies(controls,{fixed:true});}
 else{assert.ok(record.outcome.reason==='time-budget'||['factorized','probable'].includes(record.outcome.kind),'Only complete timed trials accepted');records.push({...t,...record});sameFamilies(records);}
 if(controls.length===4&&!run.fixedFamilyProof){const previous=JSON.parse(read('docs/benchmarks/staged-scheduler-stage19/run.json')),reference=JSON.parse(read('docs/benchmarks/staged-scheduler-stage19/'+previous.controls[0].id+'.json')).records[0];run.fixedFamilyProof=sameFamilies([...controls,reference],{fixed:true});writeFileSync(join(dir,'run.json'),JSON.stringify(run,null,2)+'\n');}
}
run.completedAt=new Date().toISOString();run.familyProof=sameFamilies(records);run.decision=resourceDecision(records);
writeFileSync(join(dir,'run.json'),JSON.stringify(run,null,2)+'\n');console.log(JSON.stringify(run.decision));
