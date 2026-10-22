import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const arg=(k,f)=>process.argv.includes(k)?process.argv[process.argv.indexOf(k)+1]:f;
const stage=arg('--stage','all');
assert.ok(['all','meter','parameter','pool'].includes(stage));
const planBytes=await readFile(join(root,'bench/siqs-lab-plan.json'));
const plan=JSON.parse(planBytes),trials=plan.trials.filter(t=>stage==='all'||t.stage===stage);
assert.ok(trials.length>0&&new Set(plan.trials.map(t=>t.id)).size===38);
const git=(...a)=>{const r=spawnSync('git',a,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
const head=git('rev-parse','HEAD');
assert.match(head,/^[0-9a-f]{40}$/);
assert.equal(git('status','--porcelain','--untracked-files=no'),'','Commit measured implementation first');
assert.ok(git('merge-base','--is-ancestor',plan.baseHead,head)==='');
const out=resolve(arg('--out-dir',join(root,'docs/benchmarks/siqs-lab-stage14')));
const absent=async p=>{try{await access(p);throw Error('Refusing to overwrite '+p);}catch(e){if(e.code!=='ENOENT')throw e;}};
const paths=trials.map(t=>({trial:t,json:join(out,t.id+'.json'),log:join(out,t.id+'.log')}));
for(const p of paths){await absent(p.json);await absent(p.log);}
const manifest={plan:plan.id,planSha256:createHash('sha256').update(planBytes).digest('hex'),measuredHead:head,stage,startedAt:new Date().toISOString(),trials:[]};
const manifestPath=join(out,'run-'+stage+'.json');await absent(manifestPath);
for(const {trial:t,json,log} of paths){
 const args=['scripts/verify-siqs-lab.mjs','--case',t.case,'--variant',t.variant,'--seed',String(t.seed),
  '--workers',String(t.workers),'--streams',String(t.streams),'--operations',String(t.operations),
  '--budget-ms',String(t.budgetMs),'--memory-sampler',t.memory,'--trial',t.id,'--out',json];
 console.log('START '+t.id+' '+new Date().toISOString());
 const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:t.budgetMs+60000,maxBuffer:16*1024*1024,
  env:{...process.env,PRIME_MEASURED_HEAD:head},windowsHide:true});
 const text=(result.stdout??'')+(result.stderr??'')+(result.error?'\n'+String(result.error):'');
 await writeFile(log,text,{flag:'wx'});
 manifest.trials.push({id:t.id,args,exitCode:result.status,signal:result.signal,error:result.error?.message??null});
 await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 console.log('END '+t.id+' exit='+result.status);
 if(result.status!==0){console.error('Trial failed; preserved log and any receipt. No candidates skipped.');process.exitCode=1;break;}
}
manifest.finishedAt=new Date().toISOString();
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
