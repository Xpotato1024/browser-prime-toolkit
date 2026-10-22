import test from 'node:test';
import assert from 'node:assert/strict';
import {runEvaluation} from '../bench/evaluation-runner.js';
function fakeFactory({delay=5,error=false}={}){
  const made=[];
  return {made,createWorker(){
    const w={dead:false,addEventListener(){},releaseSource(){},terminate(){this.dead=true;clearTimeout(this.timer);},
      postMessage(){if(error)queueMicrotask(()=>this.onerror?.({preventDefault(){}}));}};
    w.timer=setTimeout(()=>w.onmessage?.({data:{protocolVersion:1,type:'ready'}}),delay);
    made.push(w);return w;
  }};
}
test('shared total deadline includes loading and disposes both lanes',async()=>{
  const factory=fakeFactory({delay:100});
  const result=await runEvaluation('10403',{workers:2,totalMs:10},factory);
  assert.equal(result.reason,'host-timeout');assert.equal(result.initializationMs,null);
  assert.equal(result.allLanesDisposed,true);assert.ok(factory.made.every(w=>w.dead));
});
test('cancel and fatal retire all lanes without a replacement',async()=>{
  const abort=new AbortController(),factory=fakeFactory({delay:100});
  const run=runEvaluation('10403',{workers:2,totalMs:500,signal:abort.signal},factory);
  abort.abort();const result=await run;
  assert.equal(result.status,'cancelled');assert.ok(factory.made.every(w=>w.dead));assert.equal(factory.made.length,2);
  const fail=fakeFactory({error:true});
  await assert.rejects(runEvaluation('10403',{workers:2,totalMs:500},fail),/Evaluation/);
  assert.equal(fail.made.length,2);assert.ok(fail.made.every(w=>w.dead));
});
test('inner computation timeout never creates replacement lanes',async()=>{
  const factory=fakeFactory();
  const result=await runEvaluation('10403',{workers:2,totalMs:500,computeMs:0},factory);
  assert.equal(result.reason,'host-timeout');assert.equal(result.allLanesDisposed,true);
  assert.equal(factory.made.length,2,'one fresh pair only');assert.ok(factory.made.every(w=>w.dead));
});
test('large total envelope respects the core 60000ms cap',async()=>{
  const factory=fakeFactory();let sent;
  const createWorker=()=>{const w=factory.createWorker();w.postMessage=data=>{
    sent=data;queueMicrotask(()=>w.onmessage?.({data:{protocolVersion:1,type:'result',jobId:data.jobId,
      result:{input:data.input,factors:[],remaining:data.input,operations:0,elapsedMs:0,
        algorithm:'gmp-ecm',seed:1,status:'incomplete',reason:'algorithm-exhausted',primality:'composite'}}}));
  };return w;};
  const r=await runEvaluation('10403',{totalMs:65000},{createWorker});
  assert.equal(sent.options.timeBudgetMs,60000);assert.equal(r.allLanesDisposed,true);
});
