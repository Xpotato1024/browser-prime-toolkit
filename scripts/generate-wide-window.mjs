// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8'),write=(p,s)=>{if(process.argv.includes('--check'))assert.equal(read(p),s,p);else writeFileSync(p,s);};
const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'Wide runner anchor '+a.slice(0,100));return s.replace(a,b);};
let s=read('src/long-window/runner.js');
s=rep(s,"import{longWorkerSource as workerSourceForCap}from'./worker-source.js';","import{wideWorkerSource as workerSourceForCap}from'./worker-source.js';");
s=rep(s,"import{LONG_LIMITS,validateLongTimings,validateQuotaTelemetry}from'./budget.js';","import{WIDE_LIMITS as LONG_LIMITS,validateWideTimings as validateLongTimings,validateWideQuotaTelemetry as validateQuotaTelemetry}from'./budget.js';");
write('src/wide-window/runner.js',s);
write('src/wide-window/index.js',"// SPDX-License-Identifier: AGPL-3.0-only\nexport{runRusqsieve}from'./runner.js';\nexport{selectResourcePlan,validateResourcePlan}from'./policy.js';\n");
console.log('Derived explicit wide runner; ordinary and Stage37 namespaces preserved');
