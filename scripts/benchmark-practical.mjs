import {refinementTiers} from './practical-plan.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const root='docs/benchmarks/',catalog=await read('bench/staged-practical/catalog.json'),manifest=await read('bench/staged-practical/manifest.json');
const contract=await read(root+'llm01-staged-long-contract.json'),measuredHead=contract.measuredHead;
const evidence=[],tiers=[],initial=[12,16,20,24,28,32],budgets=[3000,30000,180000];
const run=async args=>new Promise((yes,no)=>{const p=spawn(process.execPath,args,{env:{...process.env,PRIME_MEASURED_HEAD:measuredHead},stdio:'inherit'});p.on('error',no);p.on('exit',c=>c===0?yes():no(Error('Trial CLI exit '+c)));});
async function trial(c,seed,budgetMs){
 const path=root+'llm01-staged-practical-'+c.id.slice('balanced-'.length)+'-seed'+seed+'-'+budgetMs+'.json';
 try{await access(path);}catch(e){if(e.code!=='ENOENT')throw e;await run(['scripts/verify-long-rsa.mjs','--case',c.id,'--seed',String(seed),'--budget-ms',String(budgetMs),'--out',path]);}
 const r=await read(path),record=r.records[0],v=record.outcome;
 assert.equal(r.measuredHead,measuredHead);assert.equal(r.budgetMs,budgetMs);assert.equal(record.id,c.id);assert.equal(record.input,c.input);
 assert.equal(record.seed,seed);assert.equal(record.oracleCheckedAfterRetirement,true);assert.equal(record.knownFactorsUsed,false);
 assert.deepEqual(r.sourceFiles,contract.sourceFiles);assert.equal(v.allWorkersDisposed,true);
 assert.ok(['factorized','timeout'].includes(v.kind),'Unexpected implementation/fatal/operation constraint: '+v.kind+'/'+v.reason);
 evidence.push({id:c.id,seed,budgetMs,path,kind:v.kind,reason:v.reason,requestWallMs:v.requestWallMs});
 console.log(JSON.stringify(evidence.at(-1)));return v.kind==='factorized';
}
async function tier(digits){
 const selected=catalog.cases.filter(c=>c.digits===digits);assert.equal(selected.length,2);let solved=0;
 for(const c of selected)for(const seed of manifest.seeds){
  for(const budgetMs of budgets)if(await trial(c,seed,budgetMs)){solved++;break;}
 }
 const solvedByBudget=budgets.map(b=>({budgetMs:b,solved:new Set(evidence.filter(e=>selected.some(c=>c.id===e.id)&&e.kind==='factorized'&&e.budgetMs<=b).map(e=>e.id+'/'+e.seed)).size}));
 tiers.push({digits,pairs:4,solvedWithin180s:solved,solvedByBudget});return solved;
}
let previous=null,boundary=null;
for(const digits of initial){
 const solved=await tier(digits);
 if(solved===0){boundary=digits;break;}previous=digits;
}
if(boundary!==null&&previous!==null)for(let d=previous+2;d<boundary;d+=2)await tier(d);
if(boundary===null)for(const d of [34,36]){if(await tier(d)===0){boundary=d;break;}}
for(const d of refinementTiers(tiers))if(!tiers.some(t=>t.digits===d))await tier(d);
const result={schema:2,refinementPolicy:'two-digits-at-each-budget-transition',measuredHead,frozenManifest:manifest,initialTiers:initial,executedTiers:tiers,boundaryAllFourUnsolvedAt180s:boundary,
 stopReason:boundary===null?'initial-36-digit-ceiling':'first-tier-with-no-180s-success',evidence};
await writeFile(root+'llm01-staged-practical-schedule.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({complete:true,tiers,firstAllUnsolved:boundary,rawTrials:evidence.length}));
