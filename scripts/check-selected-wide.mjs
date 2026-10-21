// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resourceMemoryContract} from '../native/resources/memory-contract.mjs';
import {selectedWideWorkerSource} from '../src/selected-wide/worker-source.js';
import {wideWorkerSource} from '../src/wide-window/worker-source.js';
const read=p=>readFileSync(p),sha=b=>createHash('sha256').update(b).digest('hex');
const helper=JSON.parse(read('native/selected-wide/build-selected-64.json')),old=JSON.parse(read('native/graph-builtin/build-builtin-64.json')),owner=JSON.parse(read('native/resieve-followup/build-resieve1-1024.json'));
assert.equal(helper.cleanBuilds,2);assert.equal(helper.graphVariant,'selected-64');
for(const key of ['commit','upstreamSha256','image','compiler','target','simd','args'])assert.deepEqual(helper[key],old[key]);
assert.deepEqual(Object.keys(helper.compiledSources),Object.keys(old.compiledSources));
assert.deepEqual(Object.keys(helper.compiledSources).filter(p=>helper.compiledSources[p]!==old.compiledSources[p]),['src/src/engine.rs']);
assert.match(helper.resieveFunctionSha256,/^[a-f0-9]{64}$/);assert.equal(helper.ownerEngineSha256,owner.compiledSources['src/src/engine.rs']);
for(const[p,h]of Object.entries(helper.sourceHashes))assert.equal(sha(read(p)),h,p);
for(const cap of [64,1024]){
 const pattern=/const RUSQSIEVE_BASE64="[^"]+";/g,source=selectedWideWorkerSource(cap),baseline=wideWorkerSource(cap);
 assert.equal([...source.matchAll(pattern)].length,1);assert.equal(source.replace(pattern,''),baseline.replace(pattern,''));
 const bytes=Buffer.from(JSON.parse([...source.matchAll(/const RUSQSIEVE_BASE64=("[^"]+");/g)][0][1]),'base64'),receipt=cap===64?helper:owner;
 assert.equal(sha(bytes),receipt.sha256);assert.equal(WebAssembly.Module.imports(new WebAssembly.Module(bytes)).length,0);
 assert.ok(!WebAssembly.Module.exports(new WebAssembly.Module(bytes)).some(e=>/oracle|collection/.test(e.name)));
 if(cap===64)assert.deepEqual(resourceMemoryContract(bytes,64),helper.memory);
 new Function(source);
}
execFileSync(process.execPath,['scripts/generate-selected-wide.mjs','--check'],{stdio:'inherit'});
console.log('Two-clean64 source/function identity and exact measured1024, unchanged protocol/resources verified');
