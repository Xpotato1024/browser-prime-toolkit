// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
export const DLP_DATA_DIR='docs/benchmarks/staged-dlp-stage18';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function trialArguments(t,root){return['scripts/verify-dlp.mjs','--case','RSA-100','--engine',t.workers===2?'two-drop':'one-drop','--profile',t.profile,'--budget-ms',String(t.budgetMs),'--out',join(root,DLP_DATA_DIR,t.id+'.json')];}
export function assertLongStart(short,plan,planHash,head,state,read,root){
 assert.equal(state.changedTracked.trim(),'','Tracked source/staged changes before long series');
 const allowed=[DLP_DATA_DIR+'/short-run.json',...plan.trials.flatMap(t=>[DLP_DATA_DIR+'/'+t.id+'.json',DLP_DATA_DIR+'/'+t.id+'.log'])].sort();
 assert.deepEqual([...state.untracked].sort(),allowed,'Only complete fixed short raw/logs may be untracked');
 assert.equal(short.stage,'short');assert.equal(short.plan,plan.id);assert.equal(short.planSha256,planHash);assert.equal(short.measuredHead,head);assert.ok(short.completedAt);
 assert.equal(short.trials.length,12);assert.equal(new Set(short.trials.map(t=>t.id)).size,12);
 for(const t of plan.trials){
  const saved=short.trials.find(r=>r.id===t.id);assert.ok(saved);
  for(const k of ['profile','workers','repeat','budgetMs'])assert.equal(saved[k],t[k],k);
  assert.equal(saved.exitCode,0);assert.equal(saved.signal,null);assert.equal(saved.error,null);assert.deepEqual(saved.args,trialArguments(t,root));
  const raw=read(DLP_DATA_DIR+'/'+t.id+'.json'),log=read(DLP_DATA_DIR+'/'+t.id+'.log');
  assert.equal(sha(raw),saved.rawSha256,'Short raw changed');assert.equal(sha(log),saved.logSha256,'Short log changed');
  const r=JSON.parse(raw);assert.equal(r.measuredHead,head);assert.equal(r.mode,'dlp-measurement');assert.equal(r.profile,t.profile);assert.equal(r.variant,t.workers===2?'two-drop':'one-drop');assert.equal(r.caseId,'RSA-100');assert.equal(r.seed,1);assert.equal(r.budgetMs,t.budgetMs);
  assert.ok(r.sourceFiles&&Object.keys(r.sourceFiles).length);
  for(const[p,h]of Object.entries(r.sourceFiles)){assert.ok(/^[A-Za-z0-9_./-]+$/.test(p)&&!p.startsWith('/')&&!p.includes('..'),'Relative source path');assert.equal(sha(read(p)),h,'Short source changed: '+p);}
 }
}
