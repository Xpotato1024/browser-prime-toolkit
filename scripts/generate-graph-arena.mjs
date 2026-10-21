// SPDX-License-Identifier: AGPL-3.0-only
import assert from'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';
const read=p=>readFileSync(p,'utf8'),write=(p,s)=>{if(process.argv.includes('--check'))assert.equal(read(p),s,p);else writeFileSync(p,s);};
const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'Packed generator anchor '+a);return s.replace(a,b);};
let h=read('bench/graph-release.js');
h=rep(h,"import {graphReleaseWorkerSource as graphWorkerSource} from '../src/graph-release/worker-source.js';","import {packedWorkerSource as graphWorkerSource} from '../src/graph-arena/worker-source.js';");
h=rep(h,"['baseline','release']","['baseline','packed']");
write('bench/graph-arena.js',h);
write('bench/graph-arena.html',read('bench/graph-release.html').replace('./graph-release.js','./graph-arena.js'));
let a=read('scripts/graph-release-asset-route.mjs');
a=rep(a,'const assets=new Set([','const assets=new Set(["bench/graph-arena.html","bench/graph-arena.js","src/graph-arena/worker-source.js","src/graph-arena/wasm-packed.js",');
a=a.replace('releaseAsset','packedAsset');write('scripts/graph-arena-asset-route.mjs',a);
let v=read('scripts/verify-graph-release.mjs');
v=rep(v,"import {releaseAsset as coordinatorAsset} from './graph-release-asset-route.mjs';","import {packedAsset as coordinatorAsset} from './graph-arena-asset-route.mjs';");
v=rep(v,"['baseline','release']","['baseline','packed']");
v=v.replaceAll('/bench/graph-release.html','/bench/graph-arena.html');
v=rep(v,"receipt.baselineStorage='stage25-compact';","receipt.baselineStorage='stage26-release';receipt.graphProfileSchema=graphVariant==='packed'?2:1;\n  for(const p of ['scripts/verify-graph-arena.mjs','scripts/generate-graph-arena.mjs','scripts/graph-arena-asset-route.mjs','scripts/build-graph-arena.mjs','native/graph-arena/patch-source.mjs','native/graph-arena/packed-relation.rs','native/graph-arena/build-packed.json','src/graph-arena/worker-source.js','docs/contracts/graph-arena.md'])receipt.graphSourceFiles[p]=createHash('sha256').update(await readFile(join(root,p))).digest('hex');");
write('scripts/verify-graph-arena.mjs',v);
console.log('Derived exact packed retention comparison; baseline is immutable Stage26 release artifact');
