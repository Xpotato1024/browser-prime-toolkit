import test from 'node:test';import assert from 'node:assert/strict';
import {createResourceSession} from '../src/resources/session.js';
import {selectValidatedStagedPlan} from '../src/engine/staged-selected.js';
import {factorStaged} from '../src/engine/staged-factor.js';
const finished=input=>({...factorStaged(BigInt(input)),origin:'worker',traceAvailable:true});
const big=(1n<<128n).toString();
function fixture(overrides={}){
 const calls=[],loads=[];
 const s=createResourceSession({hints:{},loadLight:async()=>{loads.push('light');return{selectValidatedStagedPlan,runSelectedStagedRequest:async(i,o,d)=>{calls.push({i,o,d});return finished(i);}};},loadHeavy:async()=>{loads.push('heavy');return{runRusqsieve:async(i,o)=>{calls.push({i,o});return{input:i,kind:'timeout',reason:'time-budget',factors:[],remaining:i,allWorkersDisposed:true,allWorkerSourcesReleased:true,memoryByOwner:[],maximumWasmBytes:o.resourcePlan.totalWasmBytes};}};},...overrides});
 return{s,calls,loads};
}
test('assets are prepared before calculation and light input keeps existing exact route',async()=>{
 const {s,calls,loads}=fixture();assert.equal(await s.start('32'),false);assert.equal(calls.length,0);
 await s.prepare('standard');await s.start('3.2e1');assert.deepEqual(loads,['light']);assert.equal(calls[0].i,'32');assert.equal(s.getState().view.copyText.split('\n')[0],'32 = 2^5');assert.equal(s.getState().resources.actualWasmBytes,0);assert.equal(s.getState().resources.actualWorkers,1);
 await s.start('0');assert.equal(s.getState().resources.actualWorkers,0);
});
test('experimental assets and explicit mode are required for large integers',async()=>{
 const {s,calls,loads}=fixture();await s.prepare('standard');assert.equal(await s.start(big),false);assert.equal(calls.length,0);
 await s.prepare('experimental');await s.start(big,{mode:'manual',workers:4,memoryMiB:512,timeBudgetMs:60000});
 assert.deepEqual(loads,['light','heavy']);assert.equal(calls[0].o.resourcePlan.workers,4);assert.equal(s.getState().resources.actualWasmBytes,448*1048576);assert.match(s.getState().view.copyText,/未完了/);
 await s.start('32');assert.equal(calls[1].i,'32');assert.equal(calls[1].d.signal.aborted,false);
});
test('invalid resource/input combinations reject before either engine',async()=>{
 const {s,calls}=fixture();await s.prepare('experimental');
 for(const [i,o]of [['32',{mode:'manual',workers:4,memoryMiB:128}],['9'.repeat(101),{}],['-1',{}],['1e9999',{}]]){
  assert.equal(await s.start(i,o),false);assert.equal(s.getState().phase,'invalid');
 }
 assert.equal(calls.length,0);
});
test('cancel and disposal prevent overlapping jobs and late UI updates',async()=>{
 let done,signal;const states=[];
 const {s}=fixture({onChange:x=>states.push(x),loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:(i,o,d)=>{signal=d.signal;return new Promise(r=>done=r);}})});
 await s.prepare('standard');const p=s.start('32');assert.equal(await s.start('64'),false);assert.equal(await s.prepare('experimental'),false);
 assert.equal(s.cancel(),true);assert.equal(signal.aborted,true);assert.equal(await s.start('64'),false);
 s.dispose();const n=states.length;done(finished('32'));await p;assert.equal(states.length,n);assert.equal(s.getState().phase,'disposed');
});
test('large result is independently checked for input/product and owner retirement',async()=>{
 const {s}=fixture({loadHeavy:async()=>({runRusqsieve:async()=>({input:big,kind:'factorized',factors:[{value:'2',certainty:'proven'}],remaining:'1',allWorkersDisposed:true,allWorkerSourcesReleased:true})})});
 await s.prepare('experimental');await s.start(big);assert.equal(s.getState().phase,'error');assert.equal(s.getState().view,null);
});
test('normal path keeps its own finite60 second maximum',async()=>{
 const {s,calls}=fixture();await s.prepare('standard');await s.start('32',{timeBudgetMs:600000});
 assert.equal(calls[0].o.timeBudgetMs,60000);assert.equal(s.getState().resources.actualTimeBudgetMs,60000);
});

test('uncertain retirement blocks replacement until a fresh page',async()=>{
 const {s,calls}=fixture({loadHeavy:async()=>({runRusqsieve:async i=>({input:i,kind:'incomplete',reason:'worker-retirement',factors:[],remaining:i,allWorkersDisposed:false,allWorkerSourcesReleased:true})})});
 await s.prepare('experimental');await s.start(big);assert.equal(s.getState().phase,'blocked');assert.equal(await s.start('32'),false);assert.equal(await s.prepare('standard'),false);assert.equal(calls.length,0);
});

test('correct product with forged prime certainty is rejected',async()=>{
 for(const kind of ['factorized','probable']){
 const {s}=fixture({loadHeavy:async()=>({runRusqsieve:async()=>({input:big,kind,factors:[{value:(1n<<64n).toString(),certainty:kind==='factorized'?'proven':'probable'},{value:(1n<<64n).toString(),certainty:kind==='factorized'?'proven':'probable'}],remaining:'1',allWorkersDisposed:true,allWorkerSourcesReleased:true})})});
 await s.prepare('experimental');await s.start(big);assert.equal(s.getState().phase,'error');assert.equal(s.getState().view,null);
 }
});
test('display certainty proof shares the finite request deadline',async()=>{
 const p=(1n<<127n)-1n,input=(3n*p).toString();let at=0;
 const result={input,kind:'probable',factors:[{value:'3',certainty:'proven'},{value:p.toString(),certainty:'probable'}],remaining:'1',allWorkersDisposed:true,allWorkerSourcesReleased:true};
 const {s}=fixture({now:()=>at,loadHeavy:async()=>({runRusqsieve:async()=>result})});
 await s.prepare('experimental');await s.start(input);assert.equal(s.getState().phase,'result');
 const late=fixture({now:()=>at,loadHeavy:async()=>({runRusqsieve:async()=>{at+=1001;return result;}})});
 await late.s.prepare('experimental');await late.s.start(input);assert.equal(late.s.getState().phase,'error');assert.equal(late.s.getState().view,null);
});
