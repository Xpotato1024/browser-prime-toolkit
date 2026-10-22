import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),directory=mkdtempSync(join(tmpdir(),'prime-fixed-pool-'));
const cases=['balanced-13-0','balanced-96bit-0','balanced-112bit-0','holdout-balanced-112','holdout-unbalanced-m127'];
const trials=[];
try{
 for(const id of cases)for(const seed of [1,11])for(const workers of seed===1?[1,2]:[2,1]){
  const out=join(directory,'trial.json');
  const p=spawnSync(process.execPath,['scripts/benchmark-supplement.mjs','--mode','pool','--case',id,'--seed',String(seed),'--workers',String(workers),'--out',out],
    {cwd:root,env:process.env,encoding:'utf8',timeout:45000,maxBuffer:1048576});
  if(p.status!==0)throw Error(p.stdout+'\n'+p.stderr);
  trials.push(JSON.parse(readFileSync(out)));console.log(id+' seed '+seed+' workers '+workers);
 }
 const receipt={freshChromePerTrial:true,order:'case, seed1 1/2 then seed11 2/1',trials,
  runnerSha256:createHash('sha256').update(readFileSync(new URL('./run-supplement-matrix.mjs',import.meta.url))).digest('hex')};
 writeFileSync(new URL('../docs/benchmarks/llm01-supplement-pool.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');
}finally{rmSync(directory,{recursive:true,force:true});}
