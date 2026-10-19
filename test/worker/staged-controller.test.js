import test from 'node:test';
import assert from 'node:assert/strict';
import {runStagedRequest} from '../../src/worker/staged-controller.js';
import {factorStaged} from '../../src/engine/staged-factor.js';
function factory({delay=2,fail=false,badProfile=false,finish=false,onRun}={}){
 const made=[];
 return{made,createWorker(plan){
  const w={dead:false,releaseSource(){},terminate(){this.dead=true;clearTimeout(this.timer);},
   postMessage(data){onRun?.(data);if(fail)queueMicrotask(()=>this.onerror?.({preventDefault(){}}));
    else if(finish)queueMicrotask(()=>this.onmessage?.({data:{protocolVersion:2,type:'result',jobId:1,
     result:factorStaged(BigInt(data.input),{...data.options,mode:plan.mode})}}));}};
  w.timer=setTimeout(()=>w.onmessage?.({data:{protocolVersion:2,type:'ready',mode:plan.mode,engineMode:plan.engineMode,linearMemoryBytes:badProfile?999:plan.linearMemoryBytes}}),delay);
  made.push(w);return w;
 }};
}
test('one request deadline includes loading and never boots a replacement',async()=>{
 const f=factory({delay:100});const r=await runStagedRequest('10403',{timeBudgetMs:10},f);
 assert.equal(r.reason,'host-timeout');assert.equal(r.initializationMs,null);assert.equal(r.allWorkersDisposed,true);
 assert.equal(f.made.length,1);assert.ok(f.made.every(w=>w.dead));
});
test('loading and running cancellation retire exactly one owner',async()=>{
 for(const running of [false,true]){
  const abort=new AbortController(),f=factory({delay:running?1:100,onRun:()=>queueMicrotask(()=>abort.abort())});
  const promise=runStagedRequest('10403',{timeBudgetMs:500},{...f,signal:abort.signal});if(!running)abort.abort();
  const r=await promise;assert.equal(r.status,'cancelled');assert.equal(r.allWorkersDisposed,true);assert.equal(f.made.length,1);
 }
});
test('invalid ready profile and fatal error retire; a new request recovers',async()=>{
 const bad=factory({badProfile:true});await assert.rejects(runStagedRequest('10403',{},bad),/profile/);assert.ok(bad.made[0].dead);
 const fatal=factory({fail:true});await assert.rejects(runStagedRequest('10403',{},fatal),/worker-error/);assert.ok(fatal.made[0].dead);assert.equal(fatal.made.length,1);
 const good=factory({finish:true});const r=await runStagedRequest('10403',{},good);assert.equal(r.status,'complete');assert.equal(r.allWorkersDisposed,true);
});
test('initialization is charged before granting core time and bounds fail before allocation',async()=>{
 let sent;const f=factory({delay:10,finish:true,onRun:data=>sent=data});
 const r=await runStagedRequest('10403',{timeBudgetMs:200,operationBudget:10000},f);
 assert.ok(sent.options.timeBudgetMs<=175);assert.equal(sent.options.operationBudget,10000);assert.equal(r.allWorkersDisposed,true);
 const out=factory();await assert.rejects(runStagedRequest((1n<<128n).toString(),{},out),/range/);assert.equal(out.made.length,0);
});

test('zero/one are neither without workers',async()=>{
 for(const value of ['0','1']){
  const f=factory();const r=await runStagedRequest(value,{timeBudgetMs:0},f);
  assert.equal(r.status,'neither');assert.equal(r.allWorkersDisposed,true);assert.equal(f.made.length,0);
 }
});
test('result proof time stays inside the request deadline',async()=>{
 let time=0;const f=factory({finish:true});
 const {verifyStagedResult}=await import('../../src/engine/staged-result.js');
 const r=await runStagedRequest('10403',{timeBudgetMs:100},{...f,now:()=>time,verifyResult(value,input){time=101;return verifyStagedResult(value,input);}});
 assert.equal(r.status,'incomplete');assert.equal(r.reason,'host-timeout');
});

test('initialization keeps its five-second cap inside a longer total deadline',async()=>{
 let time=0;const timers=[],abort=new AbortController(),f=factory({delay:20000});
 const run=runStagedRequest('10403',{timeBudgetMs:10000},{...f,signal:abort.signal,now:()=>time,
  schedule(fn,delay){const t={fn,delay};timers.push(t);return t;},unschedule:t=>t.dead=true});
 run.catch(()=>{});
 try{
  const load=timers.find(t=>t.delay===5000);assert.ok(load);
  time=5000;load.fn();await assert.rejects(run,/initialization-timeout/);
  assert.equal(f.made[0].dead,true);assert.ok(timers.every(t=>t.dead));
 }finally{abort.abort();await run.catch(()=>{});}
});

test('source-release failure still terminates the single Worker owner',async()=>{
 const f=factory({delay:10});
 const run=runStagedRequest('10403',{},f);f.made[0].releaseSource=()=>{throw Error('release failure');};
 await assert.rejects(run,/disposal/);assert.equal(f.made[0].dead,true);
});

test('every host and Worker outcome has an explicit validated trace contract',async()=>{
 const {verifyStagedOutcome}=await import('../../src/engine/staged-result.js');
 const cases=[['0',{},factory()],['1',{},factory()],['10403',{operationBudget:0},factory()],
  ['10403',{timeBudgetMs:1},factory({delay:100})],['10403',{},factory({finish:true})]];
 for(const [input,options,f] of cases){
  const value=await runStagedRequest(input,options,f),checked=verifyStagedOutcome(value,input);
  assert.equal(checked.origin,value.status==='complete'?'worker':'host');
  assert.equal(checked.traceAvailable,checked.origin==='worker');
  if(checked.origin==='host'){assert.equal(checked.stages,null);assert.equal(checked.grants,null);}
 }
 const abort=new AbortController(),f=factory({delay:100});
 const pending=runStagedRequest('10403',{}, {...f,signal:abort.signal});abort.abort();
 const cancelled=await pending;assert.equal(verifyStagedOutcome(cancelled,'10403').status,'cancelled');
 assert.throws(()=>verifyStagedOutcome({...cancelled,remaining:'1'},'10403'));
 assert.throws(()=>verifyStagedOutcome({...cancelled,stages:[]},'10403'));
});

test('late ready cannot race past the initialization cap before its timer dispatches',async()=>{
 let time=0,sent=0;const f=factory({delay:20000,onRun:()=>sent++});
 const run=runStagedRequest('10403',{timeBudgetMs:10000},{...f,now:()=>time,schedule:()=>1,unschedule:()=>{}});
 time=6000;f.made[0].onmessage({data:{protocolVersion:2,type:'ready',mode:'p64',engineMode:'brent',linearMemoryBytes:0}});
 // Abort a wrongly accepted job to keep the RED run bounded.
 if(sent)f.made[0].onerror({preventDefault(){}});
 await assert.rejects(run,/initialization-timeout/);assert.equal(sent,0);assert.equal(f.made[0].dead,true);
});
