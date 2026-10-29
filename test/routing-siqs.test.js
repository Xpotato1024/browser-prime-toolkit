// SPDX-License-Identifier: AGPL-3.0-only
// SIQS API mapping fixtures, not real collection or factorization measurements.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSiqsPort} from '../src/routing/siqs-ports.js';
import {chooseStage,makeRoutingPolicy} from '../src/routing/plan.js';
const input=((1n<<200n)+1n).toString();
const request={...chooseStage({remaining:input,available:['siqs332'],policy:makeRoutingPolicy({jobTimeMs:1000,work:{siqs:4}}),remainingMs:1000}),jobId:1,deadline:1000};
const result=(patch={})=>({input,kind:'incomplete',reason:'insufficient-relations',familiesIssued:4,familiesSubmitted:4,allWorkersDisposed:true,allWorkerSourcesReleased:true,...patch});
test('SIQS port forwards bounded family limit and retains exact normal completion work',async()=>{
 let options;const port=createSiqsPort('siqs332',{now:()=>0,api:{async runRusqsieve(_n,o){options=o;return result();}}});
 const lease=port.start(request),r=await lease.result;assert.equal(r.reason,'exhausted');assert.equal(r.packet.work,4);assert.equal(options.familyLimit,4);assert.equal(options.resourcePlan,request.resourcePlan);assert.equal((await lease.dispose()).allWorkersDisposed,true);
});
test('all known abnormal/unknown SIQS exits fail closed rather than becoming exhaustion',async()=>{
 for(const[reason,expected]of [['algorithm-resource','algorithm-resource'],['native-unknown','worker-error'],['missing-session','worker-error'],['unexpected-new-code','worker-error'],['time-budget','phase-time-budget'],['native-memory-budget','memory-budget']]){
  const port=createSiqsPort('siqs332',{now:()=>0,api:{async runRusqsieve(){return result({reason});}}}),lease=port.start(request);
  await assert.rejects(lease.result,e=>e.reason===expected);assert.equal((await lease.dispose()).allWorkersDisposed,true);
 }
});
test('an inconsistent success or nondivisor cannot become a factor prefix',async()=>{
 for(const patch of [{kind:'factorized',reason:null},{kind:'partial',reason:null,divisor:'2'}]){
  const port=createSiqsPort('siqs332',{now:()=>0,api:{async runRusqsieve(){return result(patch);}}}),lease=port.start(request);
  await assert.rejects(lease.result,e=>e.reason==='invalid-result');
 }
});
