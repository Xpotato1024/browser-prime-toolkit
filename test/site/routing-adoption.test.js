// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';import assert from 'node:assert/strict';
import {createSiteSession} from '../../src/site/session.js';
import {createVerifiedRoutingSession} from '../../src/routing/verification.js';
import {makeRoutingView} from '../../src/site/routing-view.js';
import {makeComputeScope} from '../../src/site/document-scope.js';
import {validateSiteInput} from '../../src/site/policy.js';
import {siteRoutingOptions,detectRoutingCapabilities} from '../../src/site/routing.js';
import {selectResourcePlan as widePlan} from '../../src/selected-wide/policy.js';
const retired={allWorkersDisposed:true,allWorkerSourcesReleased:true};
const packet=(r,snapshot,work=1)=>({version:1,jobId:r.jobId,stage:r.stage,input:r.input,seq:1,work,snapshot,reportedPrimality:'unknown'});
const fixture=({action,scope=makeComputeScope(),now=()=>0,onChange=()=>{}}={})=>{
 const calls=[],policies=[],states=[];
 const port={start(r,ctx){calls.push(r);return action?action(r,ctx):{result:Promise.resolve({reason:'exhausted',packet:packet(r,{factors:[{value:'2',exponent:5}],remaining:'1'})}),dispose:()=>retired};}};
 const session=createSiteSession({scope,now,onChange:s=>{states.push(s);onChange(s);},loadLight:async()=>({}),loadHeavy:async()=>({}),
  createRouter:options=>{policies.push(options);return createVerifiedRoutingSession({scope,now,ports:{staged128:port,native:port,ecm:port,siqs332:port,siqsWide332:port,siqs400:port}});}});
 return{session,calls,policies,states,scope};
};
test('GUI preserves preset deadlines and wide1024MiB allocation rather than small-input clamping',async()=>{
 const f=fixture();for(const [engine,time]of [['standard',60000],['optimized',600000],['wide',3600000]]){
  await f.session.prepare(engine);await f.session.start('32',engine==='wide'?{mode:'manual',workers:1,memoryMiB:1536,timeBudgetMs:time}:{timeBudgetMs:time});
  const s=f.session.getState();assert.equal(s.phase,'result');assert.equal(s.resources.actualTimeBudgetMs,time);assert.ok(s.view.equation.includes('2^5'));
 }
 const p=siteRoutingOptions('wide',widePlan({mode:'manual',workers:5,memoryMiB:1536,timeBudgetMs:3600000}));
 assert.deepEqual(p,{jobTimeMs:3600000,wasmMiB:1536,maxWorkers:5,experimental400:true,wasmSupported:true,simdSupported:true});
});
test('GUI exact mode boundaries keep1024 acceptance separate from experimental400 and332',()=>{
 for(const [mode,bits]of [['standard',1024],['optimized',332],['wide',400]]){
  const max=((1n<<BigInt(bits))-1n).toString();assert.equal(validateSiteInput(max,mode),max);assert.throws(()=>validateSiteInput((1n<<BigInt(bits)).toString(),mode));
 }
 assert.equal(validateSiteInput('0'.repeat(4096),'wide'),'0');assert.throws(()=>validateSiteInput('0'.repeat(4097),'wide'));assert.equal(validateSiteInput('1e100','wide'),'1'+'0'.repeat(100));
});
test('GUI selects from residual, retains probable and never trusts a forged presentation object',async()=>{
 const p=((1n<<127n)-1n).toString(),f=fixture();await f.session.prepare();await f.session.start(p);
 const s=f.session.getState();assert.equal(f.calls.length,0);assert.match(s.view.statusText,/未証明/);assert.equal(s.view.groups[0].certainty,'probable');
 assert.throws(()=>makeRoutingView(Object.freeze({input:p,snapshot:{},certaintyVerified:false}),p));
});
test('GUI measured collection follows a new stage and final proof is not an overall percentage',async()=>{
 const input='8156172677439289108635319830552518815109';
 const f=fixture({action(r,ctx){ctx.onProgress({families:1,relations:10,target:100});return{result:Promise.resolve({reason:'exhausted',packet:packet(r,{factors:[],remaining:r.input})}),dispose:()=>retired};}});
 await f.session.prepare('optimized');await f.session.start(input);
 assert.ok(f.states.some(s=>s.progress?.stage==='collecting'&&s.progress.value===0.1));assert.equal(f.session.getState().progress.value,null);assert.match(f.session.getState().view.statusText,/未完了/);
});
test('cancel retains prefix without prime claims, retires, then a fresh GUI run succeeds',async()=>{
 let session;const f=fixture({action(r,ctx){
  if(r.input==='32')return{result:Promise.resolve({reason:'exhausted',packet:packet(r,{factors:[{value:'2',exponent:5}],remaining:'1'})}),dispose:()=>retired};
  ctx.onSnapshot(packet(r,{factors:[{value:'2',exponent:1}],remaining:(BigInt(r.input)/2n).toString()}));session.cancel();
  return{result:new Promise(()=>{}),dispose:()=>retired};
 }});session=f.session;await session.prepare();await session.start((2n*((1n<<521n)-1n)*((1n<<127n)-1n)).toString());
 const s=session.getState();assert.equal(s.phase,'result');assert.match(s.view.statusText,/中止/);assert.match(s.view.equation,/2/);assert.equal(s.view.groups.length,0);assert.equal(f.scope.isQuarantined(),false);
 await session.start('32');assert.ok(session.getState().view.equation.includes('2^5'));
});
test('memory protection and unknown worker failure have distinct GUI stop explanations',async()=>{
 for(const stop of ['memory-budget','worker-error']){
  const f=fixture({action(r){return{result:Promise.resolve({reason:stop,packet:packet(r,{factors:[],remaining:r.input})}),dispose:()=>retired};}});
  await f.session.prepare();await f.session.start('32');const s=f.session.getState();assert.match(s.view.statusText,/未完了/);
  assert.match(s.view.reasonText,stop==='memory-budget'?/メモリ保護/:/Worker異常/);assert.equal(s.phase,'result');
 }
});

test('zero/one cancelled and expired proof still render an exact identity and copy',async()=>{
 const {createRoutingSession}=await import('../../src/routing/session.js');
 const {verifyRoutingResult}=await import('../../src/routing/verification.js');
 for(const input of ['0','1']){
  const raw=await createRoutingSession({now:()=>0}).run(input),control=new AbortController();control.abort();
  for(const result of [verifyRoutingResult(raw,{now:()=>0,signal:control.signal}),verifyRoutingResult(raw,{now:()=>1001})]){
   const view=makeRoutingView(result,input);assert.equal(view.equation,input+' = '+input);assert.ok(view.copyText.startsWith(view.equation));assert.notEqual(view.status,'complete');
  }
 }
});

test('runtime capability probing is finite and missing SIMD/WASM is passed to routing',()=>{
 assert.deepEqual(detectRoutingCapabilities({}),{wasmSupported:false,simdSupported:false});
 assert.deepEqual(detectRoutingCapabilities({WebAssembly:{validate(){return false;}}}),{wasmSupported:true,simdSupported:false});
 assert.deepEqual(detectRoutingCapabilities({WebAssembly:{validate(){throw Error('unsupported');}}}),{wasmSupported:true,simdSupported:false});
 assert.deepEqual(detectRoutingCapabilities(),{wasmSupported:true,simdSupported:true});
});
