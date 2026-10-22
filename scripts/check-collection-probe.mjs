// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
const old=process.env.PRIME_COLLECTION_RED==='1';
const {RUSQSIEVE_BASE64}=await import(old?'../src/long-window/wasm-long-1024.js':'../src/collection-profile/wasm-phase-1024.js');
async function api(clock){return(await WebAssembly.instantiate(Buffer.from(RUSQSIEVE_BASE64,'base64'),{codex_collection:{now_ms:clock}})).instance.exports;}
for(const kind of [0,1]){
 const times=[10,11,13,16],a=await api(()=>times.shift());
 assert.equal(typeof a.codex_collection_probe,'function','Diagnostic scopes must be implemented');
 assert.equal(a.codex_collection_probe(kind),kind===0?1:7);assert.equal(a.codex_collection_status(0),0);assert.equal(a.codex_collection_status(1),0);assert.equal(a.codex_collection_status(2),4);
 assert.deepEqual([a.codex_collection_field(0,0),a.codex_collection_field(0,1),a.codex_collection_field(0,2)],[6,4,1]);
 assert.deepEqual([a.codex_collection_field(1,0),a.codex_collection_field(1,1),a.codex_collection_field(1,2)],[2,2,1]);
}
for(const times of [[10,9],[NaN],[10,Infinity]]){
 const a=await api(()=>times.shift());a.codex_collection_probe(0);assert.ok(a.codex_collection_status(0)>0);
}
{
 let now=0;const a=await api(()=>++now);assert.equal(a.codex_collection_lower_calls(2),1);a.codex_collection_probe(0);assert.equal(a.codex_collection_status(2),2);assert.ok(a.codex_collection_status(0)>0);
 assert.equal(a.codex_collection_lower_calls(2000001),0);
}
console.log('Nested/exclusive, early return, invalid/reversing clock and finite call cap verified');
