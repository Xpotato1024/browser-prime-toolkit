// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8'),write=(p,s)=>{if(process.argv.includes('--check'))assert.equal(read(p),s,p);else writeFileSync(p,s);};
const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'Wide runner anchor '+a.slice(0,100));return s.replace(a,b);};
let s=read('src/long-window/runner.js');
s=rep(s,"import{longWorkerSource as workerSourceForCap}from'./worker-source.js';","import{wideWorkerSource as workerSourceForCap}from'./worker-source.js';");
s=rep(s,"import{LONG_LIMITS,validateLongTimings,validateQuotaTelemetry}from'./budget.js';","import{WIDE_LIMITS as LONG_LIMITS,validateWideTimings as validateLongTimings,validateWideQuotaTelemetry as validateQuotaTelemetry}from'./budget.js';");
s=rep(s,"validateInput,validatePacket,validateMemory}","validateInput,validatePacket}");
s=rep(s,"import {selectResourcePlan,validateResourcePlan} from './policy.js';","import {selectResourcePlan,validateResourcePlan} from './policy.js';\nimport {validateWideMemory} from './memory.js';");
s=rep(s,"validateMemory(m);","validateWideMemory(m,resourcePlan.ownerCapsMiB[owner.index]);");
// Preserve the reviewed internal factory used by the experimental 400-bit port.
s=rep(s,'let nextGeneration=0;\nexport function runRusqsieve(input,options={}){',
 "// Internal factory; public index.js exports only the fixed runRusqsieve binding.\nexport function createRusqsieveRunner({inputValidator=validateInput,sourceForCap=workerSourceForCap,configurationValidator=validateDlpConfiguration}={}){\n let nextGeneration=0;\n return function runRusqsieve(input,options={}){");
s=rep(s,'fixedFamilies=null,','fixedFamilies=null,familyLimit=null,');
s=rep(s," const policy=schedulerProfile(scheduler);"," if(familyLimit!==null&&(!Number.isSafeInteger(familyLimit)||familyLimit<1||familyLimit>4096))throw Error('Finite family limit');\n const policy=schedulerProfile(scheduler);");
s=rep(s,'workerSourceForCap(cap)','sourceForCap(cap)');
s=rep(s,'const inputInfo=validateInput(input)','const inputInfo=inputValidator(input)');
s=rep(s,'validateDlpConfiguration(d.config,profile,inputInfo.bits)','configurationValidator(d.config,profile,inputInfo.bits)');
s=rep(s,'Math.min(familyBudget,LONG_LIMITS.maxFamilies,fixedFamilies??familyBudget)','Math.min(familyBudget,LONG_LIMITS.maxFamilies,familyLimit??familyBudget,fixedFamilies??familyBudget)');
s+='}\nexport const runRusqsieve=createRusqsieveRunner();\n';
write('src/wide-window/runner.js',s);
write('src/wide-window/index.js',"// SPDX-License-Identifier: AGPL-3.0-only\nexport{runRusqsieve}from'./runner.js';\nexport{selectResourcePlan,validateResourcePlan}from'./policy.js';\n");
console.log('Derived explicit wide runner; ordinary and Stage37 namespaces preserved');
