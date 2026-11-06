import test from 'node:test';import assert from 'node:assert/strict';
import {createSiteSession} from '../../src/site/session.js';
import {selectValidatedStagedPlan} from '../../src/engine/staged-selected.js';
import {createVerifiedRoutingSession} from '../../src/routing/verification.js';
import {createStagedPort} from '../../src/routing/staged-port.js';
import {createSiqsPort} from '../../src/routing/siqs-ports.js';
import {factorStaged} from '../../src/engine/staged-factor.js';
const finished=input=>({...factorStaged(BigInt(input)),origin:'worker',traceAvailable:true});
const big=(1n<<128n).toString();
function fixture(overrides={}){
 const calls=[],loads=[];
 // Isolate actual staged/SIQS adapter contracts; this fixture intentionally has no Native/ECM Worker.
 const createRouter=({scope,now,light,heavy})=>createVerifiedRoutingSession({scope,now,ports:{
 staged128:createStagedPort({run:light.runSelectedStagedRequest,now}),
 siqs332:createSiqsPort('siqs332',{now,api:{runRusqsieve:async(i,o)=>{
 const r=await heavy.runRusqsieve(i,o);return{familiesIssued:0,familiesSubmitted:0,divisor:r.factors?.[0]?.value??null,reason:null,...r};
 }}})}});
 const s=createSiteSession({createRouter,hints:{},loadLight:async()=>{loads.push('light');return{selectValidatedStagedPlan,runSelectedStagedRequest:async(i,o,d)=>{calls.push({i,o,d});return finished(i);}};},loadHeavy:async()=>{loads.push('heavy');return{runRusqsieve:async(i,o)=>{calls.push({i,o});return{input:i,kind:'timeout',reason:'time-budget',factors:[],remaining:i,allWorkersDisposed:true,allWorkerSourcesReleased:true,memoryByOwner:[],maximumWasmBytes:o.resourcePlan.totalWasmBytes};}};},...overrides});
 return{s,calls,loads};
}
test('assets are prepared before calculation and light input keeps existing exact route',async()=>{
 const {s,calls,loads}=fixture();assert.equal(await s.start('32'),false);assert.equal(calls.length,0);
 await s.prepare('standard');await s.start('3.2e1');assert.deepEqual(loads,['light','heavy']);assert.equal(calls[0].i,'32');assert.equal(s.getState().view.copyText.split('\n')[0],'32 = 2^5');assert.equal(s.getState().resources.actualWasmBytes,0);assert.equal(s.getState().resources.actualWorkers,1);
 await s.start('0');assert.equal(s.getState().resources.actualWorkers,0);
});
test('SIQS assets and explicit mode remain required for that processing profile',async()=>{
 const {s,calls,loads}=fixture();await s.prepare('standard');assert.equal(await s.start((1n<<1024n).toString()),false);assert.equal(calls.length,0);
 await s.prepare('optimized');await s.start(big,{mode:'manual',workers:4,memoryMiB:512,timeBudgetMs:60000});
 assert.deepEqual(loads,['light','heavy','heavy']);assert.equal(calls[0].o.resourcePlan.workers,4);assert.equal(s.getState().resources.actualWasmBytes,448*1048576);assert.match(s.getState().view.copyText,/未完了/);
 await s.start('32');assert.equal(calls[1].i,'32');assert.equal(calls[1].d.signal.aborted,true);
});
test('invalid resource/input combinations reject before either engine',async()=>{
 const {s,calls}=fixture();await s.prepare('optimized');
 for(const [i,o]of [['9'.repeat(101),{}],['-1',{}],['1e9999',{}]]){
  assert.equal(await s.start(i,o),false);assert.equal(s.getState().phase,'invalid');
 }
 assert.equal(calls.length,0);
});
test('cancel and disposal prevent overlapping jobs and late UI updates',async()=>{
 let done,signal;const states=[];
 const {s}=fixture({onChange:x=>states.push(x),loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:(i,o,d)=>{signal=d.signal;return new Promise(r=>done=r);}})});
 await s.prepare('standard');const p=s.start('32');assert.equal(await s.start('64'),false);assert.equal(await s.prepare('optimized'),false);
 await Promise.resolve();await Promise.resolve();assert.equal(s.cancel(),true);assert.equal(signal.aborted,true);assert.equal(await s.start('64'),false);
 s.dispose();const n=states.length;done(finished('32'));await p;assert.equal(states.length,n);assert.equal(s.getState().phase,'disposed');
});
test('a valid divisor is independently replanned instead of trusting a malformed completion claim',async()=>{
 const {s}=fixture({loadHeavy:async()=>({runRusqsieve:async()=>({input:big,kind:'factorized',factors:[{value:'2',certainty:'proven'}],remaining:'1',allWorkersDisposed:true,allWorkerSourcesReleased:true})})});
 await s.prepare('optimized');await s.start(big);assert.equal(s.getState().phase,'result');assert.equal(s.getState().view.status,'complete');assert.deepEqual(s.getState().view.groups,[{base:'2',exponent:128,certainty:'proven'}]);
});
test('normal path keeps its own finite60 second maximum',async()=>{
 const {s,calls}=fixture();await s.prepare('standard');await s.start('32',{timeBudgetMs:600000});
 assert.ok(calls[0].o.timeBudgetMs>0&&calls[0].o.timeBudgetMs<=60000);assert.equal(s.getState().resources.actualTimeBudgetMs,60000);
});

