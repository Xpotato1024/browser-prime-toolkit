import test from 'node:test';
import assert from 'node:assert/strict';
import {createCountedSiqsSplit} from '../src/engine/siqs-counted.js';
import {Budget,BudgetExceeded,normalizeOptions} from '../src/engine/options.js';
const n=1000000000039n*1000000000061n;
function budget(cap=50000000){return new Budget(normalizeOptions({operationBudget:cap,timeBudgetMs:60000}),()=>0,()=>{});}
for(const variant of ['clock-gated','dense','lanczos']) {
  test(variant+' preserves remaining operation limit, resource recovery and exact divisor',async()=>{
    const split=await createCountedSiqsSplit(variant);
    for(const cap of [0,1,63,64,65,129]) {
      const b=budget(cap);assert.throws(()=>split(n,b,{seed:1}),e=>e instanceof BudgetExceeded&&e.reason==='operation-budget');
      assert.equal(b.operations,cap);assert.equal(split.stats().liveBytes,0);
    }
    let b=budget();b.tick();assert.equal(n%split(n,b,{seed:1}),0n);
    const s=split.stats();assert.ok(s.logical>1000);assert.ok(s.clockReads<s.logical/2);assert.equal(s.liveBytes,0);
    if(variant!=='clock-gated')assert.ok(s.importCalls<s.logical/2);
    split.configureFault(0,Math.floor(s.allocations/2));b=budget();
    assert.throws(()=>split(n,b,{seed:1}),e=>e instanceof BudgetExceeded&&e.reason==='algorithm-resource');
    assert.equal(split.stats().liveBytes,0);split.configureFault();
    assert.equal(n%split(n,budget(),{seed:1}),0n);
  });
}
test('counted dense and Lanczos consume identical matrix-relevant factor offsets, cycle order and parity',async()=>{
  const hashes=[];
  for(const variant of ['dense','lanczos']){
    const split=await createCountedSiqsSplit(variant,{capture:true});
    assert.equal(n%split(n,budget(),{seed:1}),0n);hashes.push(await split.audit());
  }
  assert.equal(hashes[0].matrixDescriptorSha256,hashes[1].matrixDescriptorSha256);
  assert.equal(hashes[0].paritySha256,hashes[1].paritySha256);
  assert.ok(hashes[0].descriptorBytes>0);
});

test('a trapped counted instance retires permanently while a fresh instance recovers',async()=>{
  const instantiate=WebAssembly.instantiate;
  WebAssembly.instantiate=async(...args)=>{
    const instance=await instantiate(...args);
    return {exports:{...instance.exports,siqs_split:()=>{throw new WebAssembly.RuntimeError('injected entry trap');}}};
  };
  let split;
  try{split=await createCountedSiqsSplit('lanczos');}finally{WebAssembly.instantiate=instantiate;}
  assert.throws(()=>split(n,budget(),{seed:1}),WebAssembly.RuntimeError);
  assert.equal(split.stats().poisoned,true);
  assert.throws(()=>split(n,budget(),{seed:1}),/retired/);
  const fresh=await createCountedSiqsSplit('lanczos');assert.equal(n%fresh(n,budget(),{seed:1}),0n);
});
