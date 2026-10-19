import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const trainingPath='docs/benchmarks/llm01-staged-training.json';
const raw=await readFile(trainingPath),data=JSON.parse(raw);
if(data.trials.length!==90||data.group!=='train')throw Error('Frozen training size');
function median(values){const a=values.toSorted((a,b)=>a-b),n=a.length;return(a[(n-1)>>1]+a[n>>1])/2;}
const candidates=['p64','p80'].map(mode=>{
 const rows=data.trials.filter(t=>t.receipt.variant===mode).map(t=>t.receipt.records[0].result);
 return{mode,trials:rows.length,success:rows.filter(r=>['complete','probable'].includes(r.status)).length,allTrialMedianMs:median(rows.map(r=>r.requestWallMs))};
});
candidates.sort((a,b)=>b.success-a.success||a.allTrialMedianMs-b.allTrialMedianMs||Number(a.mode.slice(1))-Number(b.mode.slice(1)));
const mode=candidates[0].mode;
const policy={schema:1,provisional:true,mode,trainingPath,trainingSha256:createHash('sha256').update(raw).digest('hex'),
 trainingHead:data.measuredHead,criterion:'maximum resolved outcomes, then median over all trials including incomplete, then smaller bit cutoff',
 candidates,holdoutSha256:createHash('sha256').update(await readFile('bench/staged-holdout.json')).digest('hex'),
 limits:{input:'0 <= n < 2^128',requestMs:1000,operations:50000000,workers:1,brentPrefix:{ms:20,operations:50000},ecmPrefix:{ms:80,operations:500000}}};
const outputs={'bench/staged-selected-policy.json':JSON.stringify(policy,null,2)+'\n',
 'src/engine/staged-selected.js':"import {selectStagedPlan} from './staged-plan.js';\nexport const SELECTED_STAGED_MODE='"+mode+"';\nexport const selectValidatedStagedPlan=(input,options={})=>selectStagedPlan(input,{...options,mode:SELECTED_STAGED_MODE});\n",
 'src/worker/staged-selected.js':"import {SELECTED_STAGED_MODE} from '../engine/staged-selected.js';\nimport {runStagedRequest} from './staged-controller.js';\nexport const runSelectedStagedRequest=(input,options={},dependencies={})=>runStagedRequest(input,{...options,mode:SELECTED_STAGED_MODE},dependencies);\n"};
for(const [path,text]of Object.entries(outputs)){
 if(process.argv.includes('--check')){if(await readFile(path,'utf8')!==text)throw Error('Frozen choice changed '+path);}
 else await writeFile(path,text,{flag:'wx'});
}
console.log('Training-only provisional selection',mode,candidates);
