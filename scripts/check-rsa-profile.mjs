import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await import('./check-rsa-catalog.mjs');
const r=JSON.parse(await readFile('docs/benchmarks/llm01-staged-rsa-contract.json','utf8'));
assert.match(r.measuredHead,/^[a-f0-9]{40}$/);assert.equal(r.mode,'rsa-contracts');assert.equal(r.budgetMs,30000);
assert.equal(r.records.length,1);const c=r.records[0];assert.equal(c.tests.length,8);assert.ok(c.tests.every(t=>t.pass));
assert.equal(c.acceleratedClockIsPerformanceMeasurement,false);assert.deepEqual(r.ownership,{live:0,maxLive:1});
assert.equal(r.limits.operationBudget,50000000);assert.equal(r.quiet.networkRequests,0);assert.equal(r.quiet.httpRequests,0);
assert.equal(r.quiet.badEvents,0);assert.equal(r.quiet.assetServerStopped,true);assert.equal(r.quiet.cacheDisabled,true);
assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
for(const path of ['bench/rsa-profile.js','src/rsa/evaluator.js','src/rsa/factory.js','src/rsa/worker-source.js','scripts/verify-rsa-profile.mjs','bench/staged-rsa/catalog.json','bench/staged-rsa/provenance.json'])
 assert.ok(r.sourceFiles[path],path);
for(const[path,hash]of Object.entries(r.sourceFiles))assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),hash,path);
const current=await readFile('scripts/verify-rsa-profile.mjs','utf8'),old=await readFile('scripts/benchmark-staged.mjs','utf8');
const csp=text=>text.match(/'Content-Security-Policy': ("[^"\n]+")/)[1];assert.equal(csp(current),csp(old));
console.log('Verified RSA contracts receipt, exact source hashes, offline positive controls and isolated Worker ownership');
