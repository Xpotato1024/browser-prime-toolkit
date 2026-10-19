import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {selectRsaPlan} from '../../src/rsa/profile.js';
const cases=JSON.parse(await readFile(new URL('../../bench/staged-rsa/catalog.json',import.meta.url)));
test('all 53 primary-source moduli retain decimal identity and fit the independent input profile',()=>{
 assert.equal(cases.length,53);assert.equal(new Set(cases.map(c=>c.id)).size,53);
 for(const c of cases){
  assert.deepEqual(Object.keys(c).sort(),['bits','digits','id','input','source']);
  const n=BigInt(c.input);assert.equal(n.toString(),c.input);assert.equal(c.input.length,c.digits);assert.equal(n.toString(2).length,c.bits);
  const p=selectRsaPlan(c.input);assert.equal(p.supported,true);assert.equal(p.input,c.input);assert.equal(p.bits,c.bits);
  assert.equal(p.options.timeBudgetMs,30000);assert.equal(p.options.operationBudget,50000000);assert.equal(p.workers,1);assert.equal(p.wasmBytes,0);
 }
 assert.deepEqual(cases.slice(0,3).map(c=>[c.id,c.digits,c.bits]),[['RSA-100',100,330],['RSA-110',110,364],['RSA-120',120,397]]);
});
test('the 2048-bit boundary is exact and unsupported values allocate no Worker',()=>{
 for(const n of [1n<<127n,1n<<128n,1n<<255n,1n<<256n,(1n<<2048n)-1n]){
  const p=selectRsaPlan(n.toString());assert.equal(p.supported,true);assert.equal(p.input,n.toString());
 }
 const outside=selectRsaPlan((1n<<2048n).toString());assert.equal(outside.supported,false);assert.equal(outside.reason,'profile-input-limit');assert.equal(outside.workers,0);
 for(const n of ['0','1'])assert.equal(selectRsaPlan(n).workers,0);
});
test('legacy WASM ranges are reported as unsupported rather than silently widened or substituted',()=>{
 for(const backend of ['gmp-brent','gmp-ecm','siqs']){
  const p=selectRsaPlan(cases[0].input,{backend});assert.equal(p.supported,false);assert.equal(p.reason,'backend-input-limit');assert.equal(p.workers,0);
  assert.equal(p.capability.maxBits,backend==='siqs'?128:256);assert.equal(p.wasmBytes,0);
 }
 assert.equal(selectRsaPlan('10403',{backend:'gmp-ecm'}).reason,'backend-not-enabled');
 assert.equal(selectRsaPlan((1n<<127n).toString(),{backend:'siqs'}).supported,false);
});
test('public profile rejects altered budgets, arbitrary backends and noncanonical integers',()=>{
 for(const input of ['1e3','+32','0032','-1','3.5',' 32 ','1'.repeat(1025)]){
  assert.throws(()=>selectRsaPlan(input));
 }
 for(const options of [{timeBudgetMs:60000},{operationBudget:1},{backend:'remote'},{seed:0},{seed:4294967296}]){
  assert.throws(()=>selectRsaPlan('32',options));
 }
 const p=selectRsaPlan('32',{seed:67});assert.equal(p.options.seed,67);assert.ok(Object.isFrozen(p));assert.ok(Object.isFrozen(p.options));
});
test('the previous 128-bit staged profile is unchanged',async()=>{
 const{selectStagedPlan}=await import('../../src/engine/staged-plan.js');
 assert.throws(()=>selectStagedPlan((1n<<128n).toString()),/range/);assert.equal(selectStagedPlan('32').options.timeBudgetMs,1000);
 assert.equal(selectRsaPlan((1n<<128n).toString()).supported,true);
});
