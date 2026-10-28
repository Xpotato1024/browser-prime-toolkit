// SPDX-License-Identifier: AGPL-3.0-only
// Engine-free protocol mocks. No factorization engine or primality proof is executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoutingSession} from '../src/routing/index.js';
const closed={allWorkersDisposed:true,allWorkerSourcesReleased:true};
const empty=r=>({factors:[],remaining:r.input});
const packet=(r,snapshot=empty(r),seq=1,work=1,reportedPrimality='unknown')=>({version:1,jobId:r.jobId,stage:r.stage,input:r.input,seq,work,snapshot,reportedPrimality});
const port=fn=>({start(r,ctx){return{result:Promise.resolve().then(()=>fn(r,ctx)),dispose:()=>closed};}});
const exhausted=(r,s=empty(r))=>({reason:'exhausted',packet:packet(r,s)});
const big=(1n<<200n)+1n;
test('Brent→ECM→SIQS uses one deadline, retained work ledger and phase reserves',async()=>{
 let time=0;const calls=[];
 const f=port(r=>{calls.push(r);time+=10;return exhausted(r);});
 const result=await createRoutingSession({ports:{native:f,ecm:f,siqs332:f},now:()=>time}).run(big.toString(),{jobTimeMs:10000,wasmMiB:128});
 assert.deepEqual(calls.map(c=>c.stage),['native','ecm','siqs332']);
 assert.deepEqual(calls.map(c=>c.timeBudgetMs),[250,1000,9980]);
 assert.equal(result.deadline,10000);assert.equal(result.workRemaining.native,49999);assert.equal(result.workRemaining.ecm,499999);assert.equal(result.workRemaining.siqs,4095);
 assert.equal(result.factorizationComplete,false);assert.equal(result.allStagesDisposed,true);
});
test('large input shrinking to a small residual replans from remaining and preserves the known factor',async()=>{
 const residual=77n,d=1n<<200n,input=(d*residual).toString(),calls=[];
 const native=port(r=>{calls.push(r);return exhausted(r,{factors:[{value:d.toString(),exponent:1}],remaining:'77'});});
 const staged=port(r=>{calls.push(r);return exhausted(r,{factors:[{value:'7',exponent:1},{value:'11',exponent:1}],remaining:'1'});});
 const r=await createRoutingSession({ports:{native,staged128:staged}}).run(input,{jobTimeMs:10000});
 assert.deepEqual(calls.map(c=>[c.stage,c.input]),[['native',input],['staged128','77']]);
 assert.equal(r.snapshot.remaining,'1');assert.equal(r.snapshot.factors.length,3);assert.equal(r.status,'factor-proof-required');assert.equal(r.primalityVerified,false);
});
test('cumulative snapshots and duplicate final packets never double-count known factors',async()=>{
 const native=port((r,ctx)=>{
  if(r.input==='15')return exhausted(r);
  const p=packet(r,{factors:[{value:'2',exponent:2}],remaining:'15'},1,7);
  ctx.onSnapshot(p);ctx.onSnapshot(p);return{reason:'exhausted',packet:p};
 });
 const r=await createRoutingSession({ports:{native}}).run('60',{jobTimeMs:1000});
 assert.deepEqual(r.snapshot.factors,[{value:'2',exponent:2}]);assert.equal(r.snapshot.remaining,'15');
 assert.equal(r.workRemaining.native,49992); // two distinct residual attempts; duplicate packets are idempotent
});
test('nondivisor, prefix rollback and whole-input-as-split are rejected without losing accepted prefix',async()=>{
 for(const bad of [{factors:[{value:'7',exponent:1}],remaining:'9'},{factors:[],remaining:'60'},{factors:[{value:'60',exponent:1}],remaining:'1'}]){
  const f=port((r,ctx)=>{ctx.onSnapshot(packet(r,{factors:[{value:'2',exponent:1}],remaining:'30'},1));return{reason:'exhausted',packet:packet(r,bad,2,2)};});
  const r=await createRoutingSession({ports:{native:f}}).run('60',{jobTimeMs:1000});
  assert.equal(r.reason,'invalid-result');assert.equal(r.snapshot.remaining,'30');
 }
});
test('reported probable is retained as an unverified claim, not a proven factor or unresolved-composite verdict',async()=>{
 const f=port(r=>({reason:'exhausted',packet:packet(r,empty(r),1,4,'probable')}));
 const r=await createRoutingSession({ports:{native:f}}).run('97');
 assert.equal(r.reason,'reported-primality-unverified');assert.equal(r.reportedPrimality,'probable');assert.equal(r.snapshot.remaining,'97');assert.equal(r.factorizationComplete,false);
});
test('job deadline is never reset by factor splits',async()=>{
 let time=0,calls=0;const f=port(r=>{calls++;time+=10;return exhausted(r);});
 const r=await createRoutingSession({ports:{native:f,ecm:f,siqs332:f},now:()=>time}).run(big.toString(),{jobTimeMs:15});
 assert.equal(calls,2);assert.equal(r.reason,'job-time-budget');assert.equal(r.deadline,15);
});
test('phase timeout reserves cleanup and does not label Worker failure as OOM',async()=>{
 let calls=0;
 const hanging={start(){calls++;return{result:new Promise(()=>{}),dispose:()=>closed};}};
 const r=await createRoutingSession({ports:{native:hanging},now:()=>0}).run('91',{jobTimeMs:8,retirementGraceMs:5});
 assert.equal(r.reason,'phase-time-budget');assert.equal(r.allStagesDisposed,true);assert.equal(calls,1);
 const error=port(()=>{throw Error('worker disappeared');});
 const failed=await createRoutingSession({ports:{native:error}}).run('91');
 assert.equal(failed.reason,'worker-error');
});
test('cancel preserves prefix, ignores stale callbacks, disposes and permits a fresh run',async()=>{
 let late,disposed=0;
 const f={start(r,ctx){late=()=>ctx.onSnapshot(packet(r,{factors:[{value:'3',exponent:1}],remaining:'20'},2,2));ctx.onSnapshot(packet(r,{factors:[{value:'2',exponent:1}],remaining:'30'},1));return{result:new Promise(()=>{}),dispose(){disposed++;return closed;}};}};
 const session=createRoutingSession({ports:{native:f}}),control=new AbortController();
 const pending=session.run('60',{signal:control.signal});control.abort();const r=await pending;late();
 assert.equal(r.status,'cancelled');assert.equal(r.snapshot.remaining,'30');assert.equal(disposed,1);
 assert.equal((await session.run('1')).status,'neither');
});
test('uncertain retirement quarantines and blocks the next stage/run',async()=>{
 const f={start(r){return{result:Promise.resolve(exhausted(r)),dispose:()=>({allWorkersDisposed:false,allWorkerSourcesReleased:true})};}};
 const session=createRoutingSession({ports:{native:f,ecm:port(r=>exhausted(r))}});
 assert.equal((await session.run(big.toString())).reason,'worker-retirement');assert.equal(session.isQuarantined(),true);
 assert.equal((await session.run('91')).reason,'scope-quarantined');
});
test('startup callback cancellation launches no engine, and preabort creates no lease',async()=>{
 let calls=0;const f=port(r=>{calls++;return exhausted(r);}),session=createRoutingSession({ports:{native:f}});
 const r=await session.run('91',{onChange:e=>{if(e.phase==='starting')session.cancel();}});
 assert.equal(r.status,'cancelled');assert.equal(r.allStagesDisposed,true);assert.equal(calls,0);
 const control=new AbortController();control.abort();assert.equal((await session.run('91',{signal:control.signal})).status,'cancelled');
});
test('memory stop remains distinct; over-work and changed duplicate packets fail closed',async()=>{
 const memory=port(r=>({reason:'memory-budget',packet:packet(r)}));
 assert.equal((await createRoutingSession({ports:{native:memory}}).run('91')).reason,'memory-budget');
 for(const mode of ['work','duplicate']){
  const f=port((r,ctx)=>{const p=packet(r);ctx.onSnapshot(p);return{reason:'exhausted',packet:mode==='work'?{...p,seq:2,work:r.workBudget+1}:{...p,snapshot:{factors:[{value:'7',exponent:1}],remaining:'13'}}};});
  assert.equal((await createRoutingSession({ports:{native:f}}).run('91')).reason,'invalid-result');
 }
});

