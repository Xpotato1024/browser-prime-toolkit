import {readFileSync} from 'node:fs';
import {writeGenerated} from './generated-file.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),write=(p,s)=>writeGenerated(new URL('../'+p,import.meta.url),s);
function sub(s,a,b){if(s.split(a).length!==2)throw Error('Counted runner patch '+a);return s.replace(a,b);}
let s=read('bench/evaluation-runner.js');
s=sub(s,"import {makeEvaluationWorker} from '../src/worker/evaluation-factory.js';\nimport {makeSiqsWorker} from '../src/worker/siqs-factory.js';","import {makeCountedWorker} from '../src/worker/counted-factory.js';");
s=sub(s,"export async function runEvaluation(text,{kind='ecm',workers=1,base=2,seed=1,","export async function runCounted(text,{variant='legacy',capture=false,profile=false,fault=false,kind='siqs',workers=1,base=2,seed=1,");
s=sub(s,"if(!['ecm','pm1','profile','siqs'].includes(kind)||![1,2].includes(workers)||","if(!['legacy','clock-gated','dense','lanczos'].includes(variant)||[capture,profile,fault].some(x=>typeof x!=='boolean')||kind!=='siqs'||workers!==1||");
s=sub(s,'const configuration={kind,lane,workers,base};','const configuration={variant,capture,profile,fault};');
s=sub(s,"kind==='siqs'?makeSiqsWorker():makeEvaluationWorker(configuration)","makeCountedWorker(configuration)");
s=sub(s,'workers,kind,base,totalMs,computeMs,allocatedOperations:','workers,kind,variant,capture,profile,base,totalMs,computeMs,allocatedOperations:');
write('bench/counted-runner.js',s);
