// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagedPort} from '../src/routing/staged-port.js';
import {createRoutingSession} from '../src/routing/session.js';
import {verifyRoutingResult} from '../src/routing/verification.js';
import {factorStaged} from '../src/engine/staged-factor.js';
function factory({progress=false}={}){
 const metrics={created:0,terminated:0,released:0};
 return{metrics,createWorker(plan){metrics.created++;const w={onmessage:null,releaseSource(){metrics.released++;},terminate(){metrics.terminated++;},postMessage(d){queueMicrotask(()=>{
  if(progress){w.onmessage?.({data:{protocolVersion:2,type:'progress',jobId:1,snapshot:{input:d.input,factors:[{value:'2',certainty:'proven',method:'small-prime'}],remaining:'30',operations:1,elapsedMs:0}}});return;}
  w.onmessage?.({data:{protocolVersion:2,type:'result',jobId:1,result:factorStaged(BigInt(d.input),{...d.options,mode:'p64'})}});
 });}};queueMicrotask(()=>w.onmessage?.({data:{protocolVersion:2,type:'ready',mode:'p64',engineMode:plan.engineMode,linearMemoryBytes:plan.linearMemoryBytes}}));return w;
 }};
}
test('existing staged API maps final proof and independently observed release/retirement',async()=>{
 const f=factory(),session=createRoutingSession({ports:{staged128:createStagedPort({createWorker:f.createWorker,now:()=>0})},now:()=>0}),raw=await session.run('91');
 assert.equal(verifyRoutingResult(raw,{now:()=>0}).factorizationComplete,true);assert.deepEqual(f.metrics,{created:1,terminated:1,released:1});
});
test('staged verified prefix survives cancellation and no caller-owned scope is released',async()=>{
 const f=factory({progress:true}),session=createRoutingSession({ports:{staged128:createStagedPort({createWorker:f.createWorker,now:()=>0})},now:()=>0});
 const raw=await session.run('60',{onChange:e=>{if(e.phase==='accepted-prefix'&&e.factors.length)session.cancel();}});
 assert.equal(raw.status,'cancelled');assert.equal(raw.snapshot.remaining,'30');assert.equal(raw.allStagesDisposed,true);assert.equal((await session.run('1')).status,'neither');
});
