// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {assertLongStart,trialArguments} from './dlp-series-contract.mjs';
import {screenDecision,longDecision} from './dlp-decision.mjs';
const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(join(root,p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert.ok(process.argv.length===2||process.argv.length===3&&process.argv[2]==='--long','Only optional --long is accepted');
const plan=JSON.parse(read('bench/staged-dlp-plan.json')),stage=process.argv.includes('--long')?'long':'short',head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const dir=join(root,'docs/benchmarks/staged-dlp-stage18'),rows=()=>plan.trials.map(t=>({...t,outcome:JSON.parse(readFileSync(join(dir,t.id+'.json'))).records[0].outcome}));
let trials=plan.trials,decision=null;
if(stage==='short'){assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','Commit clean measured tree first');assert.ok(!existsSync(dir));mkdirSync(dir);}
else{
 assert.ok(!existsSync(join(dir,'long-run.json')),'Long series already exists');
 const short=JSON.parse(readFileSync(join(dir,'short-run.json')));
 const state={changedTracked:execFileSync('git',['diff','--name-only','HEAD','--'],{cwd:root,encoding:'utf8'}),untracked:execFileSync('git',['ls-files','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean)};
 assertLongStart(short,plan,sha(read('bench/staged-dlp-plan.json')),head,state,read,root);decision=screenDecision(rows(),plan);assert.deepEqual(short.decision,decision);
 assert.ok(decision.candidate,'No candidate passed fixed gate');
 trials=plan.gate.longOrder.map((p,i)=>({id:'long-'+String(i+1)+'-'+(p==='candidate'?decision.candidate:p),profile:p==='candidate'?decision.candidate:p,workers:2,repeat:i+1,budgetMs:600000}));
}
const run={plan:plan.id,planSha256:sha(read('bench/staged-dlp-plan.json')),stage,measuredHead:head,startedAt:new Date().toISOString(),trials:[],screen:decision};
for(const t of trials){
 assert.equal(execFileSync('git',['diff','--name-only','HEAD','--'],{cwd:root,encoding:'utf8'}).trim(),'','Tracked sources must stay frozen');assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),head);
 const file=join(dir,t.id+'.json'),args=trialArguments(t,root),fd=openSync(join(dir,t.id+'.log'),'wx');
 let result;try{result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,PRIME_MEASURED_HEAD:head},stdio:['ignore',fd,fd],timeout:t.budgetMs+60000});}finally{closeSync(fd);}
 const record={...t,args,exitCode:result.status,signal:result.signal,error:result.error?.message??null,rawSha256:existsSync(file)?sha(readFileSync(file)):null,logSha256:sha(readFileSync(join(dir,t.id+'.log')))};run.trials.push(record);writeFileSync(join(dir,stage+'-run.json'),JSON.stringify(run,null,2)+'\n');console.log(JSON.stringify(record));
 if(result.status!==0||result.signal||result.error)throw Error('Trial harness failed; preserve evidence and stop');
}
run.completedAt=new Date().toISOString();
if(stage==='short')run.decision=screenDecision(rows(),plan);
else run.decision=longDecision(trials.map(t=>({...t,outcome:JSON.parse(readFileSync(join(dir,t.id+'.json'))).records[0].outcome})),decision.candidate,plan);
writeFileSync(join(dir,stage+'-run.json'),JSON.stringify(run,null,2)+'\n');console.log(JSON.stringify(run.decision));
