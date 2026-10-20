// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {screenDecision,longDecision} from '../scripts/dlp-decision.mjs';
const RSA100=JSON.parse(readFileSync(new URL('../bench/staged-rsa/catalog.json',import.meta.url))).find(c=>c.id==='RSA-100').input;
const plan=JSON.parse(readFileSync(new URL('../bench/staged-dlp-plan.json',import.meta.url)));
function row(t,yieldCount=100){
 const c={version:1,profile:t.profile,bits:330,factorBaseBound:3250000,intervalHalfWidth:524288,singleLimit:'471250000',doubleLimit:(3250000n**2n*BigInt({baseline:1035,half:512,quarter:256}[t.profile])).toString(),lpBits:{baseline:54,half:53,quarter:52}[t.profile],thresholdAdjustment:-23,factorBaseSize:116448};
 const last={linearBytes:1114112,liveRequested:0,peakRequested:0,allocationFailures:0,lastFailed:0},timings={prepareMs:1,sieveMs:10,copyFreeMs:0,framingMs:0,submitMs:0,observeMs:0,extractMs:0};
 const collectorStats={full:yieldCount,cycles:0,slp:1000,dlp:0,vertices:1000,treeEdges:900,usable:yieldCount,ingested:yieldCount+1000};
 return{...t,outcome:{input:RSA100,profile:t.profile,configuration:c,kind:'timeout',reason:'time-budget',workers:t.workers,requestWallMs:t.budgetMs+1,peakOwners:t.workers,allWorkersDisposed:true,allWorkerSourcesReleased:true,retirementErrors:[],maximumWasmBytes:t.workers*268435456,peakTransportBytes:1000,target:116512,factorBaseSize:116448,relations:yieldCount,rawRelationsSubmitted:yieldCount+1000,collectorStats,memoryByOwner:Array.from({length:t.workers},()=>({last,peakLinearBytes:1114112,peakRequestedBytes:0})),wrapperTimingByOwner:Array.from({length:t.workers},()=>({timings}))}};
}
const rows=(half=130,quarter=150)=>plan.trials.map(t=>row(t,{baseline:100,half,quarter}[t.profile]));
test('screen requires both paired two-worker gains and preserves the one-worker floor',()=>{
 assert.equal(screenDecision(rows(),plan).candidate,'quarter');
 const r=rows(130,110);r.find(r=>r.profile==='half'&&r.workers===1).outcome=row(r.find(r=>r.profile==='half'&&r.workers===1),85).outcome;
 assert.equal(screenDecision(r,plan).candidate,null);
 assert.equal(screenDecision(rows(130,130),plan).candidate,'half');
});
test('missing trials, duplicate IDs, zero baseline and failed guarantees cannot select',()=>{
 const r=rows();assert.equal(screenDecision(r.slice(1),plan).candidate,null);
 const dup=rows();dup[0]=dup[1];assert.equal(screenDecision(dup,plan).candidate,null);
 const zero=rows();const i=zero.findIndex(r=>r.profile==='baseline');zero[i]=row(zero[i],0);assert.equal(screenDecision(zero,plan).reason,'zero-baseline-yield');
 const fail=rows();fail[0].outcome.memoryByOwner[0].last={...fail[0].outcome.memoryByOwner[0].last,allocationFailures:1};assert.equal(screenDecision(fail,plan).candidate,null);
});
test('long ABBA needs both candidate yields above the maximum baseline by the fixed margin',()=>{
 const profiles=['baseline','quarter','quarter','baseline'],ys=[200,260,270,220];
 const r=profiles.map((profile,i)=>row({profile,workers:2,budgetMs:600000},ys[i]));
 assert.equal(longDecision(r,'quarter',plan).adopted,true);
 r[1]=row({profile:'quarter',workers:2,budgetMs:600000},251);
 assert.equal(longDecision(r,'quarter',plan).adopted,false);
 assert.equal(longDecision(r.slice(1),'quarter',plan).adopted,false);
});
