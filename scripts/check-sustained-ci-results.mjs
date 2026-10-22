// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{join}from'node:path';import{sameFamilies}from'./scheduler-packets.mjs';import{validateStreamRecord}from'./sustained-proof.mjs';
assert.equal(process.argv.length,3);const dir=process.argv[2],read=p=>JSON.parse(readFileSync(p)),rows=[];
for(const [id,coordinator,workers]of [['combined2','combined',2],['combined4','combined',4],['dedicated4','dedicated',4]]){
 const r=read(join(dir,'sustained-fixed-'+id+'.json'));assert.equal(r.coordinator,coordinator);assert.equal(r.caseId,'RSA-100');assert.equal(r.fixedFamilies,4);assert.equal(r.ownership.live,0);assert.equal(r.ownership.liveSources,0);assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
 assert.equal(r.records.length,1);const record=r.records[0];validateStreamRecord(record);assert.equal(record.id,'RSA-100');assert.equal(record.knownFactorsUsed,false);assert.equal(record.outcome.workers,workers);assert.equal(record.outcome.coordinatorCompute,coordinator==='combined');assert.equal(record.outcome.maximumWasmBytes,(256+64*(workers-1))*1048576);rows.push(record);
}
rows.push(read('docs/benchmarks/staged-resources-stage21/fixed-w4.json').records[0]);console.log('CI fixed families match immutable pre-stream raw hashes, counters and accepted prefixes:',sameFamilies(rows,{fixed:true}));
