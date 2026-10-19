import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {selectStagedPlan} from '../src/engine/staged-plan.js';
import {verifyStagedOutcome} from '../src/engine/staged-result.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=async p=>JSON.parse(await readFile(p,'utf8'));
for(const [cmd,args]of [[process.execPath,['scripts/freeze-staged-corpus.mjs','--check']],['python3',['scripts/freeze-staged-holdout.py','--check']],
 [process.execPath,['scripts/prepare-staged-factor.mjs','--check']],[process.execPath,['scripts/build-staged-workers.mjs','--check']],
 [process.execPath,['scripts/select-staged-policy.mjs','--check']],[process.execPath,['scripts/check-comparison-preservation.mjs']]]){
 const run=spawnSync(cmd,args,{encoding:'utf8'});assert.equal(run.status,0,run.stdout+run.stderr);
}
const policy=await read('bench/staged-selected-policy.json'),seenHeads={};
for(const group of ['training','holdout']){
 const data=await read('docs/benchmarks/llm01-staged-'+group+'.json');
 const corpus=await read('bench/staged-'+(group==='training'?'train':'holdout')+'.json');
 const modes=group==='training'?['brent','ecm','siqs','p64','p80']:['brent','ecm','siqs',policy.mode];
 const seeds=group==='training'?[1,11,23]:[101,211,307,401,503],seen=new Set();
 assert.equal(data.trials.length,corpus.length*modes.length*seeds.length);assert.deepEqual(data.variants,modes);assert.deepEqual(data.seeds,seeds);
 assert.match(data.measuredHead,/^[0-9a-f]{40}$/);seenHeads[group]=data.measuredHead;
 for(let ordinal=0;ordinal<data.trials.length;ordinal++){
  const t=data.trials[ordinal],r=t.receipt;
  const repeat=Math.floor(ordinal/(corpus.length*modes.length)),index=Math.floor(ordinal/modes.length)%corpus.length;
  const c=corpus[index],mode=modes[(ordinal%modes.length+index+repeat)%modes.length];
  assert.equal(t.ordinal,ordinal);assert.equal(t.repeat,repeat);assert.equal(r.measuredHead,data.measuredHead);
  assert.equal(r.caseId,c.id);assert.equal(r.variant,mode);assert.equal(r.seed,seeds[repeat]);assert.equal(r.records.length,1);
  const record=r.records[0],result=verifyStagedOutcome(record.result,c.input);
  assert.deepEqual(record.options,{mode,timeBudgetMs:1000,operationBudget:50000000,seed:seeds[repeat]});
  assert.equal(record.input,c.input);assert.deepEqual(record.expectedFactors,c.factors);
  if(['complete','probable'].includes(result.status))assert.deepEqual(result.factors.map(f=>f.value),c.factors);
  assert.equal(result.policy,mode);assert.equal(result.seed,seeds[repeat]);assert.ok(result.operations<=50000000);
  assert.equal(result.allWorkersDisposed,true);assert.equal(result.workers,1);
  assert.equal(result.linearMemoryBytes,selectStagedPlan(c.input,{mode}).linearMemoryBytes);
  assert.ok(Number.isFinite(result.requestWallMs)&&result.requestWallMs>=0);
  if(result.audit?.ecm)assert.ok(result.audit.ecm.curves<=32);
  assert.deepEqual(r.ownership,{live:0,maxLive:1});assert.equal(r.quiet.networkRequests,0);assert.equal(r.quiet.httpRequests,0);
  assert.equal(r.quiet.badEvents,0);assert.equal(r.quiet.assetServerStopped,true);
  assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
  for(const [path,hash]of Object.entries(r.sourceFiles))assert.equal(sha(await readFile(path)),hash,path);
  const key=[c.id,mode,seeds[repeat]].join('/');assert.ok(!seen.has(key));seen.add(key);
 }
}
assert.equal(seenHeads.training,policy.trainingHead);assert.notEqual(seenHeads.holdout,seenHeads.training);
const life=await read('docs/benchmarks/llm01-staged-lifecycle.json');
assert.equal(life.receipts.length,4);
for(const r of life.receipts){
 for(const when of ['loading','running']){
  const value=r.lifecycle[when];verifyStagedOutcome(value.result,r.records[0].input);
  assert.equal(value.aborted,true);assert.equal(value.result.status,'cancelled');assert.equal(value.result.allWorkersDisposed,true);
  assert.ok(value.abortResponseMs>=0&&Number.isFinite(value.abortResponseMs));
 }
 if(r.lifecycle.fatal){const f=r.lifecycle.fatal.failure;assert.equal(f.message,'computation-error');assert.equal(f.allWorkersDisposed,true);assert.equal(f.audit.ecm.injected,true);assert.equal(f.audit.ecm.poisoned,true);if(f.audit.siqs)assert.equal(f.audit.siqs.nativeLogical,0);}
 assert.deepEqual(r.ownership,{live:0,maxLive:1});
 verifyStagedOutcome(r.records[0].result,r.records[0].input);assert.equal(r.records[0].result.allWorkersDisposed,true);
 if(r.lifecycle.fatal){verifyStagedOutcome(r.lifecycle.fatal.recovered,r.records[0].input);assert.equal(r.lifecycle.fatal.recovered.allWorkersDisposed,true);}
 assert.equal(r.quiet.networkRequests,0);assert.equal(r.quiet.httpRequests,0);assert.equal(r.quiet.badEvents,0);assert.equal(r.quiet.assetServerStopped,true);
 assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
 for(const [path,hash]of Object.entries(r.sourceFiles))assert.equal(sha(await readFile(path)),hash,path);
}
console.log('Verified 90 training + 120 unused holdout trials, fixed training choice, 4 lifecycle receipts, exact results and current source bindings');
