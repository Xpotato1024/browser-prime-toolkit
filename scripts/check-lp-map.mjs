// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lpMapMemoryContract} from '../native/lp-map/memory-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const cap of [128,256]){
 const receipt=JSON.parse(readFileSync('native/lp-map/build-lpmap-'+cap+'.json'));
 assert.equal(receipt.cleanBuilds,2);assert.equal(receipt.graphVariant,'lpmap-'+cap);
 assert.equal(receipt.commit,'4b150834b57636f6ebc350a81321a15c1cd901d2');
 assert.equal(receipt.upstreamSha256,'86ab9802fbd93690a053dc0630fffe33d1f3f1625d7d6345ec82d74be9d8d11c');
 assert.equal(receipt.image,'sha256:0aabc47a61c105a320b69fecbc2708a2118ec9e54a8b10946998f21bd23423d4');
 for(const[p,h]of Object.entries(receipt.sourceHashes))assert.equal(sha(readFileSync(p)),h,p);
 const {RUSQSIEVE_BASE64}=await import('../src/lp-map/wasm-lpmap-'+cap+'.js');
 const b=Buffer.from(RUSQSIEVE_BASE64,'base64');
 assert.equal(b.length,receipt.bytes);assert.equal(sha(b),receipt.sha256);
 assert.deepEqual(lpMapMemoryContract(b,cap),receipt.memory);
 const {instance}=await WebAssembly.instantiate(b,{});
 assert.equal(instance.exports.codex_lpmap_selftest(),1);
 assert.equal(instance.exports.codex_graph_roundtrip(),1);
}
execFileSync(process.execPath,['scripts/generate-lp-map.mjs','--check'],{stdio:'inherit'});
console.log('LP map pins, two-clean receipts, role hardcaps, boundary/cycle probes and derived harness verified');
