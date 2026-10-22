// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import test from 'node:test';import assert from 'node:assert/strict';
import {schedulerDecision} from '../scripts/scheduler-decision.mjs';
const rows=()=>['batch2','batch1','credit1'].flatMap(scheduler=>[1,2].flatMap(workers=>[1,2].map(repeat=>({scheduler,workers,repeat,outcome:{kind:'timeout',reason:'time-budget',allWorkersDisposed:true,allWorkerSourcesReleased:true,relations:100,ownerActivity:{owners:[{states:{blockedIdleMs:20}}]}}}))));
test('paired exact gate requires both repeats and both owner counts; deterministic ties favor batch1',()=>{
 const x=rows();for(const r of x)if(r.scheduler!=='batch2'&&r.workers===2)r.outcome.relations=110;
 assert.equal(schedulerDecision(x).candidate,'batch1');
 x.find(r=>r.scheduler==='batch1'&&r.workers===2&&r.repeat===2).outcome.relations=109;
 assert.equal(schedulerDecision(x).candidate,'credit1');
 x.find(r=>r.scheduler==='credit1'&&r.workers===1).outcome.relations=89;
 assert.equal(schedulerDecision(x).candidate,null);
});
test('abnormal baseline, excess blocked time, duplicate trial and incomplete retirement fail closed',()=>{
 for(const alter of [x=>x[0].outcome.relations=0,x=>x[0].outcome.reason='worker-error',x=>x[0].outcome.allWorkersDisposed=false,x=>x.push(x[0])]){const x=rows();alter(x);assert.throws(()=>schedulerDecision(x));}
 const x=rows();for(const r of x)if(r.scheduler!=='batch2'&&r.workers===2){r.outcome.relations=200;r.outcome.ownerActivity.owners[0].states.blockedIdleMs=121;}assert.equal(schedulerDecision(x).candidate,null);
});
