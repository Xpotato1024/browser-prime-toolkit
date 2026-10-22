// SPDX-License-Identifier: AGPL-3.0-only
import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
import{memoryContract}from'../native/rusqsieve/memory-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const[space,variant]of [['graph-release','release'],['graph-arena','packed']]){
 const r=JSON.parse(readFileSync('native/'+space+'/build-'+variant+'.json'));assert.equal(r.graphVariant,variant);assert.equal(r.cleanBuilds,2);
 assert.equal(r.upstreamSha256,'86ab9802fbd93690a053dc0630fffe33d1f3f1625d7d6345ec82d74be9d8d11c');
 for(const[p,h]of Object.entries(r.sourceHashes))assert.equal(sha(readFileSync(p)),h,p);
 const{RUSQSIEVE_BASE64}=await import('../src/'+space+'/wasm-'+variant+'.js');const b=Buffer.from(RUSQSIEVE_BASE64,'base64');assert.equal(b.length,r.bytes);assert.equal(sha(b),r.sha256);assert.deepEqual(memoryContract(b),r.memory);
 for(const name of ['codex_graph_profile','codex_graph_columns','codex_graph_phase','codex_graph_roundtrip'])assert.ok(WebAssembly.Module.exports(new WebAssembly.Module(b)).some(e=>e.name===name));
 execFileSync(process.execPath,['scripts/generate-'+space+'.mjs','--check'],{stdio:'inherit'});
}
console.log('Extraction/packed source closure, clean-build receipts, 256MiB cap and derived namespaces verified');
