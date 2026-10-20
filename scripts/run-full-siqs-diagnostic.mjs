// SPDX-FileCopyrightText: 2026 Xpotato.net / Xpotato1024
// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),out=join(root,'docs/benchmarks/staged-full-diagnostic-stage16');
const p=await readFile(join(root,'bench/staged-full-diagnostic-plan.json')),plan=JSON.parse(p);
const git=(...args)=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(r.status,0);return r.stdout.trim();};
assert.equal(git('status','--porcelain','--untracked-files=no'),'');const head=git('rev-parse','HEAD');
await mkdir(out,{recursive:true});const file=join(out,'rsa100-counts.json'),log=join(out,'rsa100-counts.log');
const args=['scripts/verify-full-siqs-diagnostic.mjs','--case',plan.case,'--engine',plan.engine,'--seed',String(plan.seed),'--budget-ms',String(plan.budgetMs),'--out',file];
await writeFile(join(out,'invocation.json'),JSON.stringify({plan:plan.id,planSha256:createHash('sha256').update(p).digest('hex'),measuredHead:head,args,startedAt:new Date().toISOString()},null,2)+'\n',{flag:'wx'});
const r=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,PRIME_MEASURED_HEAD:head},encoding:'utf8',timeout:plan.budgetMs+60000,maxBuffer:4194304});
await writeFile(log,(r.stdout??'')+(r.stderr??'')+(r.error?'\n'+r.error.message+'\n':''),{flag:'wx'});assert.equal(r.status,0);
const j=JSON.parse(await readFile(file)),o=j.records[0].outcome;console.log(JSON.stringify({head,kind:o.kind,reason:o.reason,wallMs:o.requestWallMs,diagnostics:o.diagnostics}));
