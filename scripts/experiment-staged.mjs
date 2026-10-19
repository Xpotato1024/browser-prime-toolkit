import {spawnSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const arg=(k,d)=>process.argv.includes(k)?process.argv[process.argv.indexOf(k)+1]:d;
const group=arg('--group','train'),directory=resolve(arg('--directory','staged-runs'));
if(!['train','holdout'].includes(group))throw Error('Group');
const variants=group==='train'?['brent','ecm','siqs','p64','p80']:['brent','ecm','siqs',(await import('../src/engine/staged-selected.js')).SELECTED_STAGED_MODE];
const seeds=group==='train'?[1,11,23]:[101,211,307,401,503];
const corpus=JSON.parse(await readFile(new URL('../bench/staged-'+group+'.json',import.meta.url)));
await mkdir(directory,{recursive:false});
const trials=[];
for(let repeat=0;repeat<seeds.length;repeat++)for(let index=0;index<corpus.length;index++){
 const c=corpus[index],order=variants.map((_,i)=>variants[(i+index+repeat)%variants.length]);
 for(const variant of order){
  const ordinal=trials.length,output=join(directory,String(ordinal).padStart(3,'0')+'.json');
  const args=['scripts/benchmark-staged.mjs','--group',group,'--case',c.id,'--seed',String(seeds[repeat]),'--variant',variant,'--out',output];
  const run=spawnSync(process.execPath,args,{encoding:'utf8',timeout:90000,env:process.env});
  await writeFile(output+'.log',run.stdout+run.stderr,{flag:'wx'});
  if(run.status!==0)throw Error('Trial '+ordinal+' failed; evidence retained at '+output+'.log');
  trials.push({ordinal,repeat,receipt:JSON.parse(await readFile(output))});
  console.log(group+' '+trials.length+'/'+(seeds.length*corpus.length*variants.length)+' '+c.id+' '+variant);
 }
}
const value={schema:1,group,variants,seeds,measuredHead:process.env.PRIME_MEASURED_HEAD??null,trials};
await writeFile(join(directory,'aggregate.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