test('parallel run is refused, disposal hang quarantines, and invalid initial clock releases scope',async()=>{
 let pendingResolve;const hanging={start(r){return{result:new Promise(resolve=>{pendingResolve=()=>resolve(exhausted(r));}),dispose:()=>new Promise(()=>{})};}};
 const session=createRoutingSession({ports:{native:hanging}});
 const first=session.run('91',{retirementGraceMs:5});assert.equal((await session.run('97')).reason,'scope-busy');
 pendingResolve();assert.equal((await first).reason,'worker-retirement');
 let time=0;const invalid=createRoutingSession({now:()=>{if(++time===2)throw Error('clock fixture');return 1;}});
 await assert.rejects(invalid.run('91'));assert.equal((await invalid.run('1')).status,'neither');
});
test('a startup observer cannot advance the clock past deadline and still launch an engine',async()=>{
 let time=0,calls=0;const f=port(r=>{calls++;return exhausted(r);});
 const r=await createRoutingSession({ports:{native:f},now:()=>time}).run('91',{jobTimeMs:10,onChange:e=>{if(e.phase==='starting')time=20;}});
 assert.equal(calls,0);assert.equal(r.reason,'job-time-budget');assert.equal(r.allStagesDisposed,true);
});
test('SIQS400 reduction to332bits shares a single family ledger and marks proof pending',async()=>{
 const residual=(1n<<331n)+1n,d=1n<<68n,input=(d*residual).toString(),calls=[];
 const high=port(r=>{calls.push(r);return{reason:'exhausted',packet:packet(r,{factors:[{value:d.toString(),exponent:1}],remaining:residual.toString()},1,8)};});
 const low=port(r=>{calls.push(r);return exhausted(r);});
 const r=await createRoutingSession({ports:{siqs400:high,siqs332:low}}).run(input,{wasmMiB:1536,experimental400:true,jobTimeMs:10000});
 assert.deepEqual(calls.map(c=>c.stage),['siqs400','siqs332']);assert.equal(calls[1].workBudget,4088);assert.equal(r.workRemaining.siqs,4087);assert.equal(r.primalityVerified,false);
});

