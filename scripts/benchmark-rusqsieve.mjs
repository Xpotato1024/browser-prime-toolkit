// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(join(root,p)),sha=b=>createHash('sha256').update(b).digest('hex');
const plan=JSON.parse(read('bench/staged-rusqsieve-plan.json'));
assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','Commit clean measured tree first');
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),dir=join(root,'docs/benchmarks/staged-rusqsieve-stage17');mkdirSync(dir);
const run={plan:plan.id,planSha256:sha(read('bench/staged-rusqsieve-plan.json')),measuredHead:head,startedAt:new Date().toISOString(),trials:[]};
for(const t of plan.trials){
 if(t.stage!=='control'){assert.equal(run.trials.filter(t=>t.stage==='control').length,10);for(const c of plan.trials.filter(t=>t.stage==='control')){const o=JSON.parse(readFileSync(join(dir,c.id+'.json'))).records[0].outcome;assert.ok(['probable','factorized'].includes(o.kind)&&o.remaining==='1'&&o.factors.length===2&&o.allWorkersDisposed,'Controls must pass before RSA');}}
 const file=join(dir,t.id+'.json'),args=['scripts/verify-rusqsieve.mjs','--case',t.case,'--engine',t.variant,'--budget-ms',String(t.budgetMs),'--out',file],fd=openSync(join(dir,t.id+'.log'),'wx');
 let result;try{result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,PRIME_MEASURED_HEAD:head},stdio:['ignore',fd,fd],timeout:t.budgetMs+60000});}finally{closeSync(fd);}
 const record={id:t.id,stage:t.stage,args,exitCode:result.status,signal:result.signal,error:result.error?.message??null};run.trials.push(record);writeFileSync(join(dir,'run-all.json'),JSON.stringify(run,null,2)+'\n');console.log(JSON.stringify(record));
 if(result.status!==0||result.signal||result.error)throw Error('Trial failed; preserve evidence and stop');
}
run.completedAt=new Date().toISOString();writeFileSync(join(dir,'run-all.json'),JSON.stringify(run,null,2)+'\n');
