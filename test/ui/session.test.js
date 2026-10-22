import test from 'node:test';
import assert from 'node:assert/strict';
import {createUiSession} from '../../src/ui/session.js';
import {factorStaged} from '../../src/engine/staged-factor.js';
const finished=input=>({...factorStaged(BigInt(input)),origin:'worker',traceAvailable:true});
test('scientific input is normalized exactly and only the fixed profile reaches the engine',async()=>{
 const seen=[];const ui=createUiSession({run:async(input,options)=>{seen.push({input,options});return finished(input);}});
 await ui.start('3.2e1');assert.equal(seen[0].input,'32');assert.deepEqual(seen[0].options,{timeBudgetMs:1000,operationBudget:50000000,seed:1});
 assert.equal(ui.getState().view.equation,'32 = 2^5');
 await ui.start('9007199254740993');assert.equal(ui.getState().input,'9007199254740993');
});
test('invalid or out-of-profile values fail before allocating any engine',async()=>{
 let count=0;const ui=createUiSession({run:async()=>count++});
 for(const raw of ['-1','NaN','1.5','1e9999',(1n<<128n).toString()]){
  assert.equal(await ui.start(raw),false);assert.equal(ui.getState().phase,'invalid');assert.ok(ui.getState().error);
 }
 assert.equal(count,0);
});
test('a canceling owner blocks a replacement until its request has settled',async()=>{
 const calls=[];let done;
 const ui=createUiSession({run:(input,options,dependencies)=>{calls.push(dependencies);return new Promise(r=>done=r);}});
 const first=ui.start('32');assert.equal(await ui.start('64'),false);assert.equal(calls.length,1);
 assert.equal(ui.cancel(),true);assert.equal(calls[0].signal.aborted,true);assert.equal(ui.getState().phase,'cancelling');
 assert.equal(await ui.start('64'),false);
 done(finished('32'));await first;assert.equal(ui.getState().phase,'result');
 const next=ui.start('64');assert.equal(calls.length,2);done(finished('64'));await next;
});
test('disposed sessions ignore late responses and never allocate another engine',async()=>{
 let done,signal;const states=[];
 const ui=createUiSession({onChange:s=>states.push(s),run:(i,o,d)=>{signal=d.signal;return new Promise(r=>done=r);}});
 const pending=ui.start('32');ui.dispose();assert.equal(signal.aborted,true);const count=states.length;
 done(finished('32'));await pending;assert.equal(states.length,count);assert.equal(ui.getState().phase,'disposed');assert.equal(await ui.start('64'),false);
});
test('fatal and invalid result rejection recover on a fresh explicit request',async()=>{
 let count=0;const ui=createUiSession({run:async input=>{if(++count===1)throw Error('trap');if(count===2)return finished('64');return finished(input);}});
 await ui.start('32');assert.equal(ui.getState().phase,'error');assert.equal(ui.getState().view,null);
 await ui.start('32');assert.equal(ui.getState().phase,'error');
 await ui.start('32');assert.equal(ui.getState().view.equation,'32 = 2^5');
 const snapshot=ui.getState();snapshot.view.equation='changed';assert.equal(ui.getState().view.equation,'32 = 2^5');
});
