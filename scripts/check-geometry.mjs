// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {RUSQSIEVE_BASE64} from '../src/rusqsieve-geometry/wasm-bytes.js';import {memoryContract} from '../native/rusqsieve/memory-contract.mjs';import {geometryProfile} from '../src/rusqsieve-geometry/contracts.js';import {geometryAsset} from './geometry-asset-route.mjs';import {RUS_WORKER_SOURCE} from '../src/rusqsieve-geometry/worker-source.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex');
const plan=JSON.parse(read('bench/staged-geometry-plan.json')),receipt=JSON.parse(read('native/rusqsieve-geometry/staged-build.json')),binary=Buffer.from(RUSQSIEVE_BASE64,'base64');
assert.equal(receipt.bytes,binary.length);assert.equal(receipt.sha256,sha(binary));assert.equal(receipt.cleanBuilds,2);assert.deepEqual(memoryContract(binary),receipt.memory);
assert.equal(receipt.commit,'4b150834b57636f6ebc350a81321a15c1cd901d2');assert.equal(receipt.image,'sha256:0aabc47a61c105a320b69fecbc2708a2118ec9e54a8b10946998f21bd23423d4');
for(const[p,h]of Object.entries(receipt.sourceHashes))assert.equal(sha(read(p)),h,p);
execFileSync('git',['diff','--exit-code','d1850cd','--','src/rusqsieve','src/rusqsieve-dlp','src/rusqsieve-scheduler','native/rusqsieve','native/rusqsieve-dlp','bench/staged-scheduler-plan.json','scripts/verify-scheduler.mjs','scripts/benchmark-scheduler.mjs','docs/benchmarks/staged-scheduler-stage19'],{cwd:root,stdio:'pipe'});
for(const s of ['scripts/generate-geometry-runner.mjs','scripts/build-geometry-worker.mjs'])execFileSync(process.execPath,[s,'--check'],{cwd:root,stdio:'pipe'});
assert.ok(RUS_WORKER_SOURCE.includes('d.version!==20'));assert.ok(!RUS_WORKER_SOURCE.includes('d.version!==19'));
assert.equal(plan.scheduler,'credit1');assert.equal(plan.workers,2);assert.equal(plan.trials.length,8);assert.equal(plan.gate.maxTrials,8);assert.deepEqual(plan.gate.normalizedProgress,{numerator:115,denominator:100});
for(const[p,v]of Object.entries(plan.profiles)){assert.deepEqual(geometryProfile(p),v);assert.deepEqual(plan.trials.filter(t=>t.profile===p).map(t=>t.repeat).sort(),[1,2]);}
assert.ok(plan.trials.every(t=>t.budgetMs===60000&&t.workers===2));
for(const p of ['/bench/staged-full/oracle.json','/bench/staged-full/%6fracle.json','/bench/staged-geometry-plan.json','/native/rusqsieve-geometry/staged-build.json'])assert.equal(geometryAsset(p),null);
console.log('Geometry source/pin/two-clean-build/memory, named settings, eight-trial gate, original Stage19 preservation and oracle boundary verified');
