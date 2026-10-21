// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import{createHash}from'node:crypto';
import{execFileSync}from'node:child_process';
import{memoryContract}from'../native/rusqsieve/memory-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const variant of ['baseline','compact']){
 const r=JSON.parse(readFileSync('native/graph-profile/build-'+variant+'.json'));
 assert.equal(r.graphVariant,variant);assert.equal(r.cleanBuilds,2);
 assert.equal(r.upstreamSha256,'86ab9802fbd93690a053dc0630fffe33d1f3f1625d7d6345ec82d74be9d8d11c');
 for(const[p,h]of Object.entries(r.sourceHashes))assert.equal(sha(readFileSync(p)),h,p);
 const {RUSQSIEVE_BASE64}=await import('../src/graph-profile/wasm-'+variant+'.js');
 const bytes=Buffer.from(RUSQSIEVE_BASE64,'base64');assert.equal(bytes.length,r.bytes);assert.equal(sha(bytes),r.sha256);assert.deepEqual(memoryContract(bytes),r.memory);
}
execFileSync(process.execPath,['scripts/generate-graph-profile.mjs','--check'],{stdio:'inherit'});
console.log('Graph source, reproducible build receipts, cap and derived namespace verified');
