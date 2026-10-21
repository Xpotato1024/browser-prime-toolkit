// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lpMapWorkerSource} from '../src/lp-map/worker-source.js';
const read=p=>readFileSync(p,'utf8'),write=(p,s)=>{if(process.argv.includes('--check'))assert.equal(read(p),s,p);else writeFileSync(p,s);};
const frozen=JSON.parse(read('native/lp-map/baseline-selected.json'));
const historical=JSON.parse(execFileSync('git',['show',frozen.head+':native/optimized/selected-worker-sources.json'],{encoding:'utf8'}));
for(const cap of [64,128,256]){
 const expected=historical.roles[cap].sourceSha256;
 assert.equal(frozen.roles[cap].sourceSha256,expected,'Historical baseline role SHA');
 assert.equal(createHash('sha256').update(lpMapWorkerSource(cap,'baseline')).digest('hex'),expected,'Exact historical baseline Worker');
}
const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'LP map harness anchor '+a.slice(0,100));return s.replace(a,b);};
let h=read('bench/optimized-entry.js');
h=rep(h,"import {optimizedWorkerSource as graphWorkerSource} from '../src/optimized/worker-source.js';","import {lpMapWorkerSource as graphWorkerSource} from '../src/lp-map/worker-source.js';");
h=rep(h,"['optimized']","['baseline','lpmap']");
write('bench/lp-map.js',h);
write('bench/lp-map.html',read('bench/optimized-entry.html').replace('./optimized-entry.js','./lp-map.js'));
let route=read('scripts/optimized-entry-asset-route.mjs');
route=rep(route,'const assets=new Set([','const assets=new Set(["bench/lp-map.html","bench/lp-map.js","src/lp-map/worker-source.js","src/lp-map/wasm-lpmap-128.js","src/lp-map/wasm-lpmap-256.js","src/graph-varint/wasm-varint-128.js","src/graph-varint/wasm-varint-256.js",');
route=route.replace('entryAsset','lpMapAsset');
write('scripts/lp-map-asset-route.mjs',route);
let v=read('scripts/verify-optimized-entry.mjs');
v=rep(v,"import {entryAsset as coordinatorAsset} from './optimized-entry-asset-route.mjs';","import {lpMapAsset as coordinatorAsset} from './lp-map-asset-route.mjs';");
v=rep(v,"arg('--graph','optimized')","arg('--graph','baseline')");
v=rep(v,"['optimized']","['baseline','lpmap']");
v=v.replaceAll('/bench/optimized-entry.html','/bench/lp-map.html');
v=rep(v,"receipt.baselineStorage='stage25-observed-uncompressed'","receipt.baselineStorage='stage33-varint-pr19'");
v=rep(v,"receipt.graphProfileSchema=graphVariant==='optimized'?2:1","receipt.graphProfileSchema=2");
v=rep(v,'receipt.graphSourceFiles={};','receipt.graphSourceFiles={};\n  for(const p of ["scripts/verify-lp-map.mjs","scripts/generate-lp-map.mjs","scripts/lp-map-asset-route.mjs","src/lp-map/worker-source.js","scripts/build-lp-map.mjs","native/lp-map/patch-source.mjs","native/lp-map/prime-map.rs","native/lp-map/memory-contract.mjs","native/lp-map/build-lpmap-128.json","native/lp-map/build-lpmap-256.json","native/lp-map/baseline-selected.json","docs/contracts/lp-map.md"])receipt.graphSourceFiles[p]=createHash("sha256").update(await readFile(join(root,p))).digest("hex");');
write('scripts/verify-lp-map.mjs',v);
console.log('Derived PR19 baseline/LP map experiment; runtime and original artifacts preserved');
