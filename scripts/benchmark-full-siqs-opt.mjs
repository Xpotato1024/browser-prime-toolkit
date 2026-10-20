import assert from 'node:assert/strict';
import {readFile,writeFile,access,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),arg=(k,f)=>process.argv.includes(k)?process.argv[process.argv.indexOf(k)+1]:f;
const planBytes=await readFile(join(root,'bench/staged-full-opt-plan.json')),plan=JSON.parse(planBytes),out=resolve(arg('--out-dir',join(root,'docs/benchmarks/staged-full-opt-stage16')));
const git=(...a)=>{const r=spawnSync('git',a,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
const head=git('rev-parse','HEAD');assert.match(head,/^[a-f0-9]{40}$/);assert.equal(git('status','--porcelain','--untracked-files=no'),'','Commit measurement code first');git('merge-base','--is-ancestor',plan.baseHead,head);
const absent=async p=>{try{await access(p);throw Error('Refusing overwrite '+p);}catch(e){if(e.code!=='ENOENT')throw e;}};
await mkdir(out,{recursive:true});for(const t of plan.trials)for(const ext of ['json','log'])await absent(join(out,t.id+'.'+ext));await absent(join(out,'run-all.json'));
const manifest={plan:plan.id,planSha256:createHash('sha256').update(planBytes).digest('hex'),measuredHead:head,startedAt:new Date().toISOString(),trials:[]};
for(const t of plan.trials){
 const json=join(out,t.id+'.json'),log=join(out,t.id+'.log'),args=['scripts/verify-full-siqs-opt.mjs','--engine',t.engine,'--case',t.case,'--seed',String(t.seed),'--budget-ms',String(t.budgetMs),'--out',json];
 console.log('START '+t.id+' '+new Date().toISOString());const r=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,PRIME_MEASURED_HEAD:head},encoding:'utf8',timeout:t.budgetMs+60000,maxBuffer:4*1024*1024});
 await writeFile(log,(r.stdout??'')+(r.stderr??'')+(r.error?'\nPROCESS ERROR: '+r.error.message+'\n':''));
 manifest.trials.push({id:t.id,args,exitCode:r.status,signal:r.signal??null,error:r.error?.message??null});await writeFile(join(out,'run-all.json'),JSON.stringify(manifest,null,2)+'\n');console.log('END '+t.id+' exit='+r.status);
 assert.equal(r.status,0,'Retained failed trial '+t.id);const receipt=JSON.parse(await readFile(json)),record=receipt.records[0],o=record.outcome;
 assert.equal(receipt.measuredHead,head);assert.equal(receipt.variant,t.engine);assert.equal(o.allWorkersDisposed,true);
 if(t.stage==='control'){assert.ok(['factorized','probable'].includes(o.kind)&&o.result?.remaining==='1'&&record.oracleCheckedAfterRetirement);assert.ok(o.diagnostics.nnz>0&&[4,5,6].every(p=>o.diagnostics.phaseWork[p]>0),'Whole pipeline control must reach filter, matrix and sqrt');}
}
console.log('Completed '+plan.trials.length+' bounded trials at '+head);
