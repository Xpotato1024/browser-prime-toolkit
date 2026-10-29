// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const write=(p,s)=>{if(process.argv.includes('--check'))assert.equal(read(p),s,p);else writeFileSync(p,s);};
const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'Long runner anchor '+a.slice(0,100));return s.replace(a,b);};
let s=read('src/optimized/runner.js');
s=rep(s,"import{optimizedWorkerSource as workerSourceForCap}from'./worker-source.js';","import{longWorkerSource as workerSourceForCap}from'./worker-source.js';\nimport{LONG_LIMITS,validateLongTimings,validateQuotaTelemetry}from'./budget.js';");
s=rep(s,",validateDlpTimings} from '../rusqsieve-dlp/contracts.js';","} from '../rusqsieve-dlp/contracts.js';");
s=rep(s,"from '../graph-multicore/policy.js'","from './policy.js'");
s=rep(s,"const LIMITS={...BASE_LIMITS,transportBytes:resourcePlan.transportBytes};","const LIMITS={...BASE_LIMITS,maxMs:LONG_LIMITS.maxMs,transportBytes:resourcePlan.transportBytes};");
// The ordinary evaluator has a 4096-family option; long/wide retain their own cap.
s=rep(s,'fixedFamilies=null,familyLimit=null,','fixedFamilies=null,');
s=rep(s," if(familyLimit!==null&&(!Number.isSafeInteger(familyLimit)||familyLimit<1||familyLimit>4096))throw Error('Finite family limit');\n","");
s=rep(s,'fixedFamilies>128','fixedFamilies>LONG_LIMITS.maxFamilies');
s=rep(s,'events.length>4096','events.length>LONG_LIMITS.maxEvents');
s=rep(s,'validateDlpTimings(d.timings,owner.timings)','validateLongTimings(d.timings,owner.timings)');
s=rep(s,'Math.min(familyBudget,familyLimit??familyBudget,fixedFamilies??familyBudget)','Math.min(familyBudget,LONG_LIMITS.maxFamilies,fixedFamilies??familyBudget)');
s=rep(s,"release();return;}","if(submitted>=LONG_LIMITS.maxFamilies&&relations<target){finish('incomplete','family-budget');return;}release();return;}");
s=rep(s,"if(d.type==='fatal'){record('fatal',{owner:owner.index,...d});finish('incomplete',d.reason,{fatal:d});return;}",`if(d.type==='fatal'){
    const q=validateQuotaTelemetry(d.nativeQuota);
    if(d.reason==='native-memory-budget'&&(phase!=='extracting'||owner.index!==0||!q?.extracting||q.active!==1||q.refusals<1||!d.memory||d.memory.allocationFailures<1))throw Error('Native quota classification');
    record('fatal',{owner:owner.index,...d});finish('incomplete',d.reason,{fatal:d,nativeQuota:q});return;
   }`);
s=rep(s,"record('extracted',{status:d.status,before:d.before,after:d.after});",`const q=validateQuotaTelemetry(d.nativeQuota);
    if(!q?.extracting||q.active!==0)throw Error('Extraction quota scope');
    record('extracted',{status:d.status,before:d.before,after:d.after,nativeQuota:q});
    if(q.preflightRefused||q.refusals>0){
     if(d.status!==5||d.divisor)throw Error('Native quota result');
     finish('incomplete','native-memory-budget',{extractionStatus:d.status,nativeQuota:q});return;
    }`);
s=rep(s,"{divisor:d.divisor,extractionStatus:d.status}","{divisor:d.divisor,extractionStatus:d.status,nativeQuota:q}");
s=rep(s,"{extractionStatus:d.status});","{extractionStatus:d.status,nativeQuota:q});");
write('src/long-window/runner.js',s);
write('src/long-window/index.js',"// SPDX-License-Identifier: AGPL-3.0-only\nexport{runRusqsieve}from'./runner.js';\nexport{selectResourcePlan,validateResourcePlan}from'./policy.js';\n");
console.log('Derived bounded long runner; ordinary entry and 600s contract preserved');