test('uncertain retirement blocks replacement until a fresh page',async()=>{
 const {s,calls}=fixture({loadHeavy:async()=>({runRusqsieve:async i=>({input:i,kind:'incomplete',reason:'worker-retirement',factors:[],remaining:i,allWorkersDisposed:false,allWorkerSourcesReleased:true})})});
 await s.prepare('optimized');await s.start(big);assert.equal(s.getState().phase,'blocked');assert.equal(await s.start('32'),false);assert.equal(await s.prepare('standard'),false);assert.equal(calls.length,0);
});

test('composite divisor certainty is ignored and its factors are independently confirmed',async()=>{
 for(const kind of ['factorized','probable']){
 const {s}=fixture({loadHeavy:async()=>({runRusqsieve:async()=>({input:big,kind,factors:[{value:(1n<<64n).toString(),certainty:kind==='factorized'?'proven':'probable'},{value:(1n<<64n).toString(),certainty:kind==='factorized'?'proven':'probable'}],remaining:'1',allWorkersDisposed:true,allWorkerSourcesReleased:true})})});
 await s.prepare('optimized');await s.start(big);assert.equal(s.getState().phase,'result');assert.equal(s.getState().view.status,'complete');assert.deepEqual(s.getState().view.groups,[{base:'2',exponent:128,certainty:'proven'}]);
 }
});
test('display certainty proof shares the finite request deadline',async()=>{
 const p=(1n<<127n)-1n,input=(3n*p).toString();let at=0;
 const result={input,kind:'probable',factors:[{value:'3',certainty:'proven'},{value:p.toString(),certainty:'probable'}],remaining:'1',allWorkersDisposed:true,allWorkerSourcesReleased:true};
 const {s}=fixture({now:()=>at,loadHeavy:async()=>({runRusqsieve:async()=>result})});
 await s.prepare('optimized');await s.start(input);assert.equal(s.getState().phase,'result');
 assert.deepEqual(s.getState().view.groups,[{base:'3',exponent:1,certainty:'proven'},{base:p.toString(),exponent:1,certainty:'probable'}]);assert.equal(s.getState().view.residual,null);
 const late=fixture({now:()=>at,loadHeavy:async()=>({runRusqsieve:async()=>{at+=1001;return result;}})});
 await late.s.prepare('optimized');await late.s.start(input);assert.equal(late.s.getState().phase,'result');assert.match(late.s.getState().view.statusText,/未完了/);assert.equal(late.s.getState().view.groups.length,0);
});
test('quarantine survives a new session in the same document scope',async()=>{
 const {makeComputeScope}=await import('../../src/site/document-scope.js');const scope=makeComputeScope();
 const first=fixture({scope,loadHeavy:async()=>({runRusqsieve:async i=>({input:i,kind:'incomplete',factors:[],remaining:i,allWorkersDisposed:false,allWorkerSourcesReleased:true})})});
 await first.s.prepare('optimized');await first.s.start(big);assert.equal(first.s.getState().phase,'blocked');first.s.dispose();
 const next=fixture({scope});assert.equal(await next.s.prepare('standard'),false);assert.equal(next.s.getState().phase,'blocked');assert.equal(await next.s.start('32'),false);
});
test('disposed pending job holds the shared lease until retirement resolves',async()=>{
 const {makeComputeScope}=await import('../../src/site/document-scope.js');const scope=makeComputeScope();let done;
 const first=fixture({scope,loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:()=>new Promise(r=>done=r)})});
 const next=fixture({scope});await first.s.prepare('standard');await next.s.prepare('standard');
 const pending=first.s.start('32');first.s.dispose();
 assert.equal(await next.s.start('64'),false);assert.equal(next.calls.length,0);
 done(finished('32'));await pending;
 assert.equal(await next.s.start('64'),true);assert.equal(next.calls.length,1);
});
test('elapsed time excludes asset preparation, retains fractions and freezes after retirement',async()=>{
 let at=100;
 const {s}=fixture({now:()=>at,loadLight:async()=>{at=500;return{selectValidatedStagedPlan,runSelectedStagedRequest:async i=>{at+=12.25;return finished(i);}};}});
 await s.prepare();await s.start('32');assert.equal(s.getState().resources.elapsedMs,12.25);
 at=900;assert.equal(s.getElapsedMs(),12.25);assert.equal(s.getState().resources.actualTimeBudgetMs,1000);
});

