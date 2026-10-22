import test from 'node:test';
import assert from 'node:assert/strict';
import {installRsaWorker} from '../../src/rsa/install.js';
import {RSA_PROFILE} from '../../src/rsa/profile.js';
function fixture(fn){
 const saved=globalThis.self,out=[],events={};globalThis.self={postMessage:data=>out.push(structuredClone(data)),addEventListener:(name,cb)=>events[name]=cb};
 try{installRsaWorker();return fn({out,events,send:data=>self.onmessage({data})});}finally{globalThis.self=saved;}
}
const packet=input=>({protocolVersion:3,profile:RSA_PROFILE.id,type:'run',jobId:1,input,
 options:{algorithm:'brent',seed:1,timeBudgetMs:1000,operationBudget:200000000}});
test('Worker announces the exact bounded native profile and factors a full 2048-bit input',()=>fixture(({out,send})=>{
 assert.deepEqual(out.shift(),{protocolVersion:3,profile:RSA_PROFILE.id,type:'ready',backend:'brent',maxBits:2048,wasmBytes:0});
 const n=(1n<<2047n).toString();send(packet(n));const r=out.find(v=>v.type==='result');
 assert.equal(r.input,undefined);assert.equal(r.result.input,n);assert.equal(r.result.factors.length,2047);assert.equal(r.result.status,'complete');
}));
test('Worker rejects out-of-profile inputs and changed algorithm, budget or packet contract',()=>{
 const bad=[{input:(1n<<2048n).toString()},{input:'1e3'},{input:'0'.repeat(10000)},{profile:'legacy'}, {protocolVersion:2},{extra:'hint'}];
 for(const change of bad)fixture(({out,send})=>{out.length=0;send({...packet('10403'),...change});assert.equal(out.at(-1).type,'error');assert.ok(!out.some(x=>x.type==='result'));});
 for(const change of [{algorithm:'siqs'},{timeBudgetMs:30001},{operationBudget:50000001},{seed:0},{extra:'hint'}])
  fixture(({out,send})=>{out.length=0;send({...packet('10403'),options:{...packet('10403').options,...change}});assert.equal(out.at(-1).type,'error');});
});
test('Worker is one-shot and emits an explicit CSP audit signal',()=>fixture(({out,events,send})=>{
 send(packet('32'));send(packet('32'));assert.equal(out.filter(v=>v.type==='result').length,1);assert.equal(out.at(-1).type,'error');
 events.securitypolicyviolation();assert.equal(out.at(-1).type,'audit-csp');assert.equal(out.at(-1).profile,RSA_PROFILE.id);
}));
