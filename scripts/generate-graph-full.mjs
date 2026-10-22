// SPDX-License-Identifier: AGPL-3.0-only
import assert from'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';
const read=p=>readFileSync(p,'utf8'),write=(p,s)=>{if(process.argv.includes('--check'))assert.equal(read(p),s,p);else writeFileSync(p,s);};
const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'Full-control anchor '+a);return s.replace(a,b);};
let h=read('bench/graph-release.js');
h=rep(h,"import {graphReleaseWorkerSource as graphWorkerSource} from '../src/graph-release/worker-source.js';","import {fullWorkerSource as graphWorkerSource} from '../src/graph-full/worker-source.js';");
write('bench/graph-full.js',h);write('bench/graph-full.html',read('bench/graph-release.html').replace('./graph-release.js','./graph-full.js'));
let a=read('scripts/graph-release-asset-route.mjs');a=rep(a,'const assets=new Set([','const assets=new Set(["bench/graph-full.html","bench/graph-full.js","src/graph-full/worker-source.js",');a=a.replace('releaseAsset','fullAsset');write('scripts/graph-full-asset-route.mjs',a);
let v=read('scripts/verify-graph-release.mjs');
v=rep(v,"import {releaseAsset as coordinatorAsset} from './graph-release-asset-route.mjs';","import {fullAsset as coordinatorAsset} from './graph-full-asset-route.mjs';");
v=rep(v,"variant=arg('--engine','four-drop')","variant=arg('--engine','one-drop')");
v=rep(v,"assert.ok(['one-drop','two-drop','three-drop','four-drop'].includes(variant));","assert.equal(variant,'one-drop','Final-prefix control uses exactly one owner');");
v=v.replaceAll('/bench/graph-release.html','/bench/graph-full.html');
v=rep(v,"receipt.baselineStorage='stage25-compact';","receipt.baselineStorage='stage25-compact';receipt.exactFinalPrefixControl=true;\n  for(const p of ['scripts/verify-graph-full.mjs','scripts/generate-graph-full.mjs','scripts/graph-full-asset-route.mjs','src/graph-full/worker-source.js','docs/contracts/graph-full-control.md'])receipt.graphSourceFiles[p]=createHash('sha256').update(await readFile(join(root,p))).digest('hex');");
write('scripts/verify-graph-full.mjs',v);console.log('Derived single-owner exact final-column comparison');