test('port registry is fixed and elapsed time includes bounded retirement',async()=>{
 let time=0;const ports={native:{start(r){return{result:Promise.resolve(exhausted(r)),dispose(){time+=7;return closed;}};}}};
 const session=createRoutingSession({ports,now:()=>time});ports.native={start(){throw Error('late replacement');}};
 const r=await session.run('91',{jobTimeMs:100});
 assert.equal(r.allStagesDisposed,true);assert.equal(r.elapsedMs,7);assert.equal(r.clockValid,true);
});

test('proof budget exhaustion is a budget stop and preserves the previously checked prefix',async()=>{
 let time=0,step=0;
 const f=port((r,ctx)=>{ctx.onSnapshot(packet(r,{factors:[{value:'2',exponent:1}],remaining:'30'},1));step=26;return{reason:'exhausted',packet:packet(r,{factors:[{value:'2',exponent:2}],remaining:'15'},2,2)};});
 const r=await createRoutingSession({ports:{native:f},now:()=>{time+=step;return time;}}).run('60',{jobTimeMs:10000});
 assert.equal(r.reason,'proof-time-budget');assert.equal(r.snapshot.remaining,'30');assert.equal(r.allStagesDisposed,true);
});
test('a terminal older sequence cannot close a newer accepted prefix as a valid final result',async()=>{
 const f=port((r,ctx)=>{ctx.onSnapshot(packet(r,{factors:[{value:'2',exponent:1}],remaining:'30'},2,1));return{reason:'exhausted',packet:packet(r,empty(r),1,1)};});
 const r=await createRoutingSession({ports:{native:f}}).run('60');
 assert.equal(r.reason,'invalid-result');assert.equal(r.snapshot.remaining,'30');
});
test('throwing signal setup/removal cannot leak the active scope',async()=>{
 const session=createRoutingSession();
 const signal={aborted:false,addEventListener(){throw Error('signal fixture');},removeEventListener(){throw Error('remove fixture');}};
 await assert.rejects(session.run('91',{signal}));assert.equal((await session.run('1')).status,'neither');
});