test('terminal progress uses verified status and clears completion before a rejected retry',async()=>{
 const {s}=fixture();await s.prepare();await s.start('360');
 assert.equal(s.getState().progress.resultStatus,'complete');
 await s.start('2.5');assert.equal(s.getState().phase,'invalid');assert.equal(s.getState().progress,null);
 await s.start('0');assert.equal(s.getState().progress.resultStatus,'neither');
 const p=(1n<<127n)-1n,{s:probable}=fixture();await probable.prepare();await probable.start(p.toString());
 assert.equal(probable.getState().view.status,'probable');assert.equal(probable.getState().progress.resultStatus,'probable');
});
test('proof timeout, computation failure and cancellation keep a non-success terminal progress',async()=>{
 const p=(1n<<127n)-1n,input=(3n*p).toString();let at=0;
 const {s:late}=fixture({now:()=>at,loadHeavy:async()=>({runRusqsieve:async()=>{at+=1001;return{input,kind:'probable',factors:[{value:'3',certainty:'proven'},{value:p.toString(),certainty:'probable'}],remaining:'1',allWorkersDisposed:true,allWorkerSourcesReleased:true};}})});
 await late.prepare('optimized');await late.start(input);
 assert.equal(late.getState().view.status,'incomplete');assert.equal(late.getState().progress.resultStatus,'incomplete');assert.equal(late.getState().view.groups.length,0);
 const {sitePresentation}=await import('../../src/site/presentation.js');
 const rows=sitePresentation(late.getState().view).factorRows;assert.ok(rows.length);assert.ok(rows.every(r=>r.certainty==='unknown'&&r.text.endsWith(': 不明')));
 const {s:failed}=fixture({loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:async()=>{throw Error('controlled computation error');}})});
 await failed.prepare();await failed.start('32');assert.notEqual(failed.getState().progress.resultStatus,'complete');
 let finish;const {s:cancelled}=fixture({loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:i=>new Promise(r=>finish=()=>r(finished(i)))})});
 await cancelled.prepare();const pending=cancelled.start('32');await Promise.resolve();await Promise.resolve();cancelled.cancel();finish();await pending;
 assert.equal(cancelled.getState().view.status,'cancelled');assert.equal(cancelled.getState().progress.resultStatus,'cancelled');
 await cancelled.start('2.5');assert.equal(cancelled.getState().progress,null);
});

test('a complete verified prefix after Worker error keeps its factors without normal completion',async()=>{
 const port={start(r,ctx){const packet={version:1,jobId:r.jobId,stage:r.stage,input:r.input,seq:1,work:1,snapshot:{factors:[{value:'2',exponent:5}],remaining:'1'},reportedPrimality:'unknown'};
 ctx.onSnapshot(packet);return{result:Promise.resolve({reason:'worker-error',packet:{...packet,seq:2,work:2}}),dispose:()=>({allWorkersDisposed:true,allWorkerSourcesReleased:true})};}};
 const s=createSiteSession({now:()=>0,loadLight:async()=>({}),loadHeavy:async()=>({}),createRouter:({scope,now})=>createVerifiedRoutingSession({scope,now,ports:{staged128:port}})});
 await s.prepare();await s.start('32');const state=s.getState();
 assert.equal(state.view.status,'complete');assert.deepEqual(state.view.groups,[{base:'2',exponent:5,certainty:'proven'}]);assert.match(state.view.reasonText,/Worker異常/);
 assert.equal(state.progress.completedNormally,false);
});
