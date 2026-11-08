// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const originals=Object.freeze({'bench/siqs-lab.js':'78d68aad37412d03ddea03ff63f81e09dc3fec4e09882b191ca188621c3e9b37','scripts/verify-siqs-lab.mjs':'58098e16a1155cd44085c1c21922669fe2ee5c0a2c9a9a23d020c3037aa4fa70','scripts/siqs-lab-asset-route.mjs':'ba3fbb5493661db9b5ff75ac136ade00a7fdff2875f81877f1da0f335b1cfe96'});
const replace=(source,from,to)=>{assert.equal(source.split(from).length,2,'Unique SIQS CI anchor '+from.slice(0,70));return source.replace(from,to);};
export function deriveSiqsLabCi(inputs){
 for(const[path,hash]of Object.entries(originals))assert.equal(createHash('sha256').update(inputs[path]).digest('hex'),hash,'Historical source must remain byte-fixed: '+path);
 let harness=inputs['bench/siqs-lab.js'],driver=inputs['scripts/verify-siqs-lab.mjs'];
 harness=replace(harness,"import {LAB_WORKER_SOURCE}","import {runDeadlineProbe} from './lab-deadline-probe.js';\nimport {LAB_WORKER_SOURCE}");
 harness=replace(harness,"  const r=await withRun(rsa100,{timeBudgetMs:1000},{createWorker:()=>track(makeWorkerFromSource(source))});\n  assert(r.kind==='incomplete'&&r.hostStops.some(x=>x.reason==='host-phase-deadline'&&x.posted)&&r.allWorkersDisposed&&r.elapsedMs<1300,'Independent termination');","  const detail=await runDeadlineProbe({input:rsa100,createWorker:()=>track(makeWorkerFromSource(source))});\n  detail.liveWorkers=live;diagnostics.push({hostDeadline:detail});\n  assert(detail.passed&&live===0,'Independent termination: '+JSON.stringify(detail));");
 driver=replace(driver,"from './siqs-lab-asset-route.mjs';","from './siqs-lab-ci-asset-route.mjs';");
 driver=replace(driver,"let contractPassed=true;","assert.equal(caseId,null,'CI adapter is not a performance-measurement entry');\nlet contractPassed=true;");
 driver=replace(driver,"/bench/siqs-lab.html","/bench/siqs-lab-ci.html");
 driver=replace(driver,"console.log(JSON.stringify(checks.tests));records.push(checks);","console.log(JSON.stringify(checks.tests));console.log('SIQS_LAB_DEADLINE '+JSON.stringify(checks.diagnostics.filter(x=>x.hostDeadline)));records.push(checks);");
 driver=replace(driver,"  assert.ok(requests.length > 3,","  console.log('SIQS_LAB_ENV '+JSON.stringify({browser,browserDevice,host:{platform:platform(),release:release(),cpu:cpus()[0]?.model,logicalCpus:cpus().length,memoryBytes:totalmem()}}));\n  assert.ok(requests.length > 3,");
 driver=replace(driver,"['scripts/verify-siqs-lab.mjs',","['scripts/verify-siqs-lab-ci.mjs','scripts/generate-siqs-lab-ci.mjs','scripts/siqs-lab-ci-asset-route.mjs','scripts/verify-siqs-lab.mjs',");
 driver=replace(driver,"const receipt={mode,","const receipt={ciHarness:{source:'scripts/verify-siqs-lab-ci.mjs',historicalDriverSha256:'58098e16a1155cd44085c1c21922669fe2ee5c0a2c9a9a23d020c3037aa4fa70',historicalHarnessSha256:'78d68aad37412d03ddea03ff63f81e09dc3fec4e09882b191ca188621c3e9b37',separateReadinessLimitMs:5000},mode,");
 return {'bench/siqs-lab-ci.js':'// Generated CI-only harness; original measurement harness remains frozen.\n'+harness,'scripts/verify-siqs-lab-ci.mjs':'// Generated CI-only driver; original comparison receipts remain frozen.\n'+driver,'scripts/siqs-lab-ci-asset-route.mjs':"// Generated CI-only route; original asset boundary remains frozen.\nimport {labAsset as original} from './siqs-lab-asset-route.mjs';\nconst extras=new Set(['bench/siqs-lab-ci.html','bench/siqs-lab-ci.js','bench/lab-deadline-probe.js']);\nexport function labAsset(path){try{const key=decodeURIComponent(path).slice(1);return extras.has(key)?key:original(path);}catch{return null;}}\n",'bench/siqs-lab-ci.html':"<!doctype html>\n<meta charset=\"utf-8\">\n<title>Private SIQS CI contracts</title>\n<script type=\"module\" src=\"./siqs-lab-ci.js\"></script>\n"};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const outputs=deriveSiqsLabCi(Object.fromEntries(Object.keys(originals).map(p=>[p,readFileSync(p,'utf8')])));
 for(const[path,expected]of Object.entries(outputs)){if(process.argv.includes('--check'))assert.equal(readFileSync(path,'utf8'),expected,'Stale CI adapter '+path);else writeFileSync(path,expected);}
 console.log('SIQS CI adapter verified; original bytes and computation deadlines unchanged');
}
