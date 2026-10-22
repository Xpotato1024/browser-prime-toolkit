import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),arg=(k,d)=>process.argv.includes(k)?process.argv[process.argv.indexOf(k)+1]:d;
const digits=Number(arg('--digits','0')),maximum=Number(arg('--max-budget-ms','180000'));
assert.ok(digits>=40&&digits<=100&&digits%2===0);
assert.ok([3000,30000,180000,600000].includes(maximum));
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
assert.match(head,/^[0-9a-f]{40}$/);
const catalog=JSON.parse(readFileSync(join(root,'bench/staged-full/catalog.json'))).cases.filter(c=>c.digits===digits);
assert.equal(catalog.length,2);
const complete=r=>['factorized','probable'].includes(r.kind)&&r.result?.remaining==='1';
for(const c of catalog)for(const seed of [1,11]){
 for(const budget of [3000,30000,180000,600000].filter(b=>b<=maximum)){
  const path=join(root,'docs/benchmarks/llm01-staged-full-'+c.id+'-seed'+seed+'-'+budget+'.json');
  if(!existsSync(path)){
   const child=spawnSync(process.execPath,[join(root,'scripts/verify-full-siqs.mjs'),'--case',c.id,'--seed',String(seed),'--budget-ms',String(budget),'--out',path],{cwd:root,env:{...process.env,PRIME_MEASURED_HEAD:head},stdio:'inherit',timeout:budget+90000});
   if(child.status!==0)throw Error('Full benchmark stopped: '+c.id+' '+seed+' '+budget+' '+child.error);
  }
  const r=JSON.parse(readFileSync(path));
  assert.equal(r.measuredHead,head);assert.equal(r.caseId,c.id);assert.equal(r.seed,seed);assert.equal(r.budgetMs,budget);
  assert.equal(r.quiet.networkRequests,0);assert.equal(r.ownership.live,0);assert.ok(r.ownership.maxLive<=1);
  for(const [p,h]of Object.entries(r.sourceFiles))assert.equal(createHash('sha256').update(readFileSync(join(root,p))).digest('hex'),h,'Frozen source '+p);
  const record=r.records[0];assert.equal(record.input,c.input);assert.equal(record.oracleCheckedAfterRetirement,true);
  const outcome=record.outcome;
  console.log(JSON.stringify({digits,id:c.id,seed,budget,kind:outcome.kind,reason:outcome.reason,ms:outcome.requestWallMs}));
  if(complete(outcome))break;
  if(outcome.kind==='fatal'||outcome.kind==='resource-limit')break;
 }
}
