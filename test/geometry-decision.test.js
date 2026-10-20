// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import test from 'node:test';import assert from 'node:assert/strict';
import {geometryDecision} from '../scripts/geometry-decision.mjs';
const names=['b325-m524','b250-m524','b325-m262','b250-m262'];
const rows=()=>names.flatMap(profile=>[1,2].map(repeat=>({profile,repeat,outcome:{kind:'timeout',reason:'time-budget',allWorkersDisposed:true,allWorkerSourcesReleased:true,relations:100,target:1000}})));
test('normalized target ratio and both repetitions determine the unique candidate',()=>{
 const x=rows();for(const r of x)if(r.profile==='b250-m524')r.outcome.target=800;
 assert.equal(geometryDecision(x).candidate,'b250-m524');
 x.find(r=>r.profile==='b250-m524'&&r.repeat===2).outcome.relations=91;
 assert.equal(geometryDecision(x).candidate,null);
});
test('equal top improvements retain baseline; zero/abnormal/missing/duplicate records fail closed',()=>{
 const x=rows();for(const r of x)if(['b250-m524','b325-m262'].includes(r.profile))r.outcome.relations=120;
 assert.equal(geometryDecision(x).candidate,null);
 for(const change of [x=>x[0].outcome.relations=0,x=>x[0].outcome.reason='wasm-oom',x=>x.pop(),x=>x[1]=x[0]]){const x=rows();change(x);assert.throws(()=>geometryDecision(x));}
});
