// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRoutingPolicy,chooseStage} from '../src/routing/index.js';
const available=['native','staged128','ecm','siqs332','siqs400'];
const next=(n,options={})=>chooseStage({remaining:n.toString(),available,policy:makeRoutingPolicy({jobTimeMs:10000,wasmMiB:1536,experimental400:true,...options}),remainingMs:10000});
test('2^128 boundary uses the numeric value, not an exclusive bitLength128 test',()=>{
 assert.equal(next((1n<<128n)-1n).stage,'staged128');
 assert.equal(next(1n<<128n).stage,'native');
 assert.equal(next((1n<<128n)+1n).stage,'native');
});
test('64/65-bit values remain inside the existing staged capability',()=>{
 assert.equal(next((1n<<64n)-1n).stage,'staged128');
 assert.equal(next(1n<<64n).stage,'staged128');
});

const policy=makeRoutingPolicy({jobTimeMs:10000,wasmMiB:1536,experimental400:true});
const afterNative=n=>chooseStage({remaining:n.toString(),available,policy,remainingMs:9000,attempted:['native:'+n]});
test('332/333 and400/401 are capability boundaries after native, not measured crossover claims',()=>{
 for(const[bits,stage]of [[332,'siqs332'],[333,'siqs400'],[400,'siqs400']])assert.equal(afterNative((1n<<BigInt(bits-1))+1n).stage,stage);
 assert.equal(afterNative((1n<<400n)+1n).terminal,'gnfs-unavailable');
});
test('ECM accepts only the actual odd5..2^256 bridge range',()=>{
 assert.equal(afterNative((1n<<255n)+1n).stage,'ecm');
 assert.equal(afterNative((1n<<256n)+1n).stage,'siqs332');
 assert.equal(afterNative(1n<<200n).stage,'siqs332');
});
test('missing SIMD and experimental gate cannot silently enable a backend',()=>{
 const n=((1n<<332n)+1n).toString();
 const base={remaining:n,available,remainingMs:1000,attempted:['native:'+n]};
 assert.equal(chooseStage({...base,policy:makeRoutingPolicy({wasmMiB:1536,experimental400:false})}).terminal,'enabled-engines-exhausted');
 assert.equal(chooseStage({...base,policy:makeRoutingPolicy({wasmMiB:1536,experimental400:true,simdSupported:false})}).terminal,'simd-unavailable');
 assert.equal(chooseStage({...base,policy:makeRoutingPolicy({wasmMiB:128,experimental400:true})}).terminal,'enabled-engines-exhausted');
});
test('normal128MiB resources leave a later path after Brent, while no-WASM can use native',()=>{
 const n=((1n<<200n)+1n).toString(),p=makeRoutingPolicy();
 const a=chooseStage({remaining:n,available,policy:p,remainingMs:1000});assert.equal(a.stage,'native');assert.equal(a.timeBudgetMs,250);assert.equal(a.reservedForFollowing,750);
 assert.equal(chooseStage({remaining:n,available,policy:p,remainingMs:700,attempted:['native:'+n]}).stage,'ecm');
 assert.equal(chooseStage({remaining:n,available,policy:makeRoutingPolicy({wasmSupported:false}),remainingMs:1000}).stage,'native');
});
test('work/time bounds, expired budget and unavailable ports stay finite',()=>{
 const n=(1n<<200n).toString();
 assert.equal(chooseStage({remaining:n,available,policy,remainingMs:.5}).terminal,'job-time-budget');
 assert.equal(chooseStage({remaining:n,available:[],policy,remainingMs:1000}).terminal,'enabled-engines-exhausted');
 assert.throws(()=>makeRoutingPolicy({jobTimeMs:Infinity}));
 assert.throws(()=>makeRoutingPolicy({wasmMiB:2048}));
 assert.throws(()=>makeRoutingPolicy({work:{siqs:4097}}));
});

test('SIQS400 remains an eligible fallback below333bits and332 is not treated as its minimum',()=>{
 const n=((1n<<299n)+1n).toString(),common={remaining:n,policy,remainingMs:1000};
 assert.equal(chooseStage({...common,available:['siqs400']}).stage,'siqs400');
 assert.equal(chooseStage({...common,available:['siqs332','siqs400']}).stage,'siqs332');
 assert.equal(chooseStage({...common,available:['siqs332','siqs400'],attempted:['siqs332:'+n]}).terminal,'enabled-engines-exhausted');
});

test('SIQS allocations reuse actual role policies and shrink worker count to the common memory budget',()=>{
 const remaining=((1n<<300n)+1n).toString();
 for(const[memory,workers]of [[128,1],[384,3],[512,5],[1536,5]]){
  const r=chooseStage({remaining,available:['siqs332'],policy:makeRoutingPolicy({wasmMiB:memory,maxWorkers:5}),remainingMs:5000});
  assert.equal(r.maxWorkers,workers);assert.ok(r.wasmAllocationBytes<=memory*1048576);assert.equal(r.resourcePlan.totalWasmBytes,r.wasmAllocationBytes);
 }
 const wide=chooseStage({remaining,available:['siqs400'],policy:makeRoutingPolicy({wasmMiB:1536,maxWorkers:5,experimental400:true}),remainingMs:5000});
 assert.deepEqual(wide.resourcePlan.ownerCapsMiB,[1024,64,64,64,64]);assert.equal(wide.wasmAllocationBytes,1280*1048576);
});
