// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {compileInContainer} from './container-compile.mjs';
import {patchSource} from '../native/rusqsieve-dlp/patch-source.mjs';
import {resourceMemoryContract} from '../native/resources/memory-contract.mjs';
const cap=Number(process.argv[2]);if(![64,128].includes(cap)||process.argv.length!==3)throw Error('Usage: build-resource-wasm.mjs 64|128');
const memoryContract=b=>resourceMemoryContract(b,cap);
const root=resolve(import.meta.dirname,'..'),source=process.env.PRIME_RUS_SOURCE_DIR;
if(!source||resolve(source).startsWith(root))throw Error('Source cache must be outside repository');
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(join(root,p));
const upstream=JSON.parse(read('native/rusqsieve/staged-upstream.json')),files={};
assert.equal(upstream.sha256,'86ab9802fbd93690a053dc0630fffe33d1f3f1625d7d6345ec82d74be9d8d11c');
for(const[p,h]of Object.entries(upstream.files)){const b=readFileSync(join(source,p));assert.equal(sha(b),h,'Upstream '+p);if(p.startsWith('src/')||p==='README.md')files['src/'+p]=b;}
patchSource(files,read('native/rusqsieve/codex_observer.rs'));
const image='sha256:0aabc47a61c105a320b69fecbc2708a2118ec9e54a8b10946998f21bd23423d4';
const args=['/opt/rust/bin/rustc','--crate-name','rusqsieve','--crate-type','cdylib','--edition=2024','--target','wasm32-unknown-unknown','--cfg','feature="wasm-simd128"','-Copt-level=3','-Clto=fat','-Ccodegen-units=1','-Cpanic=abort','-Ctarget-feature=+simd128','-Clink-arg=--max-memory='+String(cap*1048576),'-Clink-arg=--strip-all','/src/src/lib.rs','-o','/build/rusqsieve.wasm'];
const builds=[];
for(let i=0;i<2;i++){const b=compileInContainer(image,files,args,'cat /build/rusqsieve.wasm',300000,'candidate');memoryContract(b);builds.push(b);console.log('Clean',i+1,b.length,sha(b));}
assert.ok(builds[0].equals(builds[1]),'Clean build reproducibility');
const binary=builds[0],memory=memoryContract(binary),sourceHashes={};
for(const p of ['scripts/build-resource-wasm.mjs','scripts/container-compile.mjs','native/rusqsieve/staged-upstream.json','native/rusqsieve-dlp/patch-source.mjs','native/rusqsieve/patch-source.mjs','native/rusqsieve/codex_observer.rs','native/resources/memory-contract.mjs','native/rusqsieve/RustDockerfile','native/rusqsieve/staged-toolchain.json'])sourceHashes[p]=sha(read(p));
const receipt={version:'0.5.0',commit:'4b150834b57636f6ebc350a81321a15c1cd901d2',upstreamSha256:upstream.sha256,image,compiler:'rustc 1.90.0 (1159e78c4 2025-09-14)',target:'wasm32-unknown-unknown',simd:true,cleanBuilds:2,bytes:binary.length,sha256:sha(binary),memory,args,sourceHashes,compiledSources:Object.fromEntries(Object.entries(files).map(([p,b])=>[p,sha(b)])),license:'Apache-2.0 OR MPL-2.0; original observer/adapter AGPL-3.0-only',method:'direct rustc; no-default-feature equivalent for cfg-gated native-only dependencies; no cargo dependency resolution'};
receipt.resourceMemoryMiB=cap;
receipt.dlpProfiles={version:1,baseline:1035,half:512,quarter:256,scope:'321..333 bits; fixed upstream defaults otherwise; native lp_bits coupling, offset unchanged'};
mkdirSync(join(root,'native/resources'),{recursive:true});mkdirSync(join(root,'src/resources'),{recursive:true});
const outputs={['native/resources/build-'+cap+'.json']:JSON.stringify(receipt,null,2)+'\n',['src/resources/wasm-'+cap+'.js']:'// Original upstream: Apache-2.0 OR MPL-2.0. Local observer: AGPL-3.0-only; Xpotato.net / Xpotato1024. See native/rusqsieve notices.\nexport const RUSQSIEVE_BASE64='+JSON.stringify(binary.toString('base64'))+';\n'};
for(const[p,value]of Object.entries(outputs)){if(process.argv.includes('--check'))assert.equal(read(p).toString(),value);else writeFileSync(join(root,p),value);}
