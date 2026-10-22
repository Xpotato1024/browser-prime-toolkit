import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {verifyLongReceipt} from './long-receipt.mjs';
import {longAsset} from './long-asset-route.mjs';
const current=await readFile('scripts/verify-long-rsa.mjs','utf8'),old=await readFile('scripts/benchmark-staged.mjs','utf8');
const csp=text=>text.match(/'Content-Security-Policy': ("[^"\n]+")/)[1];assert.equal(csp(current),csp(old));
const r=JSON.parse(await readFile('docs/benchmarks/llm01-staged-long-contract.json','utf8'));await verifyLongReceipt(r);
assert.equal(r.initialAssets.length,14);
for(const asset of r.initialAssets)assert.equal(longAsset(asset.path),asset.path.slice(1));
assert.deepEqual(r.assetBoundarySelfTest,[
 {path:'/bench/staged-practical/%6fracle.json',status:404},{path:'/bench/staged-practical/%256fracle.json',status:404},
 {path:'/bench/staged-practical/%6danifest.json',status:404},{path:'/src/%2e%2e/bench/staged-practical/oracle.json',status:404}
]);
console.log('Verified unchanged CSP, explicit runtime assets and actual encoded-path HTTP denial controls');
