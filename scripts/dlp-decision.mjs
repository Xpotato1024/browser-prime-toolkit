// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import {validateDlpConfiguration,validateDlpStats,validateDlpTimings} from '../src/rusqsieve-dlp/contracts.js';
import {readFileSync} from 'node:fs';
const RSA100=JSON.parse(readFileSync(new URL('../bench/staged-rsa/catalog.json',import.meta.url))).find(c=>c.id==='RSA-100').input;
import {validateMemory} from '../src/rusqsieve/contracts.js';
export function eligible(row){
 try{
  const o=row.outcome;if(!o||o.input!==RSA100||o.workers!==row.workers||o.profile!==row.profile||o.retirementErrors.length||!o.allWorkersDisposed||!o.allWorkerSourcesReleased||o.peakOwners>row.workers||o.maximumWasmBytes!==row.workers*268435456||o.peakTransportBytes>33554432)return false;
  validateDlpConfiguration(o.configuration,row.profile,330);if(o.target!==116512||o.factorBaseSize!==116448)return false;
  validateDlpStats(o.collectorStats,null,o.rawRelationsSubmitted,o.relations);
  if(o.memoryByOwner.length!==row.workers||o.wrapperTimingByOwner.length!==row.workers)return false;
  for(const m of o.memoryByOwner){validateMemory(m.last);if(!Number.isSafeInteger(m.peakLinearBytes)||!Number.isSafeInteger(m.peakRequestedBytes)||m.peakLinearBytes<m.last.linearBytes||m.peakRequestedBytes<m.last.peakRequested||m.last.allocationFailures||m.peakLinearBytes>268435456||m.peakRequestedBytes>m.peakLinearBytes)return false;}
  for(const t of o.wrapperTimingByOwner)validateDlpTimings(t.timings);
  if(o.kind==='timeout')return o.reason==='time-budget'&&o.requestWallMs>=row.budgetMs&&o.requestWallMs<=row.budgetMs+1000;
  if(!['probable','factorized'].includes(o.kind)||o.remaining!=='1'||o.factors.length!==2||o.requestWallMs>=row.budgetMs)return false;
  let product=1n;for(const f of o.factors){const n=BigInt(f.value);if(n<=1n)return false;product*=n;}return product===BigInt(o.input);
 }catch{return false;}
}
export function screenDecision(rows,plan){
 const none=reason=>({candidate:null,reason,requiredLongTrials:0,profiles:[]});
 if(rows.length!==12||new Set(rows.map(r=>r.id)).size!==12)return none('missing-or-duplicate-trial');
 for(const t of plan.trials){const r=rows.find(r=>r.id===t.id);if(!r||['profile','workers','repeat','budgetMs'].some(k=>r[k]!==t[k])||!eligible(r))return none('ineligible-trial');}
 const get=(p,w,r)=>rows.find(t=>t.profile===p&&t.workers===w&&t.repeat===r).outcome.relations;
 if([1,2].some(w=>[1,2].some(r=>get('baseline',w,r)===0)))return none('zero-baseline-yield');
 const profiles=['half','quarter'].map(profile=>{
  const one=[1,2].map(r=>get(profile,1,r)/get('baseline',1,r)),two=[1,2].map(r=>get(profile,2,r)/get('baseline',2,r));
  return{profile,oneRatios:one,twoRatios:two,score:Math.min(...two),qualifies:one.every(x=>x>=plan.gate.shortOneWorkerEachMinimumRatio)&&two.every(x=>x>=plan.gate.shortTwoWorkerEachRatio)};
 });
 const ranked=profiles.filter(p=>p.qualifies).sort((a,b)=>b.score-a.score||['half','quarter'].indexOf(a.profile)-['half','quarter'].indexOf(b.profile));
 return{candidate:ranked[0]?.profile??null,reason:ranked.length?'predefined-short-gate':'no-reproducible-short-improvement',requiredLongTrials:ranked.length?4:0,profiles};
}
export function longDecision(rows,candidate,plan){
 if(!candidate)return{adopted:false,reason:'no-short-candidate'};
 const order=['baseline',candidate,candidate,'baseline'];
 if(rows.length!==4||rows.some((r,i)=>r.profile!==order[i]||r.workers!==2||r.budgetMs!==600000||!eligible(r)))return{adopted:false,reason:'invalid-long-series'};
 const baselineMax=Math.max(rows[0].outcome.relations,rows[3].outcome.relations),candidateYields=[rows[1].outcome.relations,rows[2].outcome.relations];
 if(!baselineMax)return{adopted:false,reason:'zero-long-baseline'};
 const adopted=candidateYields.every(n=>n/baselineMax>=plan.gate.longCandidateEachVsBaselineMaxRatio);
 return{adopted,reason:adopted?'predefined-long-gate':'long-improvement-not-reproduced',baselineMax,candidateYields,candidate};
}
