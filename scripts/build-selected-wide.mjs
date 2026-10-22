// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {compileInContainer} from './container-compile.mjs';
import {patchSource} from '../native/selected-wide/patch-source.mjs';
import {patchSource as measuredPatch} from '../native/resieve-followup/patch-source.mjs';
import {functionSource} from '../native/collection-hotpath/patch-source.mjs';
import{resourceMemoryContract}from'../native/resources/memory-contract.mjs';
const cap=64;const memoryContract=b=>resourceMemoryContract(b,cap);
const variant='selected-'+cap;
const root=resolve(import.meta.dirname,'..'),source=process.env.PRIME_RUS_SOURCE_DIR;
if(!source||resolve(source).startsWith(root))throw Error('Source cache must be outside repository');
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(join(root,p));
const upstream=JSON.parse(read('native/rusqsieve/staged-upstream.json')),files={};
assert.equal(upstream.sha256,'86ab9802fbd93690a053dc0630fffe33d1f3f1625d7d6345ec82d74be9d8d11c');
for(const[p,h]of Object.entries(upstream.files)){const b=readFileSync(join(source,p));assert.equal(sha(b),h,'Upstream '+p);if(p.startsWith('src/')||p==='README.md')files['src/'+p]=b;}
patchSource(files,read('native/rusqsieve/codex_observer.rs'),{compact:true,packedRelation:read('native/graph-arena/packed-relation.rs').toString(),sessionStop:read('native/graph-release/session-stop.rs').toString(),engineProfile:read('native/graph-profile/engine-profile.rs').toString(),compactRoot:read('native/graph-profile/compact-root.rs').toString(),phase:read('native/graph-profile/phase.rs').toString()});
const baseline=JSON.parse(read('native/graph-builtin/build-builtin-64.json'));
assert.deepEqual(Object.keys(files).filter(p=>sha(files[p])!==baseline.compiledSources[p]),['src/src/engine.rs']);
// Reconstruct the fixed measured owner without compiling it, then compare the selected function exactly.
const ownerFiles={};
for(const[p,h]of Object.entries(upstream.files)){if(p.startsWith('src/')||p==='README.md')ownerFiles['src/'+p]=readFileSync(join(source,p));}
measuredPatch(ownerFiles,read('native/rusqsieve/codex_observer.rs'),{hotpath:'resieve1',compact:true,quota:read('native/long-window/quota.rs').toString().replace('__LIVE_LIMIT__',String(1024*655360)).replace('__LINEAR_LIMIT__',String(1024*851968)),lpMap:read('native/lp-map/prime-map.rs').toString(),varintRelation:read('native/graph-varint/retained-relation.rs').toString(),packedRelation:read('native/graph-arena/packed-relation.rs').toString(),sessionStop:read('native/graph-release/session-stop.rs').toString(),engineProfile:read('native/graph-profile/engine-profile.rs').toString(),compactRoot:read('native/graph-profile/compact-root.rs').toString(),phase:read('native/graph-profile/phase.rs').toString()});
const owner=JSON.parse(read('native/resieve-followup/build-resieve1-1024.json'));
assert.deepEqual(Object.fromEntries(Object.entries(ownerFiles).map(([p,b])=>[p,sha(b)])),owner.compiledSources);
const selectedFunction=functionSource(files['src/src/engine.rs'].toString(),'resieve_candidate_factors');
assert.equal(selectedFunction,functionSource(ownerFiles['src/src/engine.rs'].toString(),'resieve_candidate_factors'));
const image='sha256:0aabc47a61c105a320b69fecbc2708a2118ec9e54a8b10946998f21bd23423d4';
const args=['/opt/rust/bin/rustc','--crate-name','rusqsieve','--crate-type','cdylib','--edition=2024','--target','wasm32-unknown-unknown','--cfg','feature="wasm-simd128"','-Copt-level=3','-Clto=fat','-Ccodegen-units=1','-Cpanic=abort','-Ctarget-feature=+simd128','-Clink-arg=--max-memory='+String(cap*1048576),'-Clink-arg=--strip-all','/src/src/lib.rs','-o','/build/rusqsieve.wasm'];
const builds=[];
for(let i=0;i<2;i++){const b=compileInContainer(image,files,args,'cat /build/rusqsieve.wasm',300000,'candidate');memoryContract(b);builds.push(b);console.log('Clean',i+1,b.length,sha(b));}
assert.ok(builds[0].equals(builds[1]),'Clean build reproducibility');
const binary=builds[0],memory=memoryContract(binary),sourceHashes={};
for(const p of ['scripts/build-selected-wide.mjs','native/selected-wide/patch-source.mjs','docs/contracts/selected-wide.md','scripts/build-graph-builtin.mjs','native/graph-builtin/patch-source.mjs','native/resources/memory-contract.mjs','native/graph-arena/patch-source.mjs','native/graph-arena/packed-relation.rs','native/graph-release/patch-source.mjs','native/graph-release/session-stop.rs','native/graph-profile/patch-source.mjs','native/graph-profile/engine-profile.rs','native/graph-profile/compact-root.rs','native/graph-profile/phase.rs','scripts/container-compile.mjs','native/rusqsieve/staged-upstream.json','native/rusqsieve-dlp/patch-source.mjs','native/rusqsieve/patch-source.mjs','native/rusqsieve/codex_observer.rs','native/rusqsieve/memory-contract.mjs','native/rusqsieve/RustDockerfile','native/rusqsieve/staged-toolchain.json'])sourceHashes[p]=sha(read(p));
const receipt={version:'0.5.0',commit:'4b150834b57636f6ebc350a81321a15c1cd901d2',upstreamSha256:upstream.sha256,image,compiler:'rustc 1.90.0 (1159e78c4 2025-09-14)',target:'wasm32-unknown-unknown',simd:true,cleanBuilds:2,bytes:binary.length,sha256:sha(binary),memory,args,sourceHashes,compiledSources:Object.fromEntries(Object.entries(files).map(([p,b])=>[p,sha(b)])),license:'Apache-2.0 OR MPL-2.0; original observer/adapter AGPL-3.0-only',method:'direct rustc; no-default-feature equivalent for cfg-gated native-only dependencies; no cargo dependency resolution'};
receipt.dlpProfiles={version:1,baseline:1035,half:512,quarter:256,scope:'321..333 bits; fixed upstream defaults otherwise; native lp_bits coupling, offset unchanged'};
receipt.graphVariant=variant;receipt.resieveFunctionSha256=sha(selectedFunction);receipt.ownerEngineSha256=owner.compiledSources['src/src/engine.rs'];
for(const path of ['scripts/build-resieve-followup.mjs','native/resieve-followup/patch-source.mjs','native/collection-hotpath/patch-source.mjs','native/long-window/patch-source.mjs','native/long-window/quota.rs','native/lp-map/patch-source.mjs','native/lp-map/prime-map.rs','native/graph-varint/patch-source.mjs','native/graph-varint/retained-relation.rs','native/resieve-followup/build-resieve1-1024.json'])receipt.sourceHashes[path]=sha(read(path));
const outputs={['native/selected-wide/build-'+variant+'.json']:JSON.stringify(receipt,null,2)+'\n',['src/selected-wide/wasm-'+variant+'.js']:'// Original upstream: Apache-2.0 OR MPL-2.0. Local observer: AGPL-3.0-only; Xpotato.net / Xpotato1024. See native/rusqsieve notices.\nexport const RUSQSIEVE_BASE64='+JSON.stringify(binary.toString('base64'))+';\n'};
for(const[p,value]of Object.entries(outputs)){if(process.argv.includes('--check'))assert.equal(read(p).toString(),value);else writeFileSync(join(root,p),value);}
