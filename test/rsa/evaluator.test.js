import test from 'node:test';
import assert from 'node:assert/strict';
import {createRsaEvaluator} from '../../src/rsa/evaluator.js';
import {RSA_PROFILE} from '../../src/rsa/profile.js';
import {factorRsaInteger as factorInteger} from '../../src/rsa/factor.js';
import {verifyRsaWorkerResult} from '../../src/rsa/result.js';
function fixture({auto=false,finish=false,badReady=false,fatal=false,releaseThrows=false,terminateThrows=false}={}){
 let time=0,live=0,maxLive=0;const made=[],timers=[],sent=[];
 const emit=(w,data)=>w.onmessage?.({data:{protocolVersion:3,profile:RSA_PROFILE.id,...data}});
 const ready=w=>emit(w,{type:'ready',backend:'brent',maxBits:badReady?999:2048,wasmBytes:0});
 const deps={now:()=>time,schedule(fn,delay){const t={fn,delay};timers.push(t);return t;},unschedule(t){t.dead=true;},
  createWorker(){const w={dead:false,releaseSource(){if(releaseThrows)throw Error('release');},
   terminate(){if(terminateThrows)throw Error('terminate');if(!this.dead){this.dead=true;live--;}},
   postMessage(data){sent.push(data);if(fatal)queueMicrotask(()=>this.onerror?.({preventDefault(){}}));
    else if(finish)queueMicrotask(()=>emit(this,{type:'result',jobId:1,result:factorInteger(BigInt(data.input),data.options)}));}};
   made.push(w);live++;maxLive=Math.max(maxLive,live);if(auto)queueMicrotask(()=>ready(w));return w;}};
 return{deps,made,timers,sent,emit,ready,setTime:v=>time=v,counts:()=>({live,maxLive})};
}
test('fixed 30-second deadline charges loading before the core grant and retires its owner',async()=>{
 const f=fixture({finish:true}),e=createRsaEvaluator(f.deps),p=e.run('10403');f.setTime(250);f.ready(f.made[0]);const r=await p;
 assert.equal(r.kind,'factorized');assert.equal(r.input,'10403');assert.equal(f.sent[0].options.timeBudgetMs,29725);
 assert.equal(f.sent[0].options.operationBudget,200000000);assert.equal(r.allWorkersDisposed,true);assert.equal(r.workers,1);assert.equal(r.wasmBytes,0);
 assert.deepEqual(f.counts(),{live:0,maxLive:1});assert.ok(f.timers.every(t=>t.dead));e.dispose();
});
test('unsupported and neither results allocate nothing and keep the exact input',async()=>{
 const f=fixture(),e=createRsaEvaluator(f.deps),n=((1n<<2048n)-1n).toString();
 const r=await e.run(n,{backend:'siqs'});assert.equal(r.kind,'unsupported');assert.equal(r.input,n);assert.equal(r.reason,'backend-input-limit');
 const out=await e.run((1n<<2048n).toString());assert.equal(out.kind,'unsupported');assert.equal(out.workers,0);
 for(const n of ['0','1'])assert.equal((await e.run(n)).kind,'neither');
 await assert.rejects(e.run('1e3'));assert.equal(f.made.length,0);e.dispose();
});
test('cancellation in loading or running blocks replacement until retirement and ignores late messages',async()=>{
 for(const running of [false,true]){
  const f=fixture(),e=createRsaEvaluator(f.deps),p=e.run('10403');if(running)f.ready(f.made[0]);
  const late=f.made[0].onmessage;e.cancel();await assert.rejects(e.run('32'),/busy/);
  const r=await p;assert.equal(r.kind,'cancelled');assert.equal(r.allWorkersDisposed,true);late({data:{protocolVersion:3,profile:RSA_PROFILE.id,type:'result',jobId:1,result:{input:'32'}}});
  assert.deepEqual(f.counts(),{live:0,maxLive:1});assert.equal(f.made.length,1);e.dispose();
 }
});
test('initialization and total timeouts are distinct, including a late-ready timer race',async()=>{
 const f=fixture(),e=createRsaEvaluator(f.deps),p=e.run('10403');assert.ok(f.timers.some(t=>t.delay===30000));assert.ok(f.timers.some(t=>t.delay===5000));
 f.setTime(5001);f.ready(f.made[0]);const init=await p;assert.equal(init.kind,'fatal');assert.equal(init.reason,'initialization-timeout');assert.equal(f.sent.length,0);
 const p2=e.run('10403');f.ready(f.made[1]);f.setTime(35002);f.timers.filter(t=>t.delay===30000).at(-1).fn();
 const timeout=await p2;assert.equal(timeout.kind,'timeout');assert.equal(timeout.reason,'host-timeout');assert.equal(timeout.snapshot.remaining,'10403');e.dispose();
});
test('late terminal and proof work cannot report success beyond the same host deadline',async()=>{
 const f=fixture({finish:true}),e=createRsaEvaluator({...f.deps,verifyResult(value,input,tick){f.setTime(30001);return verifyRsaWorkerResult(value,input,tick);}});
 const p=e.run('10403');f.ready(f.made[0]);const r=await p;assert.equal(r.kind,'timeout');assert.equal(r.allWorkersDisposed,true);e.dispose();
});
test('bad profile, fatal and forged result retire without reboot; explicit fresh request recovers',async()=>{
 for(const config of [{badReady:true},{fatal:true}]){
  const f=fixture({auto:true,...config}),e=createRsaEvaluator(f.deps),r=await e.run('10403');
  assert.equal(r.kind,'fatal');assert.equal(f.made.length,1);assert.equal(r.allWorkersDisposed,true);e.dispose();
 }
 const f=fixture(),e=createRsaEvaluator(f.deps),p=e.run('10403');f.ready(f.made[0]);
 f.emit(f.made[0],{type:'result',jobId:1,result:factorInteger(32n)});
 assert.equal((await p).kind,'fatal');const good=e.run('32');f.ready(f.made[1]);f.emit(f.made[1],{type:'result',jobId:1,result:factorInteger(32n)});
 assert.equal((await good).kind,'factorized');assert.deepEqual(f.counts(),{live:0,maxLive:1});e.dispose();
});
test('oversized packet and source-release failure are fatal and never leak an owned Worker',async()=>{
 const f=fixture(),e=createRsaEvaluator(f.deps),p=e.run('10403');f.ready(f.made[0]);
 f.emit(f.made[0],{type:'progress',jobId:1,junk:'x'.repeat(262145)});assert.equal((await p).kind,'fatal');assert.equal(f.made[0].dead,true);e.dispose();
 const b=fixture({auto:true,releaseThrows:true}),closed=createRsaEvaluator(b.deps);assert.equal((await closed.run('32')).kind,'fatal');assert.equal(b.made[0].dead,true);closed.dispose();
});
test('failed termination closes the evaluator and disposal never accepts another job',async()=>{
 const f=fixture({terminateThrows:true}),e=createRsaEvaluator(f.deps),p=e.run('10403');e.cancel();const r=await p;
 assert.equal(r.kind,'fatal');assert.equal(r.allWorkersDisposed,false);await assert.rejects(e.run('32'),/closed/);
 const good=fixture(),closed=createRsaEvaluator(good.deps),pending=closed.run('10403');closed.dispose();assert.equal((await pending).kind,'cancelled');
 await assert.rejects(closed.run('32'),/closed/);assert.equal(good.made.length,1);
});
test('source release time is still inside the five-second initialization cap',async()=>{
 const f=fixture(),e=createRsaEvaluator(f.deps),p=e.run('10403');
 f.made[0].releaseSource=()=>f.setTime(5001);f.ready(f.made[0]);
 if(f.sent.length)e.cancel();
 const r=await p;assert.equal(r.kind,'fatal');assert.equal(r.reason,'initialization-timeout');assert.equal(f.sent.length,0);e.dispose();
});
test('terminal cleanup cannot turn a result delivered after the total deadline into a success',async()=>{
 const f=fixture(),e=createRsaEvaluator(f.deps),p=e.run('32');f.ready(f.made[0]);f.setTime(29999);
 const terminate=f.made[0].terminate.bind(f.made[0]);f.made[0].terminate=()=>{terminate();f.setTime(30001);};
 f.emit(f.made[0],{type:'result',jobId:1,result:factorInteger(32n)});
 const r=await p;assert.equal(r.kind,'timeout');assert.equal(r.allWorkersDisposed,true);assert.equal(r.requestWallMs,30001);e.dispose();
});
