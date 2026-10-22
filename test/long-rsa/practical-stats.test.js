import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeTier} from '../../scripts/practical-stats.mjs';
test('fixed four pairs count retries once and exclude timeouts from successful time statistics',()=>{
 const cases=[{id:'a',digits:30},{id:'b',digits:30}],seeds=[1,11],trials=[];
 const add=(id,seed,attempts)=>attempts.forEach(([budgetMs,kind,requestWallMs])=>trials.push({id,seed,digits:30,budgetMs,kind,requestWallMs}));
 add('a',1,[[3000,'factorized',10]]);
 add('a',11,[[3000,'timeout',2950],[30000,'factorized',10000]]);
 add('b',1,[[3000,'timeout',2950],[30000,'timeout',29975],[180000,'factorized',70000]]);
 add('b',11,[[3000,'timeout',2950],[30000,'timeout',29975],[180000,'timeout',179975]]);
 const r=summarizeTier({digits:30,cases,seeds,trials});
 assert.deepEqual(r.cumulativeSolvedByBudget.map(b=>b.solved),[1,2,3]);assert.equal(r.fixedInputSeedPairs,4);
 assert.equal(r.successfulRequestWallMs.median,10000);assert.equal(r.successfulRequestWallMs.count,3);
 assert.equal(r.successfulEffortIncludingRetriesMs.median,12950);assert.equal(r.timedOutAttempts,6);assert.equal(r.terminalUnsolvedPairs,1);
 assert.deepEqual(r.actualTrialCountsByBudget.map(b=>b.trials),[4,3,2]);
 assert.throws(()=>summarizeTier({digits:30,cases,seeds,trials:trials.filter(t=>!(t.id==='b'&&t.seed===11&&t.budgetMs===180000))}));
});
