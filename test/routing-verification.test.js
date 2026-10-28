// SPDX-License-Identifier: AGPL-3.0-only
// Real existing assessPrime is used; this is a bounded verification test, not a factorization benchmark.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoutingSession} from '../src/routing/session.js';
import {verifyRoutingResult,isVerifiedRoutingResult,createVerifiedRoutingSession} from '../src/routing/verification.js';
const retire={allWorkersDisposed:true,allWorkerSourcesReleased:true};
async function raw(input,snapshot){
 const port={start(r){return{result:Promise.resolve({reason:'exhausted',packet:{version:1,jobId:r.jobId,stage:'native',input:r.input,seq:1,work:1,snapshot,reportedPrimality:'unknown'}}),dispose:()=>retire};}};
 return createRoutingSession({ports:{native:port},now:()=>0}).run(input,{maxStages:1});
}
test('a genuine routing outcome can be independently classified as a proven small factorization',async()=>{
 const r=await raw('91',{factors:[{value:'7',exponent:1}],remaining:'13'}),v=verifyRoutingResult(r,{now:()=>0});
 assert.equal(v.status,'complete');assert.equal(v.factorizationComplete,true);assert.equal(v.allFactorsProven,true);assert.equal(v.verifiedFactors.length,2);
 assert.equal(isVerifiedRoutingResult(v,'91'),true);assert.equal(isVerifiedRoutingResult({...v},'91'),false);
 assert.throws(()=>verifyRoutingResult({...r},{now:()=>0}));
});
test('a large probable prime remains explicitly unproven',async()=>{
 const input=((1n<<127n)-1n).toString(),r=await raw(input,{factors:[],remaining:input}),v=verifyRoutingResult(r,{now:()=>0});
 assert.equal(v.status,'probable');assert.equal(v.decompositionComplete,true);assert.equal(v.factorizationComplete,false);assert.equal(v.allFactorsProven,false);assert.equal(v.verifiedFactors[0].certainty,'probable');
});
test('ECM composite divisor15 is not relabeled prime or a completed factorization',async()=>{
 const input=(15n*((1n<<61n)-1n)).toString(),r=await raw(input,{factors:[{value:'15',exponent:1}],remaining:((1n<<61n)-1n).toString()}),v=verifyRoutingResult(r,{now:()=>0});
 assert.equal(v.status,'incomplete');assert.equal(v.factorizationComplete,false);assert.equal(v.pendingGroups[0].value,'15');assert.equal(v.pendingGroups[0].certainty,'composite');assert.equal(v.verifiedFactors[0].certainty,'proven');
});
test('proof work and shared deadline stop without a false invalid-result classification',async()=>{
 const r=await raw('91',{factors:[],remaining:'91'});
 assert.equal(verifyRoutingResult(r,{now:()=>0,maxOperations:1}).reason,'proof-operation-budget');
 assert.equal(verifyRoutingResult(r,{now:()=>1001}).reason,'proof-time-budget');
 const stopped=verifyRoutingResult(r,{now:()=>0,maxOperations:1});assert.equal(stopped.pendingGroups[0].value,'91');assert.equal(stopped.factorizationComplete,false);
});
test('cancellation skips further primality work and retains unresolved input',async()=>{
 const control=new AbortController();control.abort();
 const r=await createRoutingSession({now:()=>0}).run('91',{signal:control.signal}),v=verifyRoutingResult(r,{now(){throw Error('must not run proof');}});
 assert.equal(v.status,'cancelled');assert.equal(v.pendingGroups[0].value,'91');
});

test('verification cancellation is distinct from a previous execution stop',async()=>{
 const r=await raw('91',{factors:[],remaining:'91'}),control=new AbortController();control.abort();
 const v=verifyRoutingResult(r,{signal:control.signal,now(){throw Error('must not calculate');}});
 assert.equal(v.status,'cancelled');assert.equal(v.reason,'cancelled');assert.equal(v.executionReason,r.reason);
 let time=0;const during=verifyRoutingResult(r,{signal:{get aborted(){return ++time>2;}},now:()=>0});
 assert.equal(during.status,'cancelled');assert.equal(during.reason,'cancelled');
});
test('legitimate scope-busy routing outcomes are branded but never run prime verification',async()=>{
 const session=createRoutingSession({ports:{native:{start(){return{result:new Promise(()=>{}),dispose:()=>({allWorkersDisposed:true,allWorkerSourcesReleased:true})};}}},now:()=>0});
 const pending=session.run('91');const blocked=await session.run('97');
 const v=verifyRoutingResult(blocked,{now(){throw Error('must not calculate');}});assert.equal(v.status,'blocked');assert.equal(v.reason,'scope-busy');session.cancel();await pending;
});

test('verified target selection factors a composite reported divisor and scales its multiplicity',async()=>{
 const calls=[],port={start(r){
  calls.push(r.input);
  const snapshot=r.input==='6561'?{factors:[{value:'9',exponent:3}],remaining:'9'}:{factors:[{value:'3',exponent:2}],remaining:'1'};
  return{result:Promise.resolve({reason:'exhausted',packet:{version:1,jobId:r.jobId,stage:'native',input:r.input,seq:1,work:1,snapshot,reportedPrimality:'unknown'}}),dispose:()=>retire};
 }};
 const r=await createVerifiedRoutingSession({ports:{native:port},now:()=>0}).run('6561',{maxStages:5});
 const v=verifyRoutingResult(r,{now:()=>0});
 assert.deepEqual(calls,['6561','9']);assert.deepEqual(r.snapshot,{factors:[{value:'3',exponent:8}],remaining:'1'});
 assert.equal(v.factorizationComplete,true);assert.equal(r.workRemaining.native,49998);
});
test('verified session can classify a small prime without launching an algorithm Worker',async()=>{
 let calls=0;const port={start(){calls++;throw Error('must not launch');}};
 const raw=await createVerifiedRoutingSession({ports:{native:port},now:()=>0}).run('97'),verified=verifyRoutingResult(raw,{now:()=>0});
 assert.equal(calls,0);assert.equal(verified.factorizationComplete,true);assert.equal(verified.verifiedFactors[0].value,'97');
});

test('an exhausted composite target does not prevent another pending target from being split',async()=>{
 const calls=[],port={start(r){
  calls.push(r.input);
  const snapshot=r.input==='225'?{factors:[{value:'9',exponent:1}],remaining:'25'}:r.input==='25'?{factors:[{value:'5',exponent:2}],remaining:'1'}:{factors:[],remaining:r.input};
  return{result:Promise.resolve({reason:'exhausted',packet:{version:1,jobId:r.jobId,stage:'native',input:r.input,seq:1,work:1,snapshot,reportedPrimality:'unknown'}}),dispose:()=>retire};
 }};
 const r=await createVerifiedRoutingSession({ports:{native:port},now:()=>0}).run('225',{maxStages:5}),v=verifyRoutingResult(r,{now:()=>0});
 assert.deepEqual(calls,['225','9','25']);assert.equal(v.factorizationComplete,false);
 assert.deepEqual(v.pendingGroups,[{value:'9',exponent:1,certainty:'composite'}]);
 assert.deepEqual(v.verifiedFactors,[{value:'5',exponent:2,certainty:'proven'}]);
 assert.equal(r.reason,'enabled-engines-exhausted');assert.equal(r.allStagesDisposed,true);
});
