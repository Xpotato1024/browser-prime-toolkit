// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {resourceMemoryContract} from '../native/resources/memory-contract.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=JSON.parse(read('native/rusqsieve-dlp/staged-build.json'));
for(const cap of [64,128]){
 const receipt=JSON.parse(read('native/resources/build-'+cap+'.json'));
 const {RUSQSIEVE_BASE64}=await import('../src/resources/wasm-'+cap+'.js'),bytes=Buffer.from(RUSQSIEVE_BASE64,'base64');
 assert.equal(bytes.length,receipt.bytes);assert.equal(sha(bytes),receipt.sha256);assert.equal(receipt.cleanBuilds,2);assert.equal(receipt.resourceMemoryMiB,cap);
 assert.deepEqual(resourceMemoryContract(bytes,cap),receipt.memory);assert.deepEqual(receipt.compiledSources,baseline.compiledSources);
 assert.ok(receipt.args.includes('-Clink-arg=--max-memory='+cap*1048576));
 for(const[p,h]of Object.entries(receipt.sourceHashes))assert.equal(sha(read(p)),h,p);
}
for(const script of ['generate-resource-runner.mjs','build-resource-worker.mjs','generate-resource-ui.mjs'])execFileSync(process.execPath,[new URL(script,import.meta.url).pathname,'--check'],{stdio:'pipe'});
console.log('Resources: reviewed source-equivalent role artifacts, hardcaps, receipts and generated runtime are exact');
