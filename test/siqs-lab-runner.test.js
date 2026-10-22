import test from 'node:test';
import assert from 'node:assert/strict';
import {createLabRunner} from '../src/siqs-lab/runner.js';
const input='1427247692705959880439315947500961989719490561';
test('lab cancellation retires loading and running workers once',async()=>{
 for(const ready of [false,true]){
  let killed=0,posted=0;
  const createWorker=()=>{const w={terminate(){killed++;},postMessage(){posted++;}};
   if(ready)queueMicrotask(()=>w.onmessage?.({data:{type:'ready',version:14,wasmBytes:268435456}}));return w;};
  const r=createLabRunner({createWorker});const p=r.run(input,{timeBudgetMs:1000});
  await new Promise(yes=>setTimeout(yes,10));r.cancel();const result=await p;
  assert.equal(result.kind,'cancelled');assert.equal(result.allWorkersDisposed,true);assert.equal(killed,1);
  assert.equal(posted,ready?1:0);assert.equal(result.hostStops[0].reason,'cancelled');
 }
});
test('independent host deadline retires a non-cooperative worker',async()=>{
 let killed=0;
 const r=createLabRunner({createWorker(){const w={terminate(){killed++;},postMessage(){}};
  queueMicrotask(()=>w.onmessage?.({data:{type:'ready',version:14,wasmBytes:268435456}}));return w;},
  schedule:(fn,ms)=>setTimeout(fn,Math.min(ms,25))});
 const out=await r.run(input,{timeBudgetMs:1000});
 assert.equal(out.kind,'timeout');assert.equal(killed,1);assert.equal(out.allWorkersDisposed,true);
});
test('unsupported input and invalid total budgets allocate no workers',async()=>{
 let created=0;const r=createLabRunner({createWorker(){created++;throw Error('Unexpected allocation');}});
 for(const n of ['1','32',(1n<<332n).toString(),'09'])assert.equal((await r.run(n)).kind,'unsupported');
 await assert.rejects(r.run(input,{workers:3}));assert.equal(created,0);
});
test('late ready and late result cannot beat an undispatched host timer',async()=>{
 for(const late of ['ready','done']){
  let clock=0,posted=0,killed=0;
  const createWorker=()=>{const w={terminate(){killed++;},postMessage(){posted++;clock=1100;queueMicrotask(()=>w.onmessage?.({data:{type:'done',version:14,id:1}}));}};
   queueMicrotask(()=>{if(late==='ready')clock=6000;w.onmessage?.({data:{type:'ready',version:14,wasmBytes:268435456}});});return w;};
  const r=createLabRunner({createWorker,now:()=>clock,schedule:()=>0,unschedule(){}});
  const result=await r.run(input,{timeBudgetMs:late==='ready'?15000:1000});
  assert.notEqual(result.kind,'verified');assert.equal(posted,late==='ready'?0:1);assert.equal(killed,1);assert.equal(result.allWorkersDisposed,true);
 }
});
test('retirement exceptions settle fatally and disable reuse',async()=>{
 let calls=0;
 const r=createLabRunner({createWorker:()=>({terminate(){if(++calls===1)throw Error('terminate failed once');},postMessage(){}})});
 const p=r.run(input,{timeBudgetMs:1000});await new Promise(yes=>setTimeout(yes,5));
 r.cancel();const result=await p;
 assert.equal(result.kind,'fatal');assert.equal(result.allWorkersDisposed,true);assert.equal(calls,2);
 await assert.rejects(r.run(input));
});
test('valid late merge results and slow retirement are timeouts',async()=>{
 for(const late of ['arrival','retirement']){
  let clock=0,created=0;
  const createWorker=()=>{
   const index=++created;
   const w={terminate(){if(index===2&&late==='retirement')clock=1100;},postMessage(m){
    if(index===2&&late==='arrival')clock=1100;
    const meta={input,multiplier:1,fbSize:10,parameters:'0',build:'fixed'};
    const data={type:'done',version:14,id:m.id,phase:m.phase,stop:'collected',normal:true,operations:1,stats:{work:1},meta,divisor:null,
     buffer:index===1?new TextEncoder().encode(BigInt(input).toString(16)+'\n').buffer:null,graph:index===2?{verified:true}:null};
    queueMicrotask(()=>w.onmessage?.({data}));
   }};queueMicrotask(()=>w.onmessage?.({data:{type:'ready',version:14,wasmBytes:268435456}}));return w;
  };
  const r=createLabRunner({createWorker,now:()=>clock,schedule:()=>0,unschedule(){}});
  const result=await r.run(input,{timeBudgetMs:1000});
  assert.equal(result.kind,'timeout');assert.equal(result.allWorkersDisposed,true);assert.equal(created,2);
 }
});
test('release failure still terminates and settles without claiming reuse',async()=>{
 let killed=0;
 const r=createLabRunner({createWorker:()=>({terminate(){killed++;},releaseSource(){throw Error('release failed');},postMessage(){}})});
 const p=r.run(input);await new Promise(yes=>setTimeout(yes,5));r.cancel();
 const out=await p;assert.equal(out.kind,'fatal');assert.equal(out.allWorkersDisposed,true);assert.equal(killed,1);
 await assert.rejects(r.run(input));
});
