import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),directory=mkdtempSync(join(tmpdir(),'prime-counted-'));
const cases=['balanced-13-0','balanced-96bit-0','balanced-112bit-0','holdout-balanced-80','holdout-balanced-112'];
const variants=['legacy','clock-gated','dense','lanczos'],mode=process.argv.includes('--diagnostic')?'diagnostic':process.argv.includes('--lifecycle')?'lifecycle':'primary';
const trials=[];
try{
 for(let index=0;index<(mode==='lifecycle'?1:cases.length);index++){
  const id=cases[index],order=variants.slice(index%4).concat(variants.slice(0,index%4));
  for(const budget of mode==='primary'?[1000,10000]:[10000])for(const variant of order){
   const out=join(directory,'trial.json');
   const p=spawnSync(process.execPath,['scripts/benchmark-counted.mjs','--mode',mode,'--variant',variant,'--case',id,'--budget',String(budget),'--out',out],
    {cwd:root,env:process.env,encoding:'utf8',timeout:65000,maxBuffer:2097152});
   if(p.status!==0)throw Error(p.stdout+'\n'+p.stderr);
   trials.push(JSON.parse(readFileSync(out)));console.log(mode+' '+id+' '+budget+' '+variant);
  }
 }
 const receipt={freshChromePerTrial:true,order:'case index rotates legacy/clock-gated/dense/lanczos; primary 1000ms then 10000ms',mode,trials,
  runnerSha256:createHash('sha256').update(readFileSync(new URL('./run-counted-matrix.mjs',import.meta.url))).digest('hex')};
 writeFileSync(new URL('../docs/benchmarks/llm01-counted-'+mode+'.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');
}finally{rmSync(directory,{recursive:true,force:true});}