test('late final result after a good prefix charges the reserved upper bound before residual replanning',async()=>{
 let time=0;const calls=[];
 const native=port((r,ctx)=>{calls.push(r.stage);ctx.onSnapshot(packet(r,{factors:[{value:'2',exponent:1}],remaining:'30'},1,1));time=300;return exhausted(r);});
 const siqs=port(r=>{calls.push(r.stage);return exhausted(r);});
 const r=await createRoutingSession({ports:{native,siqs332:siqs},now:()=>time}).run('60',{jobTimeMs:1000});
 assert.deepEqual(calls,['native','siqs332']);assert.equal(r.trace[0].workObserved,1);assert.equal(r.trace[0].workChargedUpperBound,50000);assert.equal(r.workRemaining.native,0);
});
test('accessor packets are rejected without invoking getters or letting callbacks change captured work',async()=>{
 let invoked=0;
 const bad=port(r=>{const p=packet(r);Object.defineProperty(p,'seq',{get(){invoked++;return 1;},enumerable:true});return{reason:'exhausted',packet:p};});
 const r=await createRoutingSession({ports:{native:bad}}).run('91');
 assert.equal(r.reason,'invalid-result');assert.equal(invoked,0);
});
test('definitive cancellation before a port starts charges no work',async()=>{
 const session=createRoutingSession({ports:{native:port(r=>exhausted(r))}});
 const r=await session.run('91',{onChange:e=>{if(e.phase==='starting')session.cancel();}});
 assert.equal(r.workRemaining.native,50000);assert.equal(r.trace[0].workChargedUpperBound,0);
});

test('observer cancellation on final prefix or retirement wins over proof/stage-count terminal states',async()=>{
 for(const phase of ['accepted-prefix','retired']){
  let disposed=0;
  const f={start(r){return{result:Promise.resolve({reason:'exhausted',packet:packet(r,empty(r),1,1,'probable')}),dispose(){disposed++;return closed;}};}};
  const session=createRoutingSession({ports:{native:f}});
  const r=await session.run('97',{maxStages:1,onChange:e=>{if(e.phase===phase)session.cancel();}});
  assert.equal(r.status,'cancelled');assert.equal(r.reason,'cancelled');assert.equal(disposed,1);assert.equal(r.snapshot.remaining,'97');
 }
});

test('an invalid synchronous snapshot closes the stream before a later valid packet can change prefix',async()=>{
 const f={start(r,ctx){
  ctx.onSnapshot(packet(r,{factors:[{value:'2',exponent:1}],remaining:'30'},1));
  ctx.onSnapshot(packet(r,{factors:[{value:'7',exponent:1}],remaining:'9'},2,2));
  ctx.onSnapshot(packet(r,{factors:[{value:'2',exponent:2}],remaining:'15'},3,3));
  return{result:Promise.resolve(exhausted(r)),dispose:()=>closed};
 }};
 const r=await createRoutingSession({ports:{native:f}}).run('60');
 assert.equal(r.reason,'invalid-result');assert.equal(r.snapshot.remaining,'30');
});
