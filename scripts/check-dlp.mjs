// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {RUSQSIEVE_BASE64} from '../src/rusqsieve-dlp/wasm-bytes.js';
import {memoryContract} from '../native/rusqsieve/memory-contract.mjs';
import {dlpAsset} from './dlp-asset-route.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(read('native/rusqsieve-dlp/staged-build.json')),binary=Buffer.from(RUSQSIEVE_BASE64,'base64');
assert.equal(receipt.cleanBuilds,2);assert.equal(receipt.bytes,binary.length);assert.equal(receipt.sha256,sha(binary));assert.deepEqual(memoryContract(binary),receipt.memory);
for(const[p,h]of Object.entries(receipt.sourceHashes))assert.equal(sha(read(p)),h,p);
assert.equal(receipt.commit,'4b150834b57636f6ebc350a81321a15c1cd901d2');assert.equal(receipt.image,'sha256:0aabc47a61c105a320b69fecbc2708a2118ec9e54a8b10946998f21bd23423d4');
const exports=WebAssembly.Module.exports(new WebAssembly.Module(binary)).map(e=>e.name);
for(const name of ['codex_dlp_version','codex_dlp_new','codex_dlp_prepare','codex_dlp_coord_config','codex_dlp_worker_config','codex_dlp_stat'])assert.ok(exports.includes(name));
const fixed=['src/rusqsieve','native/rusqsieve','bench/rusqsieve.js','bench/rusqsieve.html','scripts/verify-rusqsieve.mjs','scripts/benchmark-rusqsieve.mjs','scripts/build-rusqsieve.mjs','scripts/build-rusqsieve-worker.mjs','bench/staged-rusqsieve-plan.json'];
execFileSync('git',['diff','--exit-code','b2e38bb4b87a36cf2f76159c6ac6b76d4ea60064','--',...fixed],{cwd:root,stdio:'pipe'});
for(const script of ['scripts/generate-dlp-runner.mjs','scripts/build-dlp-worker.mjs'])execFileSync(process.execPath,[script,'--check'],{cwd:root,stdio:'pipe'});
for(const url of ['/bench/staged-full/oracle.json','/bench/staged-full/%6fracle.json','/bench/staged-dlp-plan.json','/native/rusqsieve-dlp/staged-build.json','/src/../bench/staged-full/oracle.json'])assert.equal(dlpAsset(url),null);
const plan=JSON.parse(read('bench/staged-dlp-plan.json'));
assert.equal(plan.trials.length,12);assert.equal(new Set(plan.trials.map(t=>t.id)).size,12);
for(const p of ['baseline','half','quarter'])for(const w of [1,2])assert.deepEqual(plan.trials.filter(t=>t.profile===p&&t.workers===w).map(t=>t.repeat).sort(),[1,2]);
assert.ok(plan.trials.every(t=>t.budgetMs===60000));assert.equal(plan.gate.maxLongTrials,4);assert.equal(plan.gate.longBudgetMs,600000);
console.log('DLP source/pin/artifact/memory, original Stage17 preservation, generated lifecycle and finite12-trial plan verified');
