import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const r=JSON.parse(await readFile('docs/benchmarks/llm01-staged-ui.json','utf8'));
assert.match(r.measuredHead,/^[a-f0-9]{40}$/);assert.equal(r.mode,'private-ui');assert.equal(r.records.length,1);
const record=r.records[0];assert.equal(record.checks.length,9);assert.ok(record.checks.every(c=>c.pass));
for(const key of ['clipboardRoundtrip','keyboard','mathAccessibleName','mobile320','nativeOverlongRejected'])assert.equal(record[key],true,key);
assert.deepEqual(r.ownership,{live:0,maxLive:1});assert.equal(r.quiet.networkRequests,0);assert.equal(r.quiet.httpRequests,0);
assert.equal(r.quiet.badEvents,0);assert.equal(r.quiet.assetServerStopped,true);assert.equal(r.quiet.cacheDisabled,true);
assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
for(const path of ['app/main.js','src/ui/mount.js','src/ui/page-lifecycle.js','src/ui/session.js','src/ui/result-view.js','scripts/verify-private-ui.mjs'])
 assert.ok(r.sourceFiles[path],path);
for(const[path,hash]of Object.entries(r.sourceFiles))assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),hash,path);
const ui=await readFile('scripts/verify-private-ui.mjs','utf8'),old=await readFile('scripts/benchmark-staged.mjs','utf8');
const csp=text=>text.match(/'Content-Security-Policy': ("[^"\n]+")/)[1];
assert.equal(csp(ui),csp(old),'The existing browser CSP audit policy is unchanged');
console.log('Verified exact private UI receipt, source hashes, native input, copy, keyboard, AX, mobile, ownership and quiet runtime');
