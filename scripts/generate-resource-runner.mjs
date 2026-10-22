// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let source=read('src/rusqsieve-scheduler/runner.js');
function change(a,b){assert.equal(source.split(a).length,2,'Resource runner anchor '+a.slice(0,80));source=source.replace(a,b);}
change("import {RUS_WORKER_SOURCE} from './worker-source.js';","import {workerSourceForCap} from './worker-sources.js';\nimport {selectResourcePlan,validateResourcePlan} from './policy.js';");
change("scheduler='batch2'","scheduler='credit1'");
change("workers=1","resourcePlan=selectResourcePlan(),workers=resourcePlan.workers");
change("createWorker=()=>makeWorkerFromSource(RUS_WORKER_SOURCE)","createWorker=(index,cap)=>makeWorkerFromSource(workerSourceForCap(cap))");
change("const policy=schedulerProfile(scheduler);","validateResourcePlan(resourcePlan);if(workers!==resourcePlan.workers||timeBudgetMs!==resourcePlan.timeBudgetMs)throw Error('Resource request identity');\n const policy=schedulerProfile(scheduler);");
change("timeBudgetMs=600000","timeBudgetMs=resourcePlan.timeBudgetMs");
change("![1,2].includes(workers)","![1,2,3,4].includes(workers)");
change("clock.transition(now(),owners,ledger.owned,policy.credit)","clock.transition(now(),owners,ledger.owned,policy.credit,ledger.reservedBytes)");
change("collectorStats=null,ledger=null,clock=null;","collectorStats=null,ledger=null,clock=null,dispatchCursor=0;");
change("resolve({scheduler,","resolve({resourcePlan,scheduler,");
change("maximumWasmBytes:workers*LIMITS.wasmBytes","maximumWasmBytes:resourcePlan.totalWasmBytes");
change("for(const owner of owners){if(owner.job||owner.command||owner.retired)continue;","for(let offset=0;offset<owners.length;offset++){const owner=owners[(dispatchCursor+offset)%owners.length];if(owner.job||owner.command||owner.retired)continue;");
change("issued=ledger.issued;owner.job=job;post(owner,'job',{...job,target,factorBaseSize,familyBudget});","issued=ledger.issued;owner.job=job;post(owner,'job',{...job,target,factorBaseSize,familyBudget});\n   }\n   dispatchCursor=(dispatchCursor+1)%owners.length;\n   if(false){");
change("m.linearBytes>LIMITS.wasmBytes","m.linearBytes>resourcePlan.ownerCapsMiB[owner.index]*1048576");
change("if(owner.command!=='init')throw Error('Unexpected ready');","if(owner.command!=='init'||d.role!==(owner.index===0?'coord':'sieve')||d.maxMiB!==resourcePlan.ownerCapsMiB[owner.index])throw Error('Unexpected ready role/cap');");
change("const worker=createWorker(),owner=","const worker=createWorker(index,resourcePlan.ownerCapsMiB[index]),owner=");
change("post(owner,'init',{input,profile,scheduler,role:","post(owner,'init',{input,profile,scheduler,maxMiB:resourcePlan.ownerCapsMiB[index],role:");
source=source.replaceAll('version:19','version:21').replaceAll('d.version!==19','d.version!==21');
source=source.replace("   if(false){\n   }",""); // retain original closing brace without an extra empty block
let body=read('src/rusqsieve-scheduler/worker-body.js').replaceAll('version:19','version:21').replaceAll('d.version!==19','d.version!==21');
const a="generation=d.generation;input=d.input;role=d.role;";assert.equal(body.split(a).length,2);
body=body.replace(a,a+"if(d.maxMiB!==OWNER_CAP_MIB||!(role==='coord'?[128,256].includes(OWNER_CAP_MIB):role==='sieve'&&OWNER_CAP_MIB===64))throw Error('Role artifact cap');");
body=body.replace("memoryContract(bytes);","resourceMemoryContract(bytes,OWNER_CAP_MIB);");
body=body.replace("send('ready',{role,","send('ready',{maxMiB:OWNER_CAP_MIB,role,");
for(const[p,s]of [['src/resources/runner.js',source],['src/resources/worker-body.js',body]]){const path=new URL('../'+p,import.meta.url);if(process.argv.includes('--check'))assert.equal(readFileSync(path,'utf8'),s);else writeFileSync(path,s);}
console.log('Resource runner derives numeric/lifecycle code with named hardcaps and bounded round-robin');
