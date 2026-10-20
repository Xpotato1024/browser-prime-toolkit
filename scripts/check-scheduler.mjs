// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {schedulerAsset} from './scheduler-asset-route.mjs';import {schedulerProfile} from '../src/rusqsieve-scheduler/credits.js';import {RUSQSIEVE_BASE64} from '../src/rusqsieve-dlp/wasm-bytes.js';import {RUS_WORKER_SOURCE} from '../src/rusqsieve-scheduler/worker-source.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),plan=JSON.parse(read('bench/staged-scheduler-plan.json'));
assert.equal(createHash('sha256').update(Buffer.from(RUSQSIEVE_BASE64,'base64')).digest('hex'),plan.wasmSha256);
execFileSync('git',['diff','--exit-code',plan.baseHead,'--','src/rusqsieve','src/rusqsieve-dlp','native/rusqsieve','native/rusqsieve-dlp','bench/staged-dlp-plan.json','scripts/verify-dlp.mjs','scripts/benchmark-dlp.mjs'],{cwd:root,stdio:'pipe'});
for(const script of ['scripts/generate-scheduler-runner.mjs','scripts/build-scheduler-worker.mjs'])execFileSync(process.execPath,[script,'--check'],{cwd:root,stdio:'pipe'});
assert.ok(RUS_WORKER_SOURCE.includes('d.version!==19'));assert.ok(!RUS_WORKER_SOURCE.includes('d.version!==18'));
for(const [name,p]of Object.entries(plan.modes))assert.deepEqual(schedulerProfile(name),p);
assert.equal(plan.controls.length,6);assert.equal(plan.trials.length,12);
for(const name of Object.keys(plan.modes))for(const workers of [1,2]){
 assert.equal(plan.controls.filter(t=>t.scheduler===name&&t.workers===workers&&t.fixedFamilies===4&&t.budgetMs===180000).length,1);
 assert.deepEqual(plan.trials.filter(t=>t.scheduler===name&&t.workers===workers).map(t=>t.repeat).sort(),[1,2]);
}
assert.ok(plan.trials.every(t=>t.budgetMs===60000));
for(const p of ['/bench/staged-full/oracle.json','/bench/staged-full/%6fracle.json','/bench/staged-scheduler-plan.json','/native/rusqsieve-dlp/staged-build.json','/src/../bench/staged-full/oracle.json'])assert.equal(schedulerAsset(p),null);
console.log('Stage19 frozen WASM, preserved baseline, generated version, scheduler bounds, finite plan and oracle boundary verified');
